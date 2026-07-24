import assert from "node:assert/strict";
import test from "node:test";
import openAlexFunction from "../api/openalex.js";

test("Vercel function returns JSON through the Node request-response contract", async () => {
  let status = 0;
  let body: unknown;
  const headers = new Map<string, string>();

  await openAlexFunction(
    {
      method: "GET",
      url: "/api/openalex?mode=unknown",
      headers: { host: "pathwayresearch.vercel.app" },
    },
    {
      status(code) {
        status = code;
        return this;
      },
      setHeader(name, value) {
        headers.set(name, value);
      },
      json(value: unknown) {
        body = value;
      },
    },
  );

  assert.equal(status, 400);
  assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
  assert.deepEqual(body, { error: "Unknown request mode." });
});
