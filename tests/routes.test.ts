import assert from "node:assert/strict";
import test from "node:test";
import { parseHash, routeToHash, type Route } from "../lib/routes.ts";

test("round-trips every route", () => {
  const routes: Route[] = [
    { view: "home" },
    { view: "paper", id: "W2741809807" },
    { view: "suggested" },
    { view: "list" },
    { view: "map" },
    { view: "compare" },
    { view: "updates" },
  ];
  for (const route of routes) {
    assert.deepEqual(parseHash(routeToHash(route)), route);
  }
});

test("decodes encoded paper ids", () => {
  assert.deepEqual(parseHash("#/paper/W1%2F2"), { view: "paper", id: "W1/2" });
  assert.equal(routeToHash({ view: "paper", id: "W1/2" }), "#/paper/W1%2F2");
});

test("unknown or empty hash is home", () => {
  assert.deepEqual(parseHash(""), { view: "home" });
  assert.deepEqual(parseHash("#"), { view: "home" });
  assert.deepEqual(parseHash("#/nowhere"), { view: "home" });
});

test("#/paper/ with no id is home", () => {
  assert.deepEqual(parseHash("#/paper/"), { view: "home" });
  assert.deepEqual(parseHash("#/paper"), { view: "home" });
});

test("malformed encoding is home, not a crash", () => {
  assert.deepEqual(parseHash("#/paper/%E0%A4%A"), { view: "home" });
});
