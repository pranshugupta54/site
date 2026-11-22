import { ADVENT_YEAR } from "@/data/advent";
import { openCount, parseDoor, unlockAt } from "@/lib/advent";
import { adventNow, doorAt } from "@/lib/advent-server";
import { adventOg } from "@/lib/og/advent-card";

// /advent/og: the calendar's card. /advent/og?door=<n>: that door's card, decided by
// the date right now, never by the url: `s=` only busts scraper caches, so asking
// for an open card before its date still gets the locked teaser.
// A locked card is cached no later than its door opens.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const now = adventNow(q.get("now"));
  const open = openCount(now, ADVENT_YEAR);
  const raw = q.get("door");
  let res: Response;
  let maxAge = 3600;
  if (raw === null) res = await adventOg({ kind: "calendar", open });
  else {
    const n = parseDoor(raw);
    const door = n ? doorAt(n, now) : null;
    if (!door) return new Response("no such door", { status: 404 });
    // a locked card may be cached until its door opens, never past it
    if (door.state === "locked") maxAge = Math.min(3600, Math.floor((unlockAt(door.n, ADVENT_YEAR).getTime() - now.getTime()) / 1000));
    else maxAge = 86400;
    res = await adventOg({ kind: "door", door, open, now });
  }
  res.headers.set(
    "Cache-Control",
    q.has("now") || maxAge < 1 ? "no-store" : `public, max-age=${maxAge}, s-maxage=${maxAge}`
  );
  return res;
}
