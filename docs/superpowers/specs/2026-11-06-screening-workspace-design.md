# Screening workspace: design

Date: 2026-11-06
Status: awaiting approval

## Intent

Pathway should work the way a researcher does a literature review: start from
a paper they trust, screen the papers around it quickly (save or skip), never
re-screen what they have seen, and be pointed at the papers their saved list
keeps coming back to. Today each paper is a separate stop with a chart, two
lists and a drawer, and nothing remembers what was already looked at. The user
said the workflow "feels off" and the content overwhelms.

## Goals

- One screen for the core loop: pick a paper from a list, read it, save, skip
  or follow it, move to the next one.
- Fast screening: after Save or Skip, the next unscreened paper opens.
  Keyboard: up/down to move, S save, X skip, F follow.
- Memory: papers you opened are marked seen, skipped ones fade. Kept across
  visits on this device.
- Suggested papers: ranked by how many of your saved papers cite them or are
  cited by them, screened with the same two panes.
- The browser Back button works and every paper and page has its own link.
- Visual refresh from UI/UX Pro Max: scholarly navy + amber, readable sans,
  16px body, larger touch targets.

## Non-goals

- No projects or multiple collections.
- No syncing of seen/skipped state to Google (saved papers already sync).
- No new data sources beyond OpenAlex.

## Anti-goals (failure even if it works)

- More on screen than before. Each view shows one list and one paper.
- Explanatory paragraphs, captions or helper text that a label could replace.
- Decorative visuals.

## Approaches considered

- **A. Screening workspace (chosen by the user).** Two panes, list and
  reading pane, with keyboard screening, seen/skip memory and a Suggested
  view. Keeps the fast "start from one paper" entry.
- B. Project-first: home is a project of several seeds with combined
  suggestions. Stronger for long reviews, slower for quick lookups, larger
  rebuild.
- C. Polish only: links, Back, tap sizes, loading states. Does not fix the
  flow.

## Design

### Screens

1. **Home** (unchanged idea): slogan, search, "Pick up where you left off".
   Adds one line when Suggested has items: "N suggested papers" linking there.
2. **Paper workspace** `#/paper/<id>`
   - Top line: your path (last few papers followed), compact.
   - Left pane, the list: tabs `All`, `Cites`, `Cited by` with counts; sort
     (Most cited, Newest, Oldest); "Hide skipped" toggle. Rows show title,
     year, citations and a small `cites` / `cited by` word in All. Unseen
     titles are bold, seen are regular, skipped are faded, saved show a
     check.
   - Right pane, the reading pane: the selected paper's title, authors, one
     facts line, full abstract, and actions `Save` `Skip` `Follow` `Open`.
     Shortcut letters shown as small keycaps on the buttons (desktop only).
     When nothing is selected it shows the paper you followed, with `Save`
     and `Open`.
3. **Suggested** `#/suggested`: same two panes. List = papers cited by or
   citing two or more of your saved papers, ranked by that count, excluding
   saved and skipped. Row note: "linked to N of yours". Empty state when
   fewer than two saved papers, with one button to Explore.
4. **Reading list** `#/list`: as now (status tabs, folder/tag filters,
   export), touch sizes fixed.
5. **Map** `#/map`, **Compare** `#/compare`, **New citing papers**
   `#/updates`: as now.

### Removed

- The year timeline chart on the paper page (confusing, adds load).
- The preview drawer (replaced by the reading pane).
- The "Find gaps" page: its main content moves into Suggested. Its Coverage
  section (years and topics) is dropped.
- The year filter. Sort plus "Hide skipped" cover the common need; kept:
  "Open access only" inside the list header.

### Sidebar

Explore, Suggested (count), Reading list (count), Map, Compare, New citing
papers. Folders below when any exist. Footer unchanged.

### Mobile

The list fills the screen. Tapping a row opens the reading pane full screen
with Save / Skip / Follow in a bottom bar within thumb reach and a Back
arrow. Rows and buttons at least 44px tall.

### State

- `pathway:screening:v1` in localStorage: `{ [paperId]: "seen" | "skipped" }`.
  Saved status still comes from the reading list.
- Hash routes, with history entries for each view and paper so Back works.
  Opening `#/paper/<id>` directly loads that paper.

### Loading and feedback

- Loading a paper shows placeholder rows in the list, not a blank page.
- Search results support up/down and Enter.

### Visual system (from UI/UX Pro Max "academic research" result)

- Light: background `#F8FAFC`, surface `#FFFFFF`, text `#0F172A`, muted
  text `#475569`, borders `#CBD5E1`, primary navy `#1E3A5F`, accent amber
  `#B45309` (white text on it passes 4.5:1).
- Dark: slate equivalents with lighter navy and amber `#F59E0B`.
- Accent use stays rare: search button, Save, the focus ring.
- Font: Atkinson Hyperlegible (bundled, weights 400 and 700), body 16px.
  The skill's serif pairing is not used, because the user rejected serif
  headings earlier.
- Logo: same P/R monogram, P in navy, R leg in amber. Tab icon to match.
- Square corners, motion as now (short, reduced-motion respected).

## Calls made by the builder (for the user to check)

- Keys S / X / F rather than K for "keep", because K usually means "up" in
  list navigation.
- Seen/skipped stays on this device only.
- Coverage and the year filter are removed to reduce clutter.

## Left to the builder

Exact spacing, pane widths and copy for empty states, following the
anti-goals above.
