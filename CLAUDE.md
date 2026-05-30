# Pranshu's portfolio — agent context

Custom minimal portfolio for **Pranshu Gupta** (founding engineer @ Traycer · GitHub `pranshugupta54` · X `@pranshgupta54`). Built from scratch to replace the old dillionverma template. Deploys to **Vercel from `main`**.

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind (CSS-variable tokens) · framer-motion · lucide-react · geist.
**Package manager: npm only.** There is just a `package-lock.json` (pnpm-lock was removed — don't reintroduce it; Vercel picks pnpm if a pnpm lock exists and the frozen-lockfile build fails).

## Where content lives
**All editable content is in `src/lib/site.ts`** (the `SITE` const): name, role, location, socials, `experience` (dated), `projects`, `competitive` (programming), `education`, `lead`/`bio`, `dob`. The `lead` uses `{word}` to mark which word gets the animated highlight.

## Appearance system (skins × themes)
Two independent axes on `<html>`: `data-skin` (`editorial` | `mono` | `serif`) × `data-theme` (`light` | `dark`).
- Tokens per skin/theme in `src/app/globals.css`: `--bg --fg --muted --line --accent --mark --card` + font vars.
- Tailwind utilities map to them: `bg-bg text-fg text-muted border-line text-accent bg-card bg-mark`, fonts `font-display font-body font-mono`. **Use these tokens, never hardcode colors** (except the footer shell's intentional dark terminal palette).
- `src/components/providers.tsx` = `AppearanceProvider` + `NO_FLASH_SCRIPT` (no-flash, persisted to localStorage). Switcher: `appearance-switcher.tsx`.
- Global size knob: `html { font-size: 87.5% }` (mono skin `81.25%`). Shrinks type + rem spacing together.
- Fonts via next/font: **Geist needs the `geist` npm package** (not `next/font/google` in Next 14); Newsreader/Fraunces/Instrument need `adjustFontFallback: false`. Signature font = Sassy Frass (`--font-signature`).

## Live data — "live or hidden, never fake"
- `src/lib/github.ts` (server-only; **imported only by server components**): `getGithub()` → contribution heatmap levels, total contributions, **followers**, streak (GraphQL); `getRepoStars()` → live repo stars. **A `User-Agent` header is required** or GitHub 403s.
- `GITHUB_TOKEN` is a server env var (Vercel) — **no `NEXT_PUBLIC_` prefix**, so it never reaches the client bundle. Keep it that way; never import `lib/github.ts` from a `"use client"` file.
- Widgets **return `null` (hide) on any failure / missing key** — no fake fallbacks. Digitomize stars show floored as `★ 600+`.
- Page revalidates hourly: `export const revalidate = 3600` in `app/page.tsx`.
- WakaTime was removed. Spotify was never built. Don't re-add without asking.

## Key components
- `hero.tsx` — name scrambles in, multi-language greeting rotator, **signature** (Sassy Frass, writes in via `.sig` clip animation), live IST clock, **live age** (from `dob`), lead line with marker highlight.
- `sections.tsx` — Experience / Projects / Competitive Programming / Education / Writing, plus `Connect`. Async (fetches live Digitomize stars).
- `github-panel.tsx` (server, hides if no data) + `github-board.tsx` (client heatmap + **playable snake**).
- `footer-shell.tsx` — sticky terminal; `/` opens, commands: help/about/projects/gh/snake/theme/skin/funfact/goto/clock/clear/cowsay/sudo.
- `tofu.tsx` — **Tofu**, the mascot.

## Tofu (mascot + AI site-manager persona)
- Animated **ASCII bunny-loaf**. Frames in `src/data/tofu-frames.json`, validated by `node scripts/validate-tofu.mjs` (every frame must stay exactly 11×4, ASCII-only — run it after editing frames).
- Behavior: roams gutters by **continuous hops (never teleports)**, edge-peek, sleeps when idle; **hover = freeze + scramble speech bubble (new quip every 5s)**; **click = open `/log`**.
- **Worklog** at `/log` (`src/app/log/page.tsx` ← `src/data/worklog.json`) is written in Tofu's voice (terse, dry, self-aware, mildly caffeinated). Add entries with the CLI — it auto-stamps the time:
  ```
  node scripts/log.mjs "🐰" "what changed and how i felt about it"
  ```
  Timestamps render in the viewer's timezone (`local-time.tsx`).
- **RULE: never mention Traycer in the worklog or site copy beyond the public title.** No internal/asset details.

## Workflow / gotchas
- **One `npm run dev` at a time** — stale instances collide on :3000 (kill: `lsof -ti:3000 | xargs kill -9; pkill -f "next dev"`).
- **Never `npm run build` while `dev` is running** — they share `.next` and corrupt it (phantom "Cannot find module for page" ENOENT). Kill dev + `rm -rf .next` first.
- Verify `npm run build` is green before pushing. Push to `main` → Vercel auto-deploys.
- Favicon = `/me.jpeg` (his photo) via `metadata.icons` in `layout.tsx`.
- `mockups/` is gitignored (scratch / reference HTML, incl. the signature-font picker).
- Voice for any user-facing copy: lowercase, restrained, no hype. He's very sensitive to fonts/background/sizing.
