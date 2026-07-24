# Pathway

Pathway is a compact citation explorer built with React, Vite, TypeScript,
Cytoscape.js, and OpenAlex. It has no AI, database, authentication, or paid
services.

## Local setup

Requirements: Node.js 22.13 or newer and a free OpenAlex API key.

1. Copy `.env.example` to `.env`.
2. Add your key as `OPENALEX_API_KEY`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local URL shown in the terminal.

The Vite development server and Vercel Function both keep the key server-side.
Browser code only calls `/api/openalex`; the key is never bundled into the
client.

## Tests and build

- `npm test` — data conversion, abstract reconstruction, deduplication, graph
  limits, and citation direction.
- `npm run build` — type-check and create the production Vite build.
- `npm run lint` — TypeScript checks.

## Deploy to Vercel

### Dashboard method

1. Push this folder to a GitHub, GitLab, or Bitbucket repository.
2. Sign in at [vercel.com](https://vercel.com) and select **Add New → Project**.
3. Import the repository.
4. Set **Project Name** to `pathwayresearch`.
5. Confirm **Framework Preset** is **Vite**. The repository already provides:
   - Build command: `npm run build`
   - Output directory: `dist`
6. Open **Environment Variables** and add:
   - Name: `OPENALEX_API_KEY`
   - Value: your free OpenAlex API key
   - Environments: Production and Preview
7. Select **Deploy**.
8. After deployment, open **Settings → Domains** and confirm
   `pathwayresearch.vercel.app` is assigned.
9. Under **Settings → Deployment Protection**, do not enable Vercel
   Authentication for all deployments. The production domain will then be
   publicly accessible without a login.

Vercel assigns `.vercel.app` names on a first-come, first-served basis. This
project uses `pathwayresearch.vercel.app`.

### CLI alternative

From this folder:

```sh
npx vercel
npx vercel env add OPENALEX_API_KEY production
npx vercel env add OPENALEX_API_KEY preview
npx vercel --prod
```

Choose `pathway` as the project name when prompted. Never paste the API key into
source code or commit a `.env` file.

## Request limits

- Search returns at most 12 papers.
- A graph uses one selected paper, up to 14 references, and up to 14 citing
  papers.
- Every graph is hard-capped at 29 nodes in normal use and 30 in the graph
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
