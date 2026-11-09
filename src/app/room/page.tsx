import Link from "next/link";
import versions from "@/data/versions.json";
import { getNotes } from "@/lib/notes";
import { getMonths, monthAnchor } from "@/lib/months";
import { READING } from "@/lib/reading";
import { WORKLOG } from "@/lib/worklog";
import { pageMeta } from "@/lib/meta";
import { Room, type RoomData } from "@/components/room/room";

export const revalidate = 3600; // the calendar's logged days and the latest picks, hourly like /log

export const metadata = pageMeta(
  "the room",
  "Pranshu's desk corner as a little isometric room: the monitor boots p54 os, the shelf holds tofu's reading, the notebook has tofu's latest note.",
  "/room",
  "the room: click around, everything's a door"
);

// All content is read here, on the server; the room only draws it.
export default function RoomPage() {
  const note = getNotes()[0];
  const current = versions.versions.find((v) => v.version === versions.current);
  const data: RoomData = {
    note: note ? { slug: note.slug, title: note.title, summary: note.summary, date: note.date } : null,
    reading: READING.slice(0, 12).map((r) => ({ title: r.title, source: r.source })),
    months: getMonths()
      .slice(0, 3)
      .map((m) => ({ month: m.month, title: m.title, anchor: monthAnchor(m.month) })),
    // newest first; the calendar keeps the ones in the visitor's current month
    logged: WORKLOG.slice(0, 150).map((e) => e.t),
    latestLog: WORKLOG[0] ? { t: WORKLOG[0].t, mood: WORKLOG[0].mood, text: WORKLOG[0].text } : null,
    since: current?.date ?? "2026-05-30",
  };
  return (
    <main className="mx-auto w-full max-w-[920px] px-4 pb-28 pt-12 sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-[640px] px-2 sm:px-0">
        <Link href="/" className="font-mono text-[13px] text-muted transition-colors hover:text-accent">
          ← back
        </Link>
        <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
          <span className="text-muted">/</span> room
        </h1>
        <p className="mt-3 text-sm text-muted">
          pranshu&apos;s desk corner, more or less. click around: everything in here is a door. the window keeps your clock.
        </p>
      </div>
      <div className="mt-8">
        <Room data={data} />
      </div>
    </main>
  );
}
