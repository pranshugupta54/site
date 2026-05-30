# Conventions & workflow gotchas

- **npm only.** There is just a `package-lock.json` (pnpm-lock was removed — don't reintroduce it; if a pnpm lock exists, Vercel uses pnpm and the frozen-lockfile build fails).
- **One `npm run dev` at a time.** Stale instances collide on :3000. Kill all: `lsof -ti:3000 | xargs kill -9; pkill -f "next dev"`.
- **Never `npm run build` while `dev` is running** — they share `.next` and corrupt it (phantom "Cannot find module for page …" ENOENT). Kill dev + `rm -rf .next` first.
- **Verify `npm run build` is green before pushing.** Push to `main` → Vercel auto-deploys.
- `mockups/` is gitignored (scratch / reference HTML, incl. the signature-font picker served at `:4321/signatures.html`).
- Copy style: **lowercase, restrained, no hype**.
