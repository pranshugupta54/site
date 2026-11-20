# /wrapped — the year in slides

`p54.dev/wrapped`: a story of full-screen slides (tap / ← → / space, hold to pause, Esc home), tofu narrating at the bottom. Until Dec 1 (IST) it says "2026 so far"; from then on "2026, wrapped" (`yearLabel()`).

## Pieces
- `src/data/wrapped.ts` — the only hand-picked bits: `year`, tofu's `favoriteRead` (a url from `reading.json` + why), `seasonsSince`. **Next year: bump `year`, pick a read, drop `seasonsSince`.**
- `src/lib/wrapped.ts` — pure (unit tested in `wrapped.test.ts`): calendar stats (total, busiest day/month, longest streak, heatmap levels), `topLanguage` (only with a clear winner), `seasonsWorn`, `buildSlides`, `SLIDE_IDS`, `slidePath`.
- `src/lib/wrapped-data.ts` — server-only gatherer (`getWrapped`), React-`cache`d per request.
- `src/app/wrapped/page.tsx` (intro) + `[slide]/page.tsx` (static per id, ISR hourly). Deep links key on slide **ids**, not numbers, so hiding a slide never shifts the others.
- `src/app/wrapped/og/route.tsx` → `src/lib/og/wrapped-card.tsx`: one share card per slide, `?slide=<id>`, CDN-cached 1h.
- `src/components/wrapped/story.tsx` + `wrapped.css` — the client story; the url follows the slide (`replaceState`) so share copies a deep link. Phones get the Web Share sheet.
- Entry points: home `wrapped` block, shell command `wrapped` (all three shells), `SiteChrome` renders nothing on /wrapped.

## Data rules
Public only. The contribution calendar is per-day **aggregate** counts (same GraphQL calendar as the home graph). Repos via `getOwnRepos()` (no forks, no employer). Merged PRs on `pranshugupta54/site` via the search API; hertz releases via the releases API. Anything missing → that slide is dropped. No CP ratings, no per-repo private breakdowns.
