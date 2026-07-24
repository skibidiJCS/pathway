import assert from "node:assert/strict";
import test from "node:test";
import openAlexFunction from "../api/openalex.ts";

test("Vercel function supports the web request-response contract", async () => {
  const response = await openAlexFunction(
    new Request("https://pathwayresearch.vercel.app/api/openalex?mode=unknown"),
  );

  assert.ok(response instanceof Response);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown request mode." });
});

test("Vercel function supports the legacy request-response contract", async () => {
  let status = 0;
  let body = "";
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
      send(value) {
        body = value;
      },
    },
  );

  assert.equal(status, 400);
  assert.equal(headers.get("content-type"), "application/json");
  assert.deepEqual(JSON.parse(body), { error: "Unknown request mode." });
});
