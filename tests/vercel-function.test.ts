import assert from "node:assert/strict";
import test from "node:test";
import openAlexFunction, {
  cleanAbstractText,
  cleanMetadataText,
} from "../api/openalex.js";

test("Vercel function cleans common math markup in abstracts", () => {
  assert.equal(
    cleanAbstractText(String.raw`Growth follows $\ensuremath{\gamma}&gt;1$.`),
    "Growth follows γ>1.",
  );
});

test("Vercel function cleans encoded HTML from paper metadata", () => {
  assert.equal(
    cleanMetadataText(
      "&lt;title&gt;Method for registration of 3-D shapes&lt;/title&gt;",
    ),
    "Method for registration of 3-D shapes",
  );
});

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
