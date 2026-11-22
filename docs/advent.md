# /advent — tofu's advent calendar

`p54.dev/advent`: 24 doors, dec 1–24. Door n opens at **00:00 IST on dec n**. Each door holds a small thing tofu made: toys, a 20-second game, generative doodles, shell secrets, project facts, reading picks, portals to /os /room /wrapped /versions. Door 24 is a tree hung with the doors this visitor opened, plus tofu's note. Every door has a deep link (`/advent/<n>`) and its own share card.

## Pieces
- `src/data/advent.ts` — the 24 doors (copy, links, toy ids, and a toy's own words in `copy`). **Server only, no imports.** Next year: bump `ADVENT_YEAR`, rewrite the doors.
- `src/lib/advent.ts` — pure IST date rules + `doorView()`, the spoiler guard. Unit tested in `advent.test.ts`; `advent-guard.test.ts` fails if a `"use client"` file value-imports the data, `advent-server` or `toys/index`.
- `src/lib/advent-server.ts` — request "now" (`?now=`), calendar tiles, `doorAt()`.
- `src/app/advent/page.tsx`, `[door]/page.tsx`, `meta.ts` — force-dynamic (per-request date; nothing locked is ever prerendered).
- `src/app/advent/og/route.tsx` → `src/lib/og/advent-card.tsx`: `?door=<n>` is decided by the date, never the url (`s=` only busts scraper caches). Locked cards are cached until the door opens, not past it.
- `src/components/advent/` — calendar, door page, hooks (clock, opened doors in localStorage), `toys/` (each its own lazy chunk via `toys/loader.tsx`; `toys/index.tsx` is the server-side picker).
- Entry points: shell `advent` / `advent <n>` (all three shells), home `advent` block nov 30 – dec 24 (`home-entry.tsx`).

## Spoiler rules
- A locked door leaves the server only as `{ n, state, hint, opensAt }`: page, RSC payload, metadata and card alike.
- Toy words live in the data (`copy`), never in toy code. Toy code loads only when an open door renders it.
- `?now=` looks ahead only in `next dev`, Vercel previews, or `ADVENT_PREVIEW=1 next start` (for screenshots). Anywhere else, production included, it can only look back.
- The routes are left out of version snapshots (`scripts/snapshot-version.mjs` BLOCKERS): static export can't do per-request dates.
