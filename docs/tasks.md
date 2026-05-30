# Tasks — done / parked / ideas / open

## Recently done
- Custom rebuild (skins×themes, hero, sections, footer shell, Tofu).
- Live GitHub data (heatmap, contributions, followers, streak) + live Digitomize stars (`600+`).
- WakaTime removed. Photo favicon. Signature in Sassy Frass. Mobile skin-switcher (icon only).
- Worklog `/log` + logging CLI. CLAUDE.md / docs split.

## Parked (decided not now)
- **Live multiplayer cursors** — needs a realtime backend (Vercel can't host WebSockets). Options if revisited: Liveblocks (drop-in cursors, just an API key), PartyKit (deploys to Cloudflare), Ably/Pusher. Dropped for now over hosting friction.

## Ideas / offered, not yet done
- **Real signature**: trace his actual handwritten signature → SVG path → drops into the existing `.sig` write-in animation (more authentic than a font). He'd send a photo/SVG.
- **Autonomous daily worklog**: a cron routine (`/schedule`) so Tofu appends + commits a worklog entry even when he's away.
- Writing/notes content for the Writing section (currently just links to the worklog).

## Open questions
- Location currently shows "India" — set a city if he wants.
