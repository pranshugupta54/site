# Versions

The site keeps its past lives. Each version gets an entry on `/versions`, told in tofu's voice, and a past version can stay walkable as a frozen copy at `/v/<n>`.

## What counts as a version
A **big revamp or theme overhaul**: new layout, new look, new bones. Features don't count (skills pages, a new shell command, a season). If the old site and the new one would look like different houses, it's a version.

**Seasons vs versions:** seasons (`src/data/seasons.ts`) are temporary overlays that come and go by the calendar: two tokens and a hat. Versions are permanent revamps. A season never bumps the version.

## `src/data/versions.json`
Single source of truth. It's JSON because `next.config.mjs` reads it too (with `fs` + `JSON.parse`). App code goes through the typed wrapper `src/lib/versions.ts`.

| field | meaning |
| --- | --- |
| `current` | version number of the live site. Shows in the home-page marker, the shell boot line, and `version` in the shell. `/v/<current>` redirects to `/`. |
| `renovation` | `null` (what ships), or `{ "version": "2", "href": "<preview url>" }` while a revamp is in progress. Flips the home marker to "tofu is renovating · peek at v2 →" (opens `href` in a new tab) and adds a note on `/versions`. Nothing in the code knows any particular domain; `href` is the only place it lives. |
| `versions[]` | newest first. Each: `version`, `date` (launch day, `YYYY-MM-DD`, shown as-is with no timezone math), `name`, `tofu` (one line in tofu's voice), `highlights` (3–6 short lowercase lines), `archive`. |
| `archive` | `null` (current, or not kept) or `"static"` (snapshot committed under `public/v/<n>/`; `/versions` links to it and `next.config.mjs` routes it). |

## Revamp workflow
1. **Cut `vnext`** from `main`. The revamp lives there as long as it needs.
2. **Add a branch domain in Vercel.** One-time, done by Pranshu by hand when the first revamp is real; no script or agent touches Vercel or DNS. In the Vercel dashboard: Project → Settings → Domains → add a subdomain (e.g. `next.p54.dev`) → set its Git branch to `vnext`. Then add the CNAME record Vercel shows at the DNS provider. A custom domain skips deployment protection; `*.vercel.app` previews don't (see below). Later revamps reuse the same domain.
3. **Set `renovation`** on `main`: `{ "version": "<n+1>", "href": "<that domain>" }`. Ship it. The home marker now invites a peek.
4. **Build** on `vnext`. Merge `main` into it now and then.
5. **At launch**, on `vnext` (or a launch branch off it):
   1. Snapshot the outgoing version from its last commit on `main`:
      `node scripts/snapshot-version.mjs <n> main`
      This writes `public/v/<n>/` and sets that entry's `archive` to `"static"`.
   2. Bump `current` to `<n+1>`.
   3. Add the new entry at the top of `versions` (`archive: null`).
   4. Clear `renovation` (`null`).
   5. `npm run build`, check `/versions` and `/v/<n>` with `npx next start`, then merge to `main`.
6. Optionally drop the branch domain once `vnext` is merged.

## How the snapshot works (`scripts/snapshot-version.mjs <n> [ref]`)
1. `git worktree add` a throwaway checkout of `ref` (default `HEAD`) in the OS temp dir, then `npm ci` there.
2. Delete what static export can't handle, in the temp copy only: `src/app/opengraph-image.tsx` (edge runtime), plus `public/v/` so older archives don't get nested inside the new one. Any `export const dynamicParams = true` is pinned to `false` there too: next 16 refuses to export it, and an archive only serves the pages it built.
3. GitHub data: local `.env.local` is copied in; if there's still no `GITHUB_TOKEN`, the script borrows `gh auth token` for the build (read-only, build-time fetches, never in the output). Unauthenticated calls get rate-limited and the archive would freeze with an empty heatmap and skills list. A secret guard backs up "never in the output": before anything is copied, every exported file (binaries too) is scanned for GitHub token shapes (`gh[pousr]_…`, `github_pat_…`) and for the literal token the build used. Any hit prints the file paths and pattern names (never the value), deletes the export and the temp worktree, archives nothing, and exits non-zero.
4. Build with `SNAPSHOT_BASE_PATH=/v/<n>`. `next.config.mjs` honors it: `output: "export"`, `basePath`, `trailingSlash: true`, unoptimized images. A ref whose config doesn't mention `SNAPSHOT_BASE_PATH` (anything older than this doc) gets a known-good snapshot config written over it. If a dynamic route comes back with zero params (next refuses to export those), the script drops that route and builds again.
5. Post-process `out/*.html`: root-relative `href`/`src` attributes that skipped `basePath` (raw `<a href="/log">`, metadata icons) are pointed back inside `/v/<n>/`. RSC payloads are left alone on purpose: they also carry `next/link` props, which the router prefixes itself, so rewriting them doubles the prefix. Every page gets a small fixed strip: "you're looking at v<n>, archived <date> · back to now →", styled with that snapshot's own `var(--muted)` etc.
6. Copy `out/` to `public/v/<n>/`, set `archive: "static"`, remove the temp worktree (also on failure).

Serving: for every `archive: "static"` version, `next.config.mjs` adds afterFiles rewrites `/v/<n>` → `/v/<n>/index.html` and `/v/<n>/:path*` → `/v/<n>/:path*/index.html`. afterFiles runs after public files match, so the snapshot's `_next/` assets, images and `index.txt` payloads are served directly; only page paths hit the rewrite. `public/robots.txt` disallows `/v/`.

## Why static snapshots
Preview and deployment URLs on this Vercel project sit behind Vercel SSO: an anonymous request gets a 302 to `vercel.com/sso-api`. So "link to the old deployment" is out; only the production domain is public. A static export committed under `public/v/<n>/` is served by the production domain forever, with zero dependency on old deployments still existing.

## Caveats and known limitations
- **Known limitation: client-side navigation inside an archive.** Link rebasing covers full page loads only. After a client-side navigation inside the snapshot, raw `<a href="/...">` links come from the RSC payload and point at the live site again. `next/link` links stay inside the archive either way, and "back to now" is always one click away.
- **Secret guard.** A snapshot that would ship a GitHub token never reaches `public/` (step 3).
- **Data is frozen at snapshot time.** GitHub heatmap, stars, skills list: whatever they were when the script ran. Fine for an archive, since every page says it's archived and when.
- **Size.** Each snapshot is a few MB in git (JS chunks, fonts, images). Keep only versions worth walking around in; `archive: null` is a perfectly good ending.
- The OG share image isn't in snapshots (edge runtime). Archive pages are disallowed in robots anyway.
