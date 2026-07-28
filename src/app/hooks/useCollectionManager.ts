import { useEffect, useRef, useState } from "react";
import {
  CLOUD_COLLECTION_LIMIT,
  LOCAL_COLLECTION_LIMIT,
  createSavedPaper,
  loadAccountCache,
  loadAccountSettings,
  loadGuestCollection,
  loadGuestSettings,
  mergeCollections,
  sanitizeFolder,
  sanitizeTags,
  storeAccountCache,
  storeAccountSettings,
  storeGuestCollection,
  storeGuestSettings,
} from "../../../lib/collection";
import type {
  CitationGraphData,
  CollectionSettings,
  Paper,
  ReviewStatus,
  SavedPaper,
} from "../../../lib/research-types";
import type { SyncState } from "../app-types";
import type { PathwayAccount } from "../../services/firebase-client";
import { firebaseConfigured } from "../../services/firebase-config";
import {
  loadCitationGraph,
  loadCollectionUpdates,
} from "../../services/openalex-client";

export function useCollectionManager(graph: CitationGraphData | null) {
  const [guestCollection, setGuestCollection] = useState<SavedPaper[]>(() =>
    loadGuestCollection(),
  );
  const [collection, setCollection] = useState<SavedPaper[]>(() =>
    loadGuestCollection(),
  );
  const [settings, setSettings] = useState<CollectionSettings>(() =>
    loadGuestSettings(),
  );
  const [account, setAccount] = useState<PathwayAccount | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [mergeCandidate, setMergeCandidate] = useState<SavedPaper[] | null>(
    null,
  );
  const [updates, setUpdates] = useState<Paper[]>([]);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [savingPaperId, setSavingPaperId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const authRequestId = useRef(0);
  const cloudSaveTimers = useRef(new Map<string, number>());
  const collectionRef = useRef(collection);
  const guestCollectionRef = useRef(guestCollection);
  const accountRef = useRef<PathwayAccount | null>(account);

  collectionRef.current = collection;
  guestCollectionRef.current = guestCollection;
  accountRef.current = account;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    let stop: () => void = () => undefined;

    if (firebaseConfigured) {
      void import("../../services/firebase-client").then((firebase) => {
        if (!active) return;
        stop = firebase.observeAccount((nextAccount) => {
          if (!active) return;
          const requestId = ++authRequestId.current;
          for (const timer of cloudSaveTimers.current.values()) {
            window.clearTimeout(timer);
          }
          cloudSaveTimers.current.clear();
          accountRef.current = nextAccount;
          setAccount(nextAccount);
          setAuthReady(true);
          setUpdates([]);

          if (!nextAccount) {
            const local = guestCollectionRef.current;
            collectionRef.current = local;
            setCollection(local);
            setSettings(loadGuestSettings());
            setMergeCandidate(null);
            setSyncState("idle");
            return;
          }

          const cached = loadAccountCache(nextAccount.uid);
          collectionRef.current = cached;
          setCollection(cached);
          setSettings(loadAccountSettings(nextAccount.uid));
          setSyncState("loading");

          void Promise.all([
            firebase.loadCloudCollection(nextAccount.uid),
            firebase.loadCloudSettings(nextAccount.uid),
          ])
            .then(([cloudCollection, cloudSettings]) => {
              if (!active || requestId !== authRequestId.current) return;
              collectionRef.current = cloudCollection;
              setCollection(cloudCollection);
              storeAccountCache(nextAccount.uid, cloudCollection);
              setSettings(cloudSettings);
              storeAccountSettings(nextAccount.uid, cloudSettings);
              const localOnly = guestCollectionRef.current.filter(
                (entry) =>
                  !cloudCollection.some(
                    (cloudEntry) => cloudEntry.paper.id === entry.paper.id,
                  ),
              );
              setMergeCandidate(
                localOnly.length > 0 ? guestCollectionRef.current : null,
              );
              setSyncState("ready");
            })
            .catch(() => {
              if (!active || requestId !== authRequestId.current) return;
              setSyncState("error");
              setNotice(
                "Google sync is temporarily unavailable. Your cached collection is still here.",
              );
            });
        });
      });
    }

    return () => {
      active = false;
      stop();
      for (const timer of cloudSaveTimers.current.values()) {
        window.clearTimeout(timer);
      }
      cloudSaveTimers.current.clear();
    };
  }, []);

  const collectionLimit = account
    ? CLOUD_COLLECTION_LIMIT
    : LOCAL_COLLECTION_LIMIT;

  const applyCollection = (
    nextCollection: SavedPaper[],
    activeAccount = accountRef.current,
  ) => {
    collectionRef.current = nextCollection;
    setCollection(nextCollection);
    if (activeAccount) {
      storeAccountCache(activeAccount.uid, nextCollection);
    } else {
      guestCollectionRef.current = nextCollection;
      setGuestCollection(nextCollection);
      storeGuestCollection(nextCollection);
    }
  };

  const scheduleCloudSave = (
    activeAccount: PathwayAccount,
    entry: SavedPaper,
    delay = 0,
  ) => {
    const existing = cloudSaveTimers.current.get(entry.paper.id);
    if (existing !== undefined) window.clearTimeout(existing);

    const save = async () => {
      cloudSaveTimers.current.delete(entry.paper.id);
      setSyncState("syncing");
      try {
        const { saveCloudPaper } = await import(
          "../../services/firebase-client"
        );
        await saveCloudPaper(activeAccount.uid, entry);
        if (accountRef.current?.uid === activeAccount.uid) {
          setSyncState("ready");
        }
      } catch {
        if (accountRef.current?.uid === activeAccount.uid) {
          setSyncState("error");
          setNotice(
            "This change is cached locally and will need to be synced again.",
          );
        }
      }
    };

    if (delay > 0) {
      const timer = window.setTimeout(() => void save(), delay);
      cloudSaveTimers.current.set(entry.paper.id, timer);
    } else {
      void save();
    }
  };

  const updateSavedEntry = (
    paperId: string,
    update: (entry: SavedPaper) => SavedPaper,
    cloudDelay = 0,
  ) => {
    let changed: SavedPaper | null = null;
    const next = collectionRef.current.map((entry) => {
      if (entry.paper.id !== paperId) return entry;
      changed = update(entry);
      return changed;
    });
    if (!changed) return;
    const activeAccount = accountRef.current;
    applyCollection(next, activeAccount);
    if (activeAccount) scheduleCloudSave(activeAccount, changed, cloudDelay);
  };

  const savePaper = async (paper: Paper) => {
    const activeAccount = accountRef.current;
    const limit = activeAccount
      ? CLOUD_COLLECTION_LIMIT
      : LOCAL_COLLECTION_LIMIT;
    if (collectionRef.current.some((entry) => entry.paper.id === paper.id)) {
      return;
    }
    if (collectionRef.current.length >= limit) {
      setNotice(
        activeAccount
          ? `Your synced collection is limited to ${limit} papers.`
          : `Local saving is limited to ${limit} papers. Sign in with Google for ${CLOUD_COLLECTION_LIMIT}.`,
      );
      return;
    }

    setSavingPaperId(paper.id);
    try {
      const paperGraph =
        graph?.centerId === paper.id ? graph : await loadCitationGraph(paper.id);
      const entry = createSavedPaper(paper, paperGraph);
      const next = [entry, ...collectionRef.current].slice(0, limit);
      applyCollection(next, activeAccount);
      if (activeAccount) scheduleCloudSave(activeAccount, entry);
      setNotice(
        activeAccount
          ? "Paper saved to your synced collection."
          : "Paper saved on this device.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "The paper could not be saved.",
      );
    } finally {
      setSavingPaperId(null);
    }
  };

  const removePaper = (paperId: string) => {
    const activeAccount = accountRef.current;
    const next = collectionRef.current.filter(
      (entry) => entry.paper.id !== paperId,
    );
    const timer = cloudSaveTimers.current.get(paperId);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      cloudSaveTimers.current.delete(paperId);
    }
    applyCollection(next, activeAccount);
    if (activeAccount) {
      setSyncState("syncing");
      void import("../../services/firebase-client")
        .then(({ deleteCloudPaper }) =>
          deleteCloudPaper(activeAccount.uid, paperId),
        )
        .then(() => setSyncState("ready"))
        .catch(() => {
          setSyncState("error");
          setNotice("The paper was removed here, but Google sync failed.");
        });
    }
  };

  const changeStatus = (paperId: string, status: ReviewStatus) => {
    updateSavedEntry(paperId, (entry) => ({ ...entry, status }));
  };

  const changeNote = (paperId: string, note: string) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, note: note.slice(0, 2000) }),
      650,
    );
  };

  const changeFolder = (paperId: string, folder: string | null) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, folder: sanitizeFolder(folder) }),
      300,
    );
  };

  const changeTags = (paperId: string, tags: string[]) => {
    updateSavedEntry(
      paperId,
      (entry) => ({ ...entry, tags: sanitizeTags(tags) }),
      300,
    );
  };

  const signIn = async () => {
    if (!firebaseConfigured) {
      setNotice(
        "Google sync needs the Firebase project values listed in the setup guide.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const { signInWithGoogle } = await import(
        "../../services/firebase-client"
      );
      await signInWithGoogle();
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Google sign-in was cancelled.",
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    const { signOutAccount } = await import("../../services/firebase-client");
    await signOutAccount();
  };

  const mergeLocalCollection = async () => {
    const activeAccount = accountRef.current;
    if (!activeAccount || !mergeCandidate) return;
    const merged = mergeCollections(
      collectionRef.current,
      mergeCandidate,
      CLOUD_COLLECTION_LIMIT,
    );
    applyCollection(merged, activeAccount);
    setSyncState("syncing");
    try {
      const { mergeIntoCloud } = await import(
        "../../services/firebase-client"
      );
      await mergeIntoCloud(activeAccount.uid, merged);
      setMergeCandidate(null);
      setSyncState("ready");
      setNotice("Local papers were added to your Google-synced collection.");
    } catch {
      setSyncState("error");
      setNotice("The merge is cached locally, but Google sync failed.");
    }
  };

  const checkUpdates = async () => {
    if (collectionRef.current.length === 0) return;
    setCheckingUpdates(true);
    try {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() - 30);
      const since = (settings.lastCheckedAt
        ? new Date(settings.lastCheckedAt)
        : fallback
      )
        .toISOString()
        .slice(0, 10);
      const nextUpdates = await loadCollectionUpdates(
        collectionRef.current.map((entry) => entry.paper.id),
        since,
      );
      const savedIds = new Set(
        collectionRef.current.map((entry) => entry.paper.id),
      );
      setUpdates(
        nextUpdates.results.filter((paper) => !savedIds.has(paper.id)),
      );
      const nextSettings = { lastCheckedAt: new Date().toISOString() };
      setSettings(nextSettings);
      const activeAccount = accountRef.current;
      if (activeAccount) {
        storeAccountSettings(activeAccount.uid, nextSettings);
        const { saveCloudSettings } = await import(
          "../../services/firebase-client"
        );
        await saveCloudSettings(activeAccount.uid, nextSettings);
      } else {
        storeGuestSettings(nextSettings);
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "New citing papers could not be checked.",
      );
    } finally {
      setCheckingUpdates(false);
    }
  };

  return {
    collection,
    collectionLimit,
    settings,
    account,
    authReady,
    authBusy,
    syncState,
    mergeCandidate,
    updates,
    checkingUpdates,
    savingPaperId,
    notice,
    savePaper,
    removePaper,
    changeStatus,
    changeNote,
    changeFolder,
    changeTags,
    signIn,
    signOut,
    mergeLocalCollection,
    dismissMerge: () => setMergeCandidate(null),
    checkUpdates,
  };
}
