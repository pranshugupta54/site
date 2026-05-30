# Architecture

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind (CSS-variable tokens) · framer-motion · lucide-react · geist.

## Appearance system (skins × themes)
Two independent axes on `<html>`: `data-skin` (`editorial` | `mono` | `serif`) × `data-theme` (`light` | `dark`).
- Tokens per skin/theme in `src/app/globals.css`: `--bg --fg --muted --line --accent --mark --card` + font vars.
- Tailwind utilities map to them: `bg-bg text-fg text-muted border-line text-accent bg-card bg-mark`, fonts `font-display font-body font-mono`. **Use these tokens, never hardcode colors** (except the footer shell's intentional dark terminal palette).
- `src/components/providers.tsx` = `AppearanceProvider` + `NO_FLASH_SCRIPT` (no-flash, persisted to localStorage). Switcher: `appearance-switcher.tsx` (skin label hidden below `sm`).
- Global size knob: `html { font-size: 87.5% }` (mono skin `81.25%`) — shrinks type + rem spacing together.
- Fonts via next/font: **Geist needs the `geist` npm package** (not `next/font/google` in Next 14); Newsreader/Fraunces/Instrument need `adjustFontFallback: false`. Signature font = Sassy Frass (`--font-signature`).

## Key components
- `hero.tsx` — name scrambles in, multi-language greeting rotator, **signature** (Sassy Frass; writes in via `.sig` clip animation), live IST clock, **live age** (from `SITE.dob`), lead line with marker highlight.
- `sections.tsx` — Experience / Projects / Competitive Programming / Education / Writing + `Connect`. Async server component (fetches live Digitomize stars).
- `github-panel.tsx` (server; renders nothing if no live data) + `github-board.tsx` (client heatmap + **playable snake**).
- `footer-shell.tsx` — sticky terminal; `/` opens; commands: help/about/projects/gh/snake/theme/skin/funfact/goto/clock/clear/cowsay/sudo.
- `tofu.tsx` — the mascot (see @docs/tofu.md).
- `scramble.tsx` has `speedMs`/`reveal` props (faster scramble for the Tofu bubble).
