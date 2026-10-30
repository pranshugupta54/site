# Architecture

## Stack
Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind (CSS-variable tokens) · framer-motion · geist. Node 26 (`engines`).

## Appearance system (skins × themes)
Two independent axes on `<html>`: `data-skin` (`editorial` | `mono` | `serif`) × `data-theme` (`light` | `dark`).
- Tokens per skin/theme in `src/app/globals.css`: `--bg --fg --muted --line --accent --mark --card` + font vars.
- Tailwind utilities map to them: `bg-bg text-fg text-muted border-line text-accent bg-card bg-mark`, fonts `font-display font-body font-mono`. **Use these tokens, never hardcode colors** (except the footer shell's intentional dark terminal palette).
- `src/components/providers.tsx` = `AppearanceProvider` + `NO_FLASH_SCRIPT` (no-flash, persisted to localStorage). Switcher: `appearance-switcher.tsx` (skin label hidden below `sm`).
- Global size knob: `html { font-size: 87.5% }` (mono skin `81.25%`) — shrinks type + rem spacing together.
- Fonts via next/font: **Geist comes from the `geist` npm package** (not `next/font/google`); Newsreader/Fraunces/Instrument need `adjustFontFallback: false`. Signature font = Sassy Frass (`--font-signature`).

## Seasons (festival overlays)
A third, optional axis: `data-season` on `<html>`, set by the no-flash script when the **viewer's local date** falls inside a season's window. No deploy per festival.
- Data: `src/data/seasons.ts` → `SEASONS` (`id, name, start, end` + optional `greeting`, `quips`, `commands`, `ambient`). `start`/`end` are inclusive; `"MM-DD"` repeats yearly (may wrap new year), `"YYYY-MM-DD"` is a one-off for festivals that move (diwali). `pickSeason()` is stringified into the no-flash script, so keep it import-free and ES5-ish.
- Look: `[data-season="<id>"][data-skin]` in `globals.css` overrides **only `--accent` / `--mark`** (light + dark). Tofu's costume is `hats.<id>` in `tofu-frames.json`, 3 chars that fill the gap between the ears on every frame; `node scripts/validate-tofu.mjs` checks every hat on every frame.
- Wiring: `useAppearance().season` / `setSeason()`. Greeting slots in second in the hero rotator; quips join tofu's hover pool; `commands` become shell easter eggs; `ambient` is a tiny glyph that drifts across once per visit, ~4s after load (`season-ambient.tsx`; desktop only, off in reduced motion).
- Preview off-calendar: `?season=<id>` (or `off`, `auto`), or `season <id|off|auto>` in the shell. Both pin it for the tab (sessionStorage), so visitors are never stuck in a costume.
- Taste bar: a well-dressed site in a small hat. Two tokens, one hat, one greeting. No new colors elsewhere, no confetti.

## Key components
- `hero.tsx` — name scrambles in, multi-language greeting rotator, **signature** (Sassy Frass; writes in via `.sig` clip animation), live IST clock, **live age** (from `SITE.dob`), lead line with marker highlight.
- `sections.tsx` — Experience / Projects / Competitive Programming / Education / Writing + `Connect`. Async server component (fetches live Digitomize stars).
- `github-panel.tsx` (server; renders nothing if no live data) + `github-board.tsx` (client heatmap + **playable snake**).
- `footer-shell.tsx` — sticky terminal; `/` opens; commands: help/about/projects/gh/snake/theme/skin/funfact/goto/clock/clear/cowsay/sudo.
- `tofu.tsx` — the mascot (see @docs/tofu.md).
- `scramble.tsx` has `speedMs`/`reveal` props (faster scramble for the Tofu bubble).
