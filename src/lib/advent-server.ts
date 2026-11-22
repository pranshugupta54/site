import { ADVENT, ADVENT_YEAR, type Door } from "@/data/advent";
import { doorView, previewNow, type LockedView } from "@/lib/advent";

// The server's side of /advent: what "now" is for a request, and the doors as they
// may be sent to the browser at that moment. Server components and routes only.

/**
 * Can `?now=` look ahead? Only where that's known to be safe: `next dev`, Vercel preview
 * deploys, or a local `next start` run with ADVENT_PREVIEW=1. Anywhere else (production,
 * or an env that's missing) it fails closed: a preview can only look back.
 */
export const previewAllowsFuture = () =>
  process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview" || process.env.ADVENT_PREVIEW === "1";

export function adventNow(raw?: string | string[] | null): Date {
  return previewNow(Array.isArray(raw) ? raw[0] : raw, new Date(), previewAllowsFuture());
}

/** A door on the calendar: an open door's face (no contents), or the locked teaser. */
export type DoorTile = LockedView | { n: number; state: "open"; title: string; glyph: string; kind: Door["kind"] };

export function calendarTiles(now: Date): DoorTile[] {
  return ADVENT.map((d) => {
    const v = doorView(d, now, ADVENT_YEAR);
    return v.state === "locked" ? v : { n: v.n, state: "open", title: v.title, glyph: v.glyph, kind: v.kind };
  });
}

export type OpenDoor = Door & { state: "open" };

/** Door `n` at `now`: the whole door if it's open, the teaser if not. */
export function doorAt(n: number, now: Date): LockedView | OpenDoor | null {
  const d = ADVENT.find((x) => x.n === n);
  return d ? doorView(d, now, ADVENT_YEAR) : null;
}
