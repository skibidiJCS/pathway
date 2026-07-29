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
  assert.equal(
    cleanMetadataText(
      "FranÃ§oisâ€™s caf&eacute; &mdash; temperature 20&deg;C",
    ),
    "François’s café — temperature 20°C",
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

test("Vercel search resolves an exact full author name to that author's works", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input
          : input.url,
    );
    requestedUrls.push(url.toString());
    if (url.pathname === "/autocomplete/authors") {
      return Response.json({
        results: [
          {
            id: "https://openalex.org/A5100384468",
            display_name: "Albert Einstein",
            works_count: 350,
          },
        ],
      });
    }
    return Response.json({
      results: [
        {
          id: "https://openalex.org/W123",
          display_name: "On a notable physical question",
          publication_year: 1905,
          cited_by_count: 12,
          authorships: [
            { author: { display_name: "Albert Einstein" } },
          ],
        },
      ],
    });
  }) as typeof fetch;

  try {
    let status = 0;
    let body: {
      matchedAuthor?: string;
      results?: Array<{ id: string; authors: string[] }>;
    } = {};
    await openAlexFunction(
      {
        method: "GET",
        url: "/api/openalex?mode=search&q=Albert%20Einstein",
        headers: { host: "pathwayresearch.vercel.app" },
      },
      {
        status(code) {
          status = code;
          return this;
        },
        setHeader() {},
        json(value: typeof body) {
          body = value;
        },
      },
    );

    assert.equal(status, 200);
    assert.equal(body.matchedAuthor, "Albert Einstein");
    assert.equal(body.results?.[0]?.id, "W123");
    assert.deepEqual(body.results?.[0]?.authors, ["Albert Einstein"]);
    assert.match(requestedUrls[1], /filter=author\.id%3AA5100384468/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Vercel graph requests return both citation directions", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input
          : input.url,
    );
    if (url.pathname === "/works/W100") {
      return Response.json({
        id: "https://openalex.org/W100",
        display_name: "Selected paper",
      });
    }
    const filter = url.searchParams.get("filter");
    return Response.json({
      results:
        filter === "cited_by:W100"
          ? [
              {
                id: "https://openalex.org/W200",
                display_name: "Referenced paper",
              },
            ]
          : [
              {
                id: "https://openalex.org/W300",
                display_name: "Citing paper",
              },
            ],
    });
  }) as typeof fetch;

  try {
    let status = 0;
    let body: {
      centerId?: string;
      edges?: Array<{ source: string; target: string }>;
    } = {};
    await openAlexFunction(
      {
        method: "GET",
        url: "/api/openalex?mode=graph&id=W100",
        headers: { host: "pathwayresearch.vercel.app" },
      },
      {
        status(code) {
          status = code;
          return this;
        },
        setHeader() {},
        json(value: typeof body) {
          body = value;
        },
      },
    );

    assert.equal(status, 200);
    assert.equal(body.centerId, "W100");
    assert.deepEqual(body.edges, [
      { id: "W100->W200", source: "W100", target: "W200" },
      { id: "W300->W100", source: "W300", target: "W100" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
