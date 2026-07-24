import assert from "node:assert/strict";
import test from "node:test";
import openAlexFunction from "../api/openalex.ts";

test("Vercel function uses the web request-response handler contract", async () => {
  const response = await openAlexFunction(
    new Request("https://pathwayresearch.vercel.app/api/openalex?mode=unknown"),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown request mode." });
});
