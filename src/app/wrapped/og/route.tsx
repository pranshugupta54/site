import { getWrapped } from "@/lib/wrapped-data";
import { wrappedOg } from "@/lib/og/wrapped-card";
import { SLIDE_IDS } from "@/lib/wrapped";

// /wrapped/og?slide=<id> — one share card per slide, drawn from the same live
// data as the story. Unknown ids 404; a known slide that's hidden (no data
// right now) falls back to the intro card.
// Numbers move, so CDNs keep a card for an hour, not forever like /og.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("slide") ?? "intro";
  if (!(SLIDE_IDS as readonly string[]).includes(id)) return new Response("no such slide", { status: 404 });
  const { slides, title } = await getWrapped();
  const index = Math.max(0, slides.findIndex((s) => s.id === id));
  const res = await wrappedOg({ slide: slides[index], index, count: slides.length, title });
  res.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  return res;
}
