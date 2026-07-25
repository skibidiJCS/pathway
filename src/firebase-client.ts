import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  CLOUD_COLLECTION_LIMIT,
  NOTE_LIMIT,
  sanitizeCollection,
} from "../lib/collection";
import type {
  CollectionSettings,
  Paper,
  SavedPaper,
} from "../lib/research-types";
import { firebaseConfig, firebaseConfigured } from "./firebase-config";

const app = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export interface PathwayAccount {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

function toAccount(user: User): PathwayAccount {
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Google user",
    email: user.email ?? "",
    photoUrl: user.photoURL,
  };
}

export function observeAccount(
  callback: (account: PathwayAccount | null) => void,
): () => void {
  if (!auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, (user) => {
    callback(user ? toAccount(user) : null);
  });
}

export async function signInWithGoogle(): Promise<void> {
  if (!auth) throw new Error("Google sync has not been configured yet.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  await signInWithPopup(auth, provider);
}

export async function signOutAccount(): Promise<void> {
  if (auth) await signOut(auth);
}

function stripAbstract(paper: Paper): Paper {
  return { ...paper, abstract: null };
}

function cloudEntry(entry: SavedPaper): SavedPaper {
  return {
    ...entry,
    paper: stripAbstract(entry.paper),
    note: entry.note.slice(0, NOTE_LIMIT),
    references: entry.references.map(stripAbstract).slice(0, 14),
    citingPapers: entry.citingPapers.map(stripAbstract).slice(0, 14),
  };
}

function papersCollection(uid: string) {
  if (!db) throw new Error("Google sync has not been configured yet.");
  return collection(db, "users", uid, "papers");
}

export async function loadCloudCollection(uid: string): Promise<SavedPaper[]> {
  const snapshot = await getDocs(
    query(papersCollection(uid), limit(CLOUD_COLLECTION_LIMIT)),
  );
  return sanitizeCollection(
    snapshot.docs.map((paperDoc) => paperDoc.data()),
    CLOUD_COLLECTION_LIMIT,
  );
}

export async function saveCloudPaper(
  uid: string,
  entry: SavedPaper,
): Promise<void> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  await setDoc(doc(db, "users", uid, "papers", entry.paper.id), cloudEntry(entry));
}

export async function deleteCloudPaper(
  uid: string,
  paperId: string,
): Promise<void> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  await deleteDoc(doc(db, "users", uid, "papers", paperId));
}

export async function mergeIntoCloud(
  uid: string,
  collectionToMerge: SavedPaper[],
): Promise<void> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  const batch = writeBatch(db);
  for (const entry of collectionToMerge.slice(0, CLOUD_COLLECTION_LIMIT)) {
    batch.set(
      doc(db, "users", uid, "papers", entry.paper.id),
      cloudEntry(entry),
    );
  }
  await batch.commit();
}

export async function clearCloudCollection(uid: string): Promise<void> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  const snapshot = await getDocs(
    query(papersCollection(uid), limit(CLOUD_COLLECTION_LIMIT)),
  );
  const batch = writeBatch(db);
  for (const paperDoc of snapshot.docs) batch.delete(paperDoc.ref);
  await batch.commit();
}

export async function loadCloudSettings(
  uid: string,
): Promise<CollectionSettings> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  const snapshot = await getDoc(doc(db, "users", uid, "settings", "pathway"));
  const lastCheckedAt = snapshot.data()?.lastCheckedAt;
  return {
    lastCheckedAt: typeof lastCheckedAt === "string" ? lastCheckedAt : null,
  };
}

export async function saveCloudSettings(
  uid: string,
  settings: CollectionSettings,
): Promise<void> {
  if (!db) throw new Error("Google sync has not been configured yet.");
  await setDoc(doc(db, "users", uid, "settings", "pathway"), settings);
}
