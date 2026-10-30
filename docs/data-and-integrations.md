# Data & integrations

## Content source
**All editable content is in `src/lib/site.ts`** (`SITE` const): name, role, location, email, `dob`, socials, `experience` (dated), `projects`, `competitive` (programming), `education`, `lead`/`bio`. The `lead` uses `{word}` to mark which word gets the animated highlight.

## Live data — "live or hidden, never fake"
- `src/lib/github.ts` (server-only): `getGithub()` → heatmap levels, total contributions, **followers**, streak (GraphQL); `getRepoStars(repo)` → live stars. **A `User-Agent` header is required** or GitHub returns 403.
- Widgets **return `null` (hide) on any failure / missing key** — no fake fallbacks. Digitomize stars render floored as `★ 600+`.
- `src/lib/cp.ts` (server-only, no key needed): live competitive-programming ratings for `SITE.cpHandle`, used by `sections.tsx`. Entries in `SITE.competitive` with a `live` key are fetched; their `rating` string is the per-platform fallback shown on any failure, timeout or bad shape (never a partial number).
  - **Codeforces**: `GET codeforces.com/api/user.info?handles=…` → `rank · rating · max maxRating`.
  - **LeetCode**: `POST leetcode.com/graphql` (`userContestRanking` + `userContestRankingHistory`; needs `Referer` + a browser `User-Agent`, and LeetCode sometimes blocks servers). Max = best rating over attended contests → `top x% · rating · max m`.
  - Current == max collapses to one number. Rounding never flatters: ratings floor, `top x%` ceils to one decimal (11.64 → 11.7).
  - `next: { revalidate: 3600 }` + `AbortSignal.timeout(5000)` so a slow API can't stall build/ISR. Live values get a quiet `title` hint only.
  - **CodeChef and Meta Hacker Cup stay static** — no stable public API.
- Page revalidates hourly: `export const revalidate = 3600` in `app/page.tsx`.
- WakaTime was removed (user stopped using it). Spotify was never built. Don't re-add either without asking.

## Token safety (important)
- `GITHUB_TOKEN` is a Vercel **server** env var — **no `NEXT_PUBLIC_` prefix**, so it never reaches the client bundle.
- `src/lib/github.ts` must be imported **only by server components** (currently `github-panel.tsx`, `sections.tsx`). Never import it from a `"use client"` file, or the token could be bundled to the browser.

## Misc
- Favicon = `/me.jpeg` (his photo) via `metadata.icons` in `layout.tsx`.
