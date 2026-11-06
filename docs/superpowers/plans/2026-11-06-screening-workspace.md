# Screening Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the paper page with a two-pane screening workspace (list + reading pane) with seen/skip memory, keyboard screening, a Suggested view, hash routing with working Back, and the UI/UX Pro Max visual system.

**Architecture:** Pure logic lives in `lib/` with node tests (`screening.ts`, `suggestions.ts`, `routes.ts`). React hooks in `src/app/hooks/` wrap them (`useScreening`, `useHashRoute`). One shared UI, `src/features/workspace/`, renders both the paper workspace and Suggested. Old `PaperView`, `PaperPreview`, `CitationTimeline` and the Find gaps page are deleted.

**Tech Stack:** React 19, TypeScript, Vite, node:test, lucide-react, `@fontsource/atkinson-hyperlegible`.

**Spec:** `docs/superpowers/specs/2026-11-06-screening-workspace-design.md`

## Global Constraints

- One list and one paper per view; no captions or helper paragraphs where a label works; no decorative visuals.
- Keys: ArrowUp/ArrowDown move, `s` save, `x` skip, `f` follow. Never fire while focus is in an input, textarea or select.
- Storage key `pathway:screening:v1`, value `{ [paperId]: "seen" | "skipped" }`, this device only.
- Routes: `#/`, `#/paper/<id>`, `#/suggested`, `#/list`, `#/map`, `#/compare`, `#/updates`.
- Suggested = papers linked to 2 or more saved papers, excluding saved and skipped, ranked by links then citations.
- Colors light: bg `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`, muted `#475569`, border `#CBD5E1`, primary `#1E3A5F`, accent `#B45309`. Dark: slate equivalents, accent `#F59E0B`.
- Font Atkinson Hyperlegible 400/700, body 16px. Rows and buttons min 44px tall on phones, 40px desktop.
- Square corners. Motion short, `prefers-reduced-motion` respected.

## Review Focus

- A paper with no references or citations: list shows an empty line, reading pane still shows the paper with Save/Open.
- Opening `#/paper/<bad-id>`: error state, Back returns to the previous view.
- Typing `s`, `x` or `f` in search or a note must not save, skip or follow.
- Save/Skip on the last unscreened row: selection stays, no crash.
- Corrupt or unavailable localStorage: screening starts empty.

---

### Task 1: Screening state logic

**Files:**
- Create: `lib/screening.ts`
- Test: `tests/screening.test.ts`

**Interfaces:**
- Produces: `type ScreenState = "seen" | "skipped"`; `type ScreenMap = Record<string, ScreenState>`; `loadScreening(): ScreenMap`; `storeScreening(map: ScreenMap): void`; `markSeen(map, id): ScreenMap` (keeps `"skipped"`); `markSkipped(map, id): ScreenMap`; `nextUnscreened(order: string[], currentId: string, map: ScreenMap, savedIds: Set<string>): string | null` (first id after `currentId` with no state and not saved; `null` if none).

- [ ] **Step 1: Write failing tests** `markSeen keeps skipped`, `nextUnscreened skips seen, skipped and saved`, `nextUnscreened returns null at the end`, `loadScreening returns {} for corrupt JSON` (stub `globalThis.localStorage` with `getItem` returning `"{oops"`).
- [ ] **Step 2: Run** `node --test tests/screening.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the functions above; storage wrapped in try/catch.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: screening state logic`.

### Task 2: Suggestions ranking

**Files:**
- Create: `lib/suggestions.ts`
- Test: `tests/suggestions.test.ts`

**Interfaces:**
- Consumes: `SavedPaper` (`paper`, `references`, `citingPapers`).
- Produces: `interface Suggestion { paper: Paper; links: number }`; `suggestPapers(collection: SavedPaper[], skipped: Set<string>, limit = 30): Suggestion[]`.

- [ ] **Step 1: Write failing tests** `counts each saved paper once per candidate` (candidate in both references and citingPapers of one saved paper counts 1), `excludes saved and skipped`, `requires at least 2 links`, `orders by links then citationCount`.
- [ ] **Step 2: Run** `node --test tests/suggestions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with a `Map<id, {paper, savedIds:Set}>`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: suggestions ranking`.

### Task 3: Hash routes

**Files:**
- Create: `lib/routes.ts`
- Test: `tests/routes.test.ts`

**Interfaces:**
- Produces: `type Route = { view: "home" } | { view: "paper"; id: string } | { view: "suggested" | "list" | "map" | "compare" | "updates" }`; `parseHash(hash: string): Route`; `routeToHash(route: Route): string`.

- [ ] **Step 1: Write failing tests** `round-trips every route`, `decodes encoded paper ids` (`#/paper/W1%2F2` → id `W1/2`), `unknown or empty hash is home`, `#/paper/ with no id is home`.
- [ ] **Step 2: Run** `node --test tests/routes.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: hash routes`.

### Task 4: Visual system

**Files:**
- Modify: `src/styles/globals.css` (tokens, base font 16px, control heights), `src/main.tsx` (font imports), `src/app/Wordmark.tsx`, `public/icon.svg`, `index.html` (icon `?v=7`, theme-color), `package.json`.

- [ ] **Step 1:** `npm install @fontsource/atkinson-hyperlegible`; import `400.css` and `700.css` in `src/main.tsx`.
- [ ] **Step 2:** Replace color tokens with the Global Constraints values; `--ink` = primary navy, `--spark` = accent amber; dark theme slate equivalents (`#0B1220` bg, `#111A2E` surface, `#E2E8F0` text, `#94A3B8` muted, primary `#9DB7DA`, accent `#F59E0B`). Body 16px; buttons and nav rows `min-height: 40px`, 44px under 768px; font weight 600 rules become 700.
- [ ] **Step 3:** Monogram: P stroke `#1E3A5F` (`var(--ink)` in app), leg `#B45309` (`var(--spark)`).
- [ ] **Step 4: Run** `npx tsc --noEmit && npm run build`. Expected: build succeeds.
- [ ] **Step 5: Commit** `style: UI/UX Pro Max visual system`.

### Task 5: Routing and screening hooks wired into the app

**Files:**
- Create: `src/app/hooks/useHashRoute.ts`, `src/app/hooks/useScreening.ts`
- Modify: `src/app/PathwayApp.tsx`, `src/app/app-types.ts`

**Interfaces:**
- Consumes: Task 1, Task 3.
- Produces: `useHashRoute(): { route: Route; navigate(route: Route): void }` (navigate sets `location.hash`, so the browser records history); `useScreening(): { map: ScreenMap; seen(id): void; skip(id): void; unskip(id): void }`.

- [ ] **Step 1:** `PathwayApp` derives the view from `route`; following a paper calls `navigate({view:"paper", id})`; a `route.view === "paper"` whose id differs from `graph?.centerId` triggers `selectPaper` with a stub `{ id, title: "" ... }`.
- [ ] **Step 2:** Sidebar items navigate to routes; logo navigates home.
- [ ] **Step 3: Verify** in the browser: open a paper, follow another, press Back twice; returns to first paper then home. Open `#/paper/W0000` directly: error state shows.
- [ ] **Step 4: Commit** `feat: hash routing with working Back`.

### Task 6: Screening workspace UI

**Files:**
- Create: `src/features/workspace/ScreeningList.tsx`, `src/features/workspace/ReadingPane.tsx`, `src/features/workspace/Workspace.tsx`, `src/features/workspace/useScreeningKeys.ts`
- Delete: `src/features/explore/PaperView.tsx`, `PaperPreview.tsx`, `CitationTimeline.tsx`
- Modify: `src/app/PathwayApp.tsx`, `src/styles/globals.css`

**Interfaces:**
- `Workspace` props: `items: Array<{ paper: Paper; note: string }>`, `tabs?: Array<{ key: string; label: string; filter(p: Paper): boolean }>`, `selected: Paper | null`, `fallback: Paper | null` (shown when nothing selected), `screen: ScreenMap`, `savedIds: Set<string>`, `onSelect`, `onSave`, `onSkip`, `onFollow`, `loading: boolean`, `empty: ReactNode`.
- `useScreeningKeys({ onUp, onDown, onSave, onSkip, onFollow })` ignores events from input, textarea, select and contenteditable, and when modifier keys are held.

- [ ] **Step 1:** List rows: bold title when unscreened, regular when seen, 50% opacity when skipped, check icon when saved; meta: year, citations, note. Tabs All / Cites / Cited by with counts; sort select (Most cited, Newest, Oldest); "Hide skipped" checkbox; "Open access only" checkbox.
- [ ] **Step 2:** Reading pane: title, authors, facts line, abstract, buttons Save (S), Skip (X), Follow (F), Open. Selecting a row calls `seen(id)`. Save or Skip selects `nextUnscreened` in the visible order.
- [ ] **Step 3:** Loading shows 6 placeholder rows. Above the panes, one line with the path (last 5 papers followed, current one bold), reusing the existing trail markup.
- [ ] **Step 4: Verify** in the browser: screen five papers with keys only; typing `s` in search does not save; last row Save keeps selection; paper with no citations shows the empty line.
- [ ] **Step 5: Commit** `feat: screening workspace`.

### Task 7: Suggested view and navigation cleanup

**Files:**
- Modify: `src/app/PathwayApp.tsx`, `src/app/Sidebar.tsx`, `src/features/explore/HomeView.tsx`, `src/features/library/ToolPages.tsx` (remove `GapsPage`)

- [ ] **Step 1:** `#/suggested` renders `Workspace` with `suggestPapers(collection, skippedSet)`, note `linked to N of yours`, no tabs; empty state when fewer than 2 saved: "Save two papers to get suggestions" with an Explore button.
- [ ] **Step 2:** Sidebar: Explore, Suggested (count), Reading list (count), Map, Compare, New citing papers; folders below.
- [ ] **Step 3:** Home: when suggestions exist, one link "N suggested papers" under the search.
- [ ] **Step 4: Verify** in the browser with 2+ saved papers: Suggested lists papers; skipping one removes it.
- [ ] **Step 5: Commit** `feat: suggested view`.

### Task 8: Mobile and search keyboard

**Files:**
- Modify: `src/features/workspace/Workspace.tsx`, `src/features/explore/SearchPanel.tsx`, `src/styles/globals.css`

- [ ] **Step 1:** Under 768px the reading pane is a full-screen layer over the list with a Back arrow and a bottom bar (Save, Skip, Follow) 56px tall.
- [ ] **Step 2:** Search results: ArrowDown/ArrowUp move an active row (`aria-activedescendant`), Enter opens it.
- [ ] **Step 3: Verify** at 375px: tap row opens pane, bottom bar works, Back returns to list; desktop search arrow keys work.
- [ ] **Step 4: Commit** `feat: mobile reading pane and keyboard search`.

### Task 9: Final verification

- [ ] **Step 1: Run** `npm test && npm run build`. Expected: all tests pass, build succeeds.
- [ ] **Step 2:** Browser pass, light and dark, desktop and 375px, against the Review Focus list.
- [ ] **Step 3:** Push to `main`.
