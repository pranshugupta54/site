import { notFound } from "next/navigation";
import { ADVENT_YEAR } from "@/data/advent";
import { parseDoor } from "@/lib/advent";
import { adventNow, calendarTiles, doorAt, previewAllowsFuture } from "@/lib/advent-server";
import { DoorView } from "@/components/advent/door";
import { toyFor } from "@/components/advent/toys";
import { doorMeta } from "../meta";

// /advent/<n>: one door, open or locked by the date at request time. Never cached at
// build, so a locked door's contents can't sit in a prerendered page.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ door: string }>; searchParams: Promise<{ now?: string | string[] }> };
const nowParam = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

async function load({ params, searchParams }: Props) {
  const n = parseDoor((await params).door);
  const raw = nowParam((await searchParams).now);
  const now = adventNow(raw);
  const door = n ? doorAt(n, now) : null;
  if (!door) notFound();
  return { door, now, raw };
}

export async function generateMetadata(props: Props) {
  const { door, raw } = await load(props);
  return doorMeta(door, raw);
}

export default async function DoorPage(props: Props) {
  const { door, now, raw } = await load(props);
  // the finale hangs every other door on its tree, so it needs their faces; it only
  // opens on dec 24, when they're all open anyway
  const ornaments = door.state === "open" && door.kind === "finale" ? calendarTiles(now).filter((t) => t.state === "open" && t.n !== 24) : [];
  const toy = door.state === "open" ? toyFor(door, ornaments) : null;
  return <DoorView door={door} now={now.toISOString()} year={ADVENT_YEAR} preview={!!raw && previewAllowsFuture()} toy={toy} />;
}
