"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DOORS, countdown, doorPath, unlockAt } from "@/lib/advent";
import type { DoorTile } from "@/lib/advent-server";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { useAdventClock, useOpenWhen, useOpened } from "./hooks";
import { TofuSit } from "./tofu-sit";
import "./advent.css";

// /advent: 24 doors in a scattered grid, like a paper calendar. Locked doors carry only
// their teaser (the server never sends more); open ones swing open and lead to the door.

// paper calendars hide the numbers around the board; 24 sits near the middle
const ORDER = [7, 15, 2, 20, 11, 23, 4, 18, 9, 1, 13, 6, 21, 3, 16, 24, 12, 10, 14, 8, 19, 5, 22, 17];

function tofuLine(open: number, nextIn: number | null): string {
  if (open === 0) return nextIn !== null && nextIn < 86_400_000 ? "door one opens at midnight. i'm still tying the bows." : "nothing's open yet. i'm still wrapping. come back dec 1.";
  if (open >= DOORS) return "all 24 open. door 24 is the big one. go on.";
  if (open === 23) return "one door left. it's the best one. i'm not nervous. you're nervous.";
  return `${open} open, ${DOORS - open} to go. one a day, no skipping ahead.`;
}

export function AdventCalendar({ tiles, now: serverNow, year, preview, pinned }: { tiles: DoorTile[]; now: string; year: number; preview: boolean; pinned: boolean }) {
  const now = useAdventClock(serverNow);
  const router = useRouter();
  const reduced = useReducedMotionLive();
  const { opened, markOpened } = useOpened();
  const [swinging, setSwinging] = useState<number | null>(null);
  const [wiggle, setWiggle] = useState<{ n: number; k: number } | null>(null);
  const [say, setSay] = useState<string | null>(null);

  const byN = new Map(tiles.map((t) => [t.n, t]));
  const openN = tiles.filter((t) => t.state === "open").length;
  const nextLocked = tiles.find((t) => t.state === "locked");
  const next = nextLocked ? unlockAt(nextLocked.n, year).getTime() : null;
  useOpenWhen(next, now, preview, pinned);
  const today = openN && openN <= DOORS ? openN : 0; // the newest open door

  const open = (n: number) => {
    if (swinging) return;
    markOpened(n);
    if (reduced || opened.has(n)) return router.push(doorPath(n));
    setSwinging(n);
    setTimeout(() => router.push(doorPath(n)), 520);
  };

  const locked = (n: number) => {
    setWiggle((w) => ({ n, k: (w?.k ?? 0) + 1 }));
    const ms = unlockAt(n, year).getTime() - now.getTime();
    setSay(ms < 86_400_000 ? `door ${n}? soon. ${countdown(ms)}. i'm watching the clock too.` : `door ${n} opens dec ${n}. no peeking. i can see you peeking.`);
  };

  return (
    <div className="adv">
      <header className="adv-head">
        <p className="adv-path">
          <span className="adv-dim">~</span>/advent<span className="adv-cursor" aria-hidden />
        </p>
        <h1 className="adv-title">
          tofu&apos;s advent <span className="mark">calendar</span>
        </h1>
        <p className="adv-dim adv-sub">
          24 doors, dec 1–24. one opens every midnight, india time. each holds a small thing tofu made.
          {preview ? <span className="adv-preview"> · preview: {now.toISOString().slice(0, 16).replace("T", " ")}z</span> : null}
        </p>
        <p className="adv-status">
          <span>
            <b>{openN}</b>/24 open
          </span>
          {next !== null && nextLocked ? (
            <span>
              door {nextLocked.n} in <b className="adv-count">{countdown(next - now.getTime())}</b>
            </span>
          ) : (
            <span>all open · merry everything</span>
          )}
          {opened.size ? <span className="adv-dim">you&apos;ve opened {opened.size}</span> : null}
        </p>
      </header>

      <div className="adv-board">
        <TofuSit className="adv-perch" say={say ?? tofuLine(openN, next === null ? null : next - now.getTime())} onPoke={() => setSay(null)} />
        <ol className="adv-grid" aria-label="doors">
          {ORDER.map((n) => {
            const t = byN.get(n);
            if (!t) return null;
            if (t.state === "locked") {
              const ms = unlockAt(n, year).getTime() - now.getTime();
              const soon = ms < 86_400_000;
              return (
                <li key={n} className={`adv-cell${n === 24 ? " adv-big" : ""}`}>
                  <button
                    type="button"
                    key={wiggle?.n === n ? wiggle.k : 0}
                    className={`adv-door adv-locked${wiggle?.n === n && !reduced ? " adv-wiggle" : ""}`}
                    onClick={() => locked(n)}
                    aria-label={`door ${n}, locked, opens dec ${n}. ${t.hint}`}
                  >
                    <span className="adv-num">{n}</span>
                    <span className="adv-hint">{t.hint}</span>
                    <span className={`adv-when${soon ? " adv-soon" : ""}`}>{soon ? countdown(ms) : `dec ${n}`}</span>
                    <span className="adv-lock" aria-hidden>
                      [=]
                    </span>
                  </button>
                </li>
              );
            }
            const isOpened = opened.has(n) || swinging === n;
            return (
              <li key={n} className={`adv-cell${n === 24 ? " adv-big" : ""}`}>
                <a
                  href={doorPath(n)}
                  className={`adv-door adv-open${isOpened ? " adv-ajar" : ""}${n === today && !opened.has(n) ? " adv-today" : ""}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return markOpened(n);
                    e.preventDefault();
                    open(n);
                  }}
                  aria-label={`door ${n}: ${t.title}${opened.has(n) ? " (opened)" : ""}`}
                >
                  <span className="adv-inside" aria-hidden>
                    <span className="adv-glyph">{t.glyph}</span>
                    <span className="adv-name">{t.title}</span>
                  </span>
                  <span className="adv-leaf" aria-hidden>
                    <span className="adv-front">
                      <span className="adv-num">{n}</span>
                      <span className="adv-hint">open me</span>
                      <span className="adv-knob" />
                    </span>
                    <span className="adv-back" />
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="adv-foot adv-dim">
        opened doors stay open on this device. every door has its own link, so share the one you like. type <code>advent</code> in the shell to come back.
      </p>
    </div>
  );
}
