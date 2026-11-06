/** What the reader has done with a paper while screening, on this device. */
export type ScreenState = "seen" | "skipped";
export type ScreenMap = Record<string, ScreenState>;

const SCREENING_KEY = "pathway:screening:v1";

export function loadScreening(): ScreenMap {
  try {
    const raw = JSON.parse(localStorage.getItem(SCREENING_KEY) ?? "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const map: ScreenMap = {};
    for (const [id, state] of Object.entries(raw)) {
      if (state === "seen" || state === "skipped") map[id] = state;
    }
    return map;
  } catch {
    return {};
  }
}

export function storeScreening(map: ScreenMap): void {
  try {
    localStorage.setItem(SCREENING_KEY, JSON.stringify(map));
  } catch {}
}

/** Opening a paper marks it seen, but never un-skips it. */
export function markSeen(map: ScreenMap, id: string): ScreenMap {
  if (map[id]) return map;
  return { ...map, [id]: "seen" };
}

export function markSkipped(map: ScreenMap, id: string): ScreenMap {
  if (map[id] === "skipped") return map;
  return { ...map, [id]: "skipped" };
}

/** The next paper after `currentId` the reader has not opened, skipped or saved. */
export function nextUnscreened(
  order: string[],
  currentId: string,
  map: ScreenMap,
  savedIds: Set<string>,
): string | null {
  const start = order.indexOf(currentId) + 1;
  for (let index = start; index < order.length; index += 1) {
    const id = order[index];
    if (!map[id] && !savedIds.has(id)) return id;
  }
  return null;
}
