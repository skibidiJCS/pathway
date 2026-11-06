import assert from "node:assert/strict";
import test from "node:test";
import {
  loadScreening,
  markSeen,
  markSkipped,
  nextUnscreened,
  storeScreening,
} from "../lib/screening.ts";

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
  return data;
}

test("markSeen keeps skipped", () => {
  const skipped = markSkipped({}, "a");
  assert.deepEqual(markSeen(skipped, "a"), { a: "skipped" });
  assert.deepEqual(markSeen({}, "b"), { b: "seen" });
});

test("markSkipped overrides seen", () => {
  assert.deepEqual(markSkipped({ a: "seen" }, "a"), { a: "skipped" });
});

test("nextUnscreened skips seen, skipped and saved", () => {
  const order = ["a", "b", "c", "d", "e"];
  const map = { b: "seen", c: "skipped" } as const;
  assert.equal(nextUnscreened(order, "a", map, new Set(["d"])), "e");
});

test("nextUnscreened returns null at the end", () => {
  assert.equal(nextUnscreened(["a", "b"], "b", {}, new Set()), null);
  assert.equal(nextUnscreened(["a", "b"], "a", { b: "seen" }, new Set()), null);
});

test("nextUnscreened starts from the top when current is not in the list", () => {
  assert.equal(nextUnscreened(["a", "b"], "zz", { a: "seen" }, new Set()), "b");
});

test("loadScreening returns {} for corrupt JSON", () => {
  stubStorage({ "pathway:screening:v1": "{oops" });
  assert.deepEqual(loadScreening(), {});
});

test("loadScreening drops unknown values", () => {
  stubStorage({
    "pathway:screening:v1": JSON.stringify({ a: "seen", b: "nope", c: "skipped" }),
  });
  assert.deepEqual(loadScreening(), { a: "seen", c: "skipped" });
});

test("storeScreening round-trips", () => {
  const data = stubStorage();
  storeScreening({ a: "seen" });
  assert.equal(data["pathway:screening:v1"], JSON.stringify({ a: "seen" }));
  assert.deepEqual(loadScreening(), { a: "seen" });
});
