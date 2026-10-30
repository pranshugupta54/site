# Data & integrations

## Content source
**All editable content is in `src/lib/site.ts`** (`SITE` const): name, role, location, email, `dob`, socials, `experience` (dated), `projects`, `competitive` (programming), `education`, `lead`/`bio`. The `lead` uses `{word}` to mark which word gets the animated highlight.

## Live data — "live or hidden, never fake"
- `src/lib/github.ts` (server-only): `getGithub()` → heatmap levels, total contributions, **followers**, streak (GraphQL); `getRepoStars(repo)` → live stars; `getOwnRepoCount()` → his public repos, **forks excluded** (forks aren't his work, so never list or count them). **A `User-Agent` header is required** or GitHub returns 403.
- Widgets **return `null` (hide) on any failure / missing key** — no fake fallbacks. Digitomize stars render as the exact live count (e.g. `★ 599`), hidden if the fetch fails.
- Page revalidates hourly: `export const revalidate = 3600` in `app/page.tsx`.
- **Last shipped line** (`last-shipped.tsx`, after `<Connect />`, copy `last shipped 3h ago · owner/repo`): `getLastShipped()` → most recent `PushEvent` **or merged PR** from **`/users/:u/events/public` only** (never `/users/:u/events` — with a token it can include private activity). Works without a token. Rules:
  - a merged PR is a `PullRequestEvent` with `action === "merged"` (what the trimmed public feed emits; plain `"closed"` there means closed *unmerged*) or `action === "closed" && pull_request.merged === true` (full payload shape).
  - only `event.public === true`, sorted by `created_at` (the feed isn't strictly ordered); scans up to 3 pages (the feed's 300-event cap).
  - **skips any repo with "traycer" in owner or name** (site copy rule) and the profile README repo `pranshugupta54/pranshugupta54` (its pushes are a daily metrics bot, not real work).
  - each candidate repo is re-checked via `/repos/:repo` and shown only if `private === false`, `visibility === "public"`, **`fork === false`** (pushing to a fork isn't his work to showcase) and the name still matches; a 404/private/forked/renamed repo falls through to the next event (max 5 distinct repo checks).
  - any HTTP error, timeout (4s) or odd shape → `null` → the line renders nothing.
  - the time is server-rendered as ISO and formatted ("3h ago") on the client by `RelativeTime` in `local-time.tsx`, so hourly ISR HTML never shows a stale relative time.
  - payloads are trimmed (no commit messages / PR titles), so the line only says *where* and *when*, not *what*. If every recent public event is excluded, the line is simply hidden.
- WakaTime was removed (user stopped using it). Spotify was never built. Don't re-add either without asking.

## Token safety (important)
- `GITHUB_TOKEN` is a Vercel **server** env var — **no `NEXT_PUBLIC_` prefix**, so it never reaches the client bundle.
- `src/lib/github.ts` must be imported **only by server components** (currently `github-panel.tsx`, `sections.tsx`, `last-shipped.tsx`). Never import it from a `"use client"` file, or the token could be bundled to the browser.

## Misc
- Favicon = `/me.jpeg` (his photo) via `metadata.icons` in `layout.tsx`.
