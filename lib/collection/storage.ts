import type { CollectionSettings, SavedPaper } from "../research-types";
import { CLOUD_COLLECTION_LIMIT, LOCAL_COLLECTION_LIMIT } from "./limits.ts";
import { sanitizeCollection } from "./sanitize.ts";

const GUEST_KEY = "pathway:collection:guest:v1";
const SETTINGS_KEY = "pathway:collection:settings:v1";

function accountKey(uid: string): string {
  return `pathway:collection:account:${uid}:v1`;
}

function accountSettingsKey(uid: string): string {
  return `pathway:collection:account:${uid}:settings:v1`;
}

function loadStoredCollection(key: string, limit: number): SavedPaper[] {
  try {
    return sanitizeCollection(
      JSON.parse(localStorage.getItem(key) ?? "[]"),
      limit,
    );
  } catch {
    return [];
  }
}

function storeCollection(key: string, collection: SavedPaper[], limit: number) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(sanitizeCollection(collection, limit)),
    );
  } catch {}
}

export function loadGuestCollection(): SavedPaper[] {
  return loadStoredCollection(GUEST_KEY, LOCAL_COLLECTION_LIMIT);
}

export function storeGuestCollection(collection: SavedPaper[]): void {
  storeCollection(GUEST_KEY, collection, LOCAL_COLLECTION_LIMIT);
}

export function loadAccountCache(uid: string): SavedPaper[] {
  return loadStoredCollection(accountKey(uid), CLOUD_COLLECTION_LIMIT);
}

export function storeAccountCache(
  uid: string,
  collection: SavedPaper[],
): void {
  storeCollection(accountKey(uid), collection, CLOUD_COLLECTION_LIMIT);
}

function loadSettings(key: string): CollectionSettings {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      lastCheckedAt?: unknown;
    };
    return {
      lastCheckedAt:
        typeof value.lastCheckedAt === "string" ? value.lastCheckedAt : null,
    };
  } catch {
    return { lastCheckedAt: null };
  }
}

function storeSettings(key: string, settings: CollectionSettings) {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch {}
}

export function loadGuestSettings(): CollectionSettings {
  return loadSettings(SETTINGS_KEY);
}

export function storeGuestSettings(settings: CollectionSettings): void {
  storeSettings(SETTINGS_KEY, settings);
}

export function loadAccountSettings(uid: string): CollectionSettings {
  return loadSettings(accountSettingsKey(uid));
}

export function storeAccountSettings(
  uid: string,
  settings: CollectionSettings,
): void {
  storeSettings(accountSettingsKey(uid), settings);
}
