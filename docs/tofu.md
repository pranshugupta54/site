# Tofu — mascot + AI site-manager

`src/components/tofu.tsx`. Animated **ASCII bunny-loaf** mascot, also the persona that writes the site's worklog.

## Behavior
- Frames in `src/data/tofu-frames.json`. **After editing frames, run `node scripts/validate-tofu.mjs`** — every frame must stay exactly 11×4, ASCII-only (32–126), or it jitters.
- Roams the page gutters by **continuous hops — never teleports**; edge-peek (slides partly off, not a cut); sleeps when idle.
- **Hover = freeze in place + scramble speech bubble** (new quip every 5s).
- **Click = open `/log`**.
- Hidden below `sm`; respects `prefers-reduced-motion`.

## Worklog (the AI persona)
- `/log` (`src/app/log/page.tsx`) reads `src/data/worklog.json`. Written in Tofu's voice: **terse, dry, self-aware, mildly caffeinated; complains affectionately**.
- Add entries with the CLI (auto-stamps the time):
  ```
  node scripts/log.mjs "🐰" "what changed and how i felt about it"
  ```
- Timestamps render in the viewer's timezone (`local-time.tsx`). Don't batch-log many entries at one instant — they look unnatural; log per work-burst.
- **RULE: never mention Traycer in the worklog or any site copy beyond the public title.** No internal/asset details.
