"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { DOORS, homeEntryVisible, openCount, previewNow } from "@/lib/advent";
import { PromptLabel } from "@/components/tty/prompt";

// The home page's `advent` block, nov 30 to dec 24 (IST). The page is cached hourly,
// so the server's answer is the first paint; the client re-checks against its own
// clock, which also lets ?now= preview it on any date.

const noop = () => () => {};

export function AdventEntry({ year, initial }: { year: number; initial: { visible: boolean; open: number } }) {
  // "visible|open" as a string, so the snapshot compares by value
  const snap = useSyncExternalStore(
    noop,
    () => {
      const now = previewNow(new URLSearchParams(location.search).get("now"), new Date(), true);
      return `${homeEntryVisible(now, year)}|${openCount(now, year)}`;
    },
    () => `${initial.visible}|${initial.open}`
  );
  const [visible, openRaw] = snap.split("|");
  if (visible !== "true") return null;
  const open = Number(openRaw);
  const line =
    open === 0
      ? `door 1 opens dec 1, 00:00 ist. tofu is still wrapping.`
      : open >= DOORS
        ? "all 24 doors are open. the last one is the best one."
        : `${open} of 24 doors open. today's is door ${open}.`;
  return (
    <section id="advent" className="tty-block" aria-label="advent">
      <div className="tty-cmd">
        <PromptLabel /> <span>advent</span>
      </div>
      <Link href="/advent" className="tty-advent">
        <span className="tty-advent-doors" aria-hidden>
          {Array.from({ length: DOORS }, (_, i) => (
            <i key={i} className={i < open ? "on" : undefined} />
          ))}
        </span>
        <span className="tty-advent-t">
          <span className="mark">tofu&apos;s advent calendar</span>
        </span>
        <span className="tty-dim">{line} toys, secrets and small things, one door a day.</span>
        <span className="tty-advent-go">{open ? "▶ open today's door" : "▶ peek at the calendar"}</span>
      </Link>
    </section>
  );
}
