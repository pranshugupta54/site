"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DOORS, countdown, doorDate, doorPath, unlockAt, type LockedView } from "@/lib/advent";
import type { OpenDoor } from "@/lib/advent-server";
import { useAdventClock, useOpenWhen, useOpened } from "./hooks";
import { TofuSit } from "./tofu-sit";
import "./advent.css";

// /advent/<n>: one door. Locked, it's the teaser and a countdown (the server sent
// nothing else). Open, it's the door's copy and, for toys, the toy the server page
// picked (toys/index.tsx), loaded on demand.

/** copy with `code` spans */
function Copy({ text }: { text: string }) {
  return (
    <p>
      {text.split(/`([^`]+)`/).map((p, i) => (i % 2 ? <code key={i}>{p}</code> : <span key={i}>{p}</span>))}
    </p>
  );
}

function Share({ n }: { n: number }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="adv-btn adv-ghost"
      onClick={async () => {
        const url = `${location.origin}${doorPath(n)}`;
        try {
          if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ url, title: `door ${n} · tofu's advent calendar` });
          else {
            await navigator.clipboard.writeText(url);
            setDone(true);
            setTimeout(() => setDone(false), 1600);
          }
        } catch {
          /* dismissed */
        }
      }}
    >
      {done ? "link copied" : "share this door"}
    </button>
  );
}

function Nav({ n, nextOpen }: { n: number; nextOpen: boolean }) {
  return (
    <nav className="adv-nav" aria-label="doors">
      <Link href="/advent">← calendar</Link>
      <span className="adv-dim">
        door {n} of {DOORS}
      </span>
      <span className="adv-nav-pn">
        {n > 1 ? <Link href={doorPath(n - 1)}>‹ {n - 1}</Link> : <span />}
        {n < DOORS && nextOpen ? <Link href={doorPath(n + 1)}>{n + 1} ›</Link> : null}
      </span>
    </nav>
  );
}

function Locked({ door, now, year, preview, pinned }: { door: LockedView; now: Date; year: number; preview: boolean; pinned: boolean }) {
  const at = unlockAt(door.n, year).getTime();
  useOpenWhen(at, now, preview, pinned);
  return (
    <>
      <Nav n={door.n} nextOpen={false} />
      <section className="adv-locked-page">
        <p className="adv-kicker"># door {door.n} · {doorDate(door.n)}</p>
        <div className="adv-locked-row">
          <pre className="adv-bigdoor" aria-hidden>
            {[".---------.", `|   ${String(door.n).padStart(2, " ")}    |`, "|    o    |", "|  [===]  |", "|         |", "'---------'"].join("\n")}
          </pre>
          <div>
            <h1 className="adv-title">locked.</h1>
            <p className="adv-quote">“{door.hint}”</p>
            <p className="adv-status">
              <span>
                opens in <b className="adv-count">{countdown(at - now.getTime())}</b>
              </span>
              <span className="adv-dim">{doorDate(door.n)}, 00:00 ist</span>
            </p>
          </div>
        </div>
        <TofuSit frame="blink" say="no peeking. i'm not peeking either." />
        <div className="adv-actions">
          <Link href="/advent" className="adv-btn">
            see the open doors
          </Link>
          <Share n={door.n} />
        </div>
      </section>
    </>
  );
}

function Open({ door, toy, nextOpen }: { door: OpenDoor; toy: React.ReactNode; nextOpen: boolean }) {
  const { markOpened } = useOpened();
  useEffect(() => markOpened(door.n), [door.n, markOpened]);
  return (
    <>
      <Nav n={door.n} nextOpen={nextOpen} />
      <article className={`adv-open-page adv-k-${door.kind}`}>
        <p className="adv-kicker">
          # door {door.n} · {doorDate(door.n)} · {door.kind === "finale" ? "the big one" : door.kind}
        </p>
        <h1 className="adv-title">
          <span className="adv-title-glyph" aria-hidden>
            {door.glyph}
          </span>{" "}
          {door.title}
        </h1>
        <div className="adv-copy">
          {door.body?.map((t) => (
            <Copy key={t} text={t} />
          ))}
        </div>
        {toy}
        <div className="adv-actions">
          {door.link ? (
            door.link.ext ? (
              <a href={door.link.href} target="_blank" rel="noreferrer" className="adv-btn">
                {door.link.label} ↗
              </a>
            ) : (
              <Link href={door.link.href} className="adv-btn">
                {door.link.label} →
              </Link>
            )
          ) : null}
          <Share n={door.n} />
        </div>
        <TofuSit say={door.tofu} className="adv-signoff" />
      </article>
    </>
  );
}

export function DoorView({
  door,
  now: serverNow,
  year,
  preview,
  pinned,
  toy,
}: {
  door: LockedView | OpenDoor;
  now: string;
  year: number;
  preview: boolean;
  /** a ?now= is in the url */
  pinned: boolean;
  toy?: React.ReactNode;
}) {
  const now = useAdventClock(serverNow);
  const nextOpen = door.n < DOORS && now.getTime() >= unlockAt(door.n + 1, year).getTime();
  return (
    <div className="adv adv-page">
      {door.state === "locked" ? <Locked door={door} now={now} year={year} preview={preview} pinned={pinned} /> : <Open door={door} toy={toy} nextOpen={nextOpen} />}
    </div>
  );
}
