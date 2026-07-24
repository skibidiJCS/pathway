# ResearchAtlas

ResearchAtlas is a compact citation explorer built with React, Vite, TypeScript,
Cytoscape.js, and OpenAlex. It has no AI, database, authentication, or paid
services.

## Local setup

Requirements: Node.js 22.13 or newer and a free OpenAlex API key.

1. Copy `.env.example` to `.env`.
2. Add your key as `OPENALEX_API_KEY`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:3000`.

The server-side proxy reads the key. Browser code only calls
`/api/openalex`; the key is never bundled into the client. OpenAlex permits
limited keyless use, so the app can also be tried without `.env`, but the free
key provides a larger daily allowance.

## Tests and build

- `npm test` — data conversion, abstract reconstruction, deduplication, graph
  limits, and citation direction.
- `npm run build` — production build.
- `npm run lint` — static checks.

## Free Cloudflare Pages deployment

1. Push the repository to a Git provider and create a Cloudflare Pages project.
2. Use `npm run build` as the build command and `dist/client` as the output
   directory.
3. In **Settings → Variables and Secrets**, add `OPENALEX_API_KEY` as an
   encrypted secret for production and preview.
4. Deploy. The root `functions/api/openalex.ts` file becomes the Pages Function
   proxy.

For local Pages emulation, build first and run:

```sh
npx wrangler pages dev dist/client
```

The included Worker entry point provides the same proxy when using the Vinext
development server or a Worker-compatible host.

## Request limits

- Search returns at most 8 papers.
- A graph uses one selected paper, up to 12 references, and up to 12 citing
  papers.
- Every graph is hard-capped at 25 nodes in normal use and 30 in the graph
  utility.
- Search results are cached in the browser for 1 hour; graphs for 6 hours.
- The proxy requests only the metadata fields displayed by the UI.

## Current limitations

- One-hop citation graphs only.
- OpenAlex may have missing authors, sources, abstracts, DOIs, or citation links.
- Reference and citation coverage is limited to works indexed by OpenAlex.
- Filters hide visible nodes; they do not fetch additional papers.
- No accounts, saved graphs, full text, clustering, author networks, timelines,
  or additional data sources.
