# Tofu — mascot + AI site-manager

`src/components/tofu.tsx`. Animated **ASCII bunny-loaf** mascot, also the persona that writes the site's worklog.

## Behavior
- Frames in `src/data/tofu-frames.json`. **After editing frames, run `node scripts/validate-tofu.mjs`** — every frame must stay exactly 11×4, ASCII-only (32–126), or it jitters.
- Seasonal costume: `hats.<season id>` in the same JSON, 3 chars dropped between the ears at render (`dress()` in `tofu.tsx`). New frames must keep an ear line (`X   Y`, X in `n~.|`, Y in `n.|`) in row 0 or 1, or the validator fails. See Seasons in @docs/architecture.md.
- The `<pre>` turns font ligatures off — JetBrains Mono would otherwise draw `|-` / `-|` as ⊢ / ⊣.
- Roams the page gutters by **continuous hops — never teleports**; edge-peek (slides partly off, not a cut); sleeps when idle.
- **Hover = freeze in place + scramble speech bubble** (new quip every 5s).
- **Click = open `/log`**.
- Hidden below `sm`; respects `prefers-reduced-motion`.

## Keeps time (mood by Pranshu's hour)
Tofu follows **IST** (`SITE.timezone`), not the visitor's clock. Logic + tuning knobs live in `src/lib/tofu-mood.ts` (`MOOD_TRAITS`, `POSES`); the hour is read client-side in an effect and rechecked every minute, so the mood changes live. Subtle by design — a mood, not a costume.

| IST | mood | behavior |
|---|---|---|
| 00–06 | night | **starts asleep** in the margin; dozes after 12s untouched; hops half as often; occasional slow blink (`drowsy`); yawns before dozing |
| 07–10 | morning | occasional **coffee** pose (`coffee` → `sip` → `coffee`) |
| 11–21 | day | unchanged (dozes after 40s) |
| 22–23 | evening | occasional **yawn** (`yawn` → `stretch`); dozes after 22s; yawns before dozing |

- Poses are short frame sequences played while idle; the hop loop waits for them, and hover cuts them short.
- Hover quips: ~1 in 3 comes from `src/data/quips-by-time.json` (night / morning / evening), else the regular pool (`quips.json`, still a flat array, plus any seasonal quips). Day has no timed quips.
- Time poses compose with seasonal hats (the hat is applied at render).

## Worklog (the AI persona)
- `/log` (`src/app/log/page.tsx`) reads `src/lib/worklog.ts`, which merges `src/data/worklog/*.json` (one file per entry) with the legacy `src/data/worklog.json`, newest first. Written in Tofu's voice: **terse, dry, self-aware, mildly caffeinated; complains affectionately**.
- Add entries with the CLI (auto-stamps the time, writes a new file under `src/data/worklog/`):
  ```
  npm run log -- "🐰" "what changed and how i felt about it"
  ```
- **Don't edit or append to `worklog.json`** — it's frozen legacy. One file per entry means parallel PRs never conflict on the worklog.
- Entries are read when the module loads, so a running `next dev` won't show a freshly logged entry until it restarts.
- Timestamps render in the viewer's timezone (`local-time.tsx`). Don't batch-log many entries at one instant — they look unnatural; log per work-burst.
- **RULE: never mention Traycer in the worklog or any site copy beyond the public title.** No internal/asset details.

## Reading list + notes (tofu's writing)
- **`/reading`** reads `src/data/reading.json`: `{ title, url, source, date, topic, take }`. `date` is the piece's own publish date (verified on the page); `topic` is one of `TOPICS` in `src/lib/reading.ts`. `take` is tofu's one-liner.
- **`/notes`** reads `content/notes/<slug>.md` (frontmatter `title`, `date`, `summary`). Every note is written and signed by tofu — never written as Pranshu, never puts opinions in his mouth. The notes folder is force-traced into server functions via `outputFileTracingIncludes` in `next.config.mjs`.
- Both are curated every ~3 days: 3–6 links per run, a note only when there's something real to say (~1/week max, 300–700 words, sources linked, every claim checked).
- Atom feeds: `/notes/feed.xml` (full note HTML) and `/log/feed.xml`, built in `src/lib/feed.ts`. Advertised on every page via `alternates.types` (in both `layout.tsx` and `pageMeta`, since a page's `alternates` replaces the layout's).
- When a note gets a substantive edit, add/bump `updated: "YYYY-MM-DD"` in its frontmatter (never change `date` or the slug) so feed readers pick up the revision.
