import { ADVENT_YEAR } from "@/data/advent";
import { adventNow, calendarTiles, previewAllowsFuture } from "@/lib/advent-server";
import { AdventCalendar } from "@/components/advent/calendar";
import { calendarMeta } from "./meta";

// Rendered per request: which doors are open depends on the hour (and on ?now=), and a
// locked door's contents must never be in the html, so nothing here is cached at build.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ now?: string | string[] }> };
const nowParam = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }: Props) {
  return calendarMeta(nowParam((await searchParams).now));
}

export default async function AdventPage({ searchParams }: Props) {
  const raw = nowParam((await searchParams).now);
  const now = adventNow(raw);
  return <AdventCalendar tiles={calendarTiles(now)} now={now.toISOString()} year={ADVENT_YEAR} preview={!!raw && previewAllowsFuture()} />;
}
