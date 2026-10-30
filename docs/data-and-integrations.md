# Data & integrations

## Content source
**All editable content is in `src/lib/site.ts`** (`SITE` const): name, role, location, email, `dob`, socials, `experience` (dated), `projects`, `competitive` (programming), `education`, `lead`/`bio`. The `lead` uses `{word}` to mark which word gets the animated highlight.

## Live data — "live or hidden, never fake"
- `src/lib/github.ts` (server-only): `getGithub()` → heatmap levels, total contributions, **followers**, streak (GraphQL); `getRepoStars(repo)` → live stars; `getOwnRepoCount()` → his public repos, **forks excluded** (forks aren't his work, so never list or count them). **A `User-Agent` header is required** or GitHub returns 403.
- `getSitePulls()` → tofu's PRs on `pranshugupta54/site` for the **"tofu at work"** block on `/log` (`tofu-at-work.tsx`). Two REST lists, grouped by the pure `groupPulls()` in `src/lib/pulls.ts`: draft → *drafting*, open → *in review*, merged in the last 7 days → *merged* (newest first); 5 per group, titles + links only. `open` is the uncapped open count. Only the owner's own PRs count (a stranger's PR title never renders), and any title containing "traycer" is skipped. Token optional (public repo).
  - **Open list is complete**: follows `Link rel="next"` up to 3 pages (300 PRs), and fails (hides) past that rather than undercount. **Closed list is a sample**: the 30 most recently updated closed PRs — plenty for a week of merges, but not a full history.
  - A PR that changes state between the two requests can arrive in both lists; `groupPulls` keeps one record per number (the merged one, else the newest).
  - **Caching + deadline:** the grouped result (a few hundred bytes) is cached with `unstable_cache` (1h), not the raw REST payloads. Inside it, requests use `cache: "no-store"` and share one `AbortSignal.timeout(4000)` — which really aborts there. Don't move these onto the fetch cache: Next (still in 16) drops a fetch's signal when it refreshes a stale fetch-cache entry, and ISR regeneration waits on that refresh. Failures throw inside the cached fn and are caught outside, so they're never stored: a cold miss hides the block, a failed refresh keeps the last good result.
- Widgets **return `null` (hide) on any failure / missing key** — no fake fallbacks. Digitomize stars render as the exact live count (e.g. `★ 599`), hidden if the fetch fails. The PR block also hides when there's nothing to show.
- Next 16 doesn't cache `fetch` by default — the other REST calls pass `next: { revalidate: 3600 }`, and pages with live data export `revalidate = 3600` (`app/page.tsx`, `app/log/page.tsx`). Both still prerender at build (`○ … 1h` in the build output).
- Unauthenticated GitHub calls share a 60/hour per-IP limit; locally, build with `GITHUB_TOKEN=$(gh auth token)` or the live blocks hide (403).
- WakaTime was removed (user stopped using it). Spotify was never built. Don't re-add either without asking.

## Token safety (important)
- `GITHUB_TOKEN` is a Vercel **server** env var — **no `NEXT_PUBLIC_` prefix**, so it never reaches the client bundle.
- `src/lib/github.ts` must be imported **only by server components** (currently `github-panel.tsx`, `sections.tsx`, `app/resume/page.tsx`, `tofu-at-work.tsx`). Never import it from a `"use client"` file, or the token could be bundled to the browser.

## Misc
- Favicon = `/me.jpeg` (his photo) via `metadata.icons` in `layout.tsx`.
