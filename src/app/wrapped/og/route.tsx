import { getWrapped } from "@/lib/wrapped-data";
import { wrappedOg } from "@/lib/og/wrapped-card";

// /wrapped/og?slide=<id> — one share card per slide, drawn from the same live
// data as the story. Unknown or hidden slides fall back to the intro card.
// Numbers move, so CDNs keep a card for an hour, not forever like /og.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("slide") ?? "intro";
  const { slides, title } = await getWrapped();
  const index = Math.max(0, slides.findIndex((s) => s.id === id));
  const res = await wrappedOg({ slide: slides[index], index, count: slides.length, title });
  res.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400");
  return res;
}
