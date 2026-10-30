# Conventions & workflow gotchas

- **npm only.** There is just a `package-lock.json` (pnpm-lock was removed — don't reintroduce it; if a pnpm lock exists, Vercel uses pnpm and the frozen-lockfile build fails).
- **One `npm run dev` at a time.** Stale instances collide on :3000. Kill all: `lsof -ti:3000 | xargs kill -9; pkill -f "next dev"`.
- **Never `npm run build` while `dev` is running** — they share `.next` and corrupt it (phantom "Cannot find module for page …" ENOENT). Kill dev + `rm -rf .next` first.
- **Never push to `main`.** Branch (one git worktree per change) → PR → squash-merge to `main` → Vercel auto-deploys.
- **Before merging:** clean review, green `npm run build`, passing Vercel preview, and a privacy check (no secrets, private-repo content, other people's info, or exact location).
- `mockups/` is gitignored (scratch / reference HTML, incl. the signature-font picker served at `:4321/signatures.html`).
- Copy style: **lowercase, restrained, no hype**.
