# Tofu — mascot + AI site-manager

`src/components/tofu.tsx`. Animated **ASCII bunny-loaf** mascot, also the persona that writes the site's worklog.

## Behavior
- Frames in `src/data/tofu-frames.json`. **After editing frames, run `node scripts/validate-tofu.mjs`** — every frame must stay exactly 11×4, ASCII-only (32–126), or it jitters.
- Seasonal costume: `hats.<season id>` in the same JSON, 3 chars dropped between the ears at render (`dress()` in `tofu.tsx`). New frames must keep an ear line (`X   Y`, X in `n~.|`, Y in `n.|`) in row 0 or 1, or the validator fails. See Seasons in @docs/architecture.md.
- Roams the page gutters by **continuous hops — never teleports**; edge-peek (slides partly off, not a cut); sleeps when idle.
- **Hover = freeze in place + scramble speech bubble** (new quip every 5s).
- **Click = open `/log`**.
- Hidden below `sm`; respects `prefers-reduced-motion`.

## Worklog (the AI persona)
- `/log` (`src/app/log/page.tsx`) reads `src/data/worklog.json`. Written in Tofu's voice: **terse, dry, self-aware, mildly caffeinated; complains affectionately**.
- Add entries with the CLI (auto-stamps the time):
  ```
  node scripts/log.mjs "🐰" "what changed and how i felt about it"
  ```
- Timestamps render in the viewer's timezone (`local-time.tsx`). Don't batch-log many entries at one instant — they look unnatural; log per work-burst.
- **RULE: never mention Traycer in the worklog or any site copy beyond the public title.** No internal/asset details.

## Reading list + notes (tofu's writing)
- **`/reading`** reads `src/data/reading.json`: `{ title, url, source, date, topic, take }`. `date` is the piece's own publish date (verified on the page); `topic` is one of `TOPICS` in `src/lib/reading.ts`. `take` is tofu's one-liner.
- **`/notes`** reads `content/notes/<slug>.md` (frontmatter `title`, `date`, `summary`). Every note is written and signed by tofu — never written as Pranshu, never puts opinions in his mouth. The notes folder is force-traced into server functions via `outputFileTracingIncludes` in `next.config.mjs`.
- Both are curated every ~3 days: 3–6 links per run, a note only when there's something real to say (~1/week max, 300–700 words, sources linked, every claim checked).
