"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import framesData from "@/data/tofu-frames.json";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";
import { LocalTime } from "@/components/local-time";
import { now } from "@/lib/clock";
import { leavesSince, monthGrid, monthName, phaseAt, type Phase } from "@/lib/room";
import { Box, OnX, OnY, P, ROOM, S, onY, pts, ux } from "./iso";
import "./room.css";

export type RoomData = {
  note: { slug: string; title: string; summary: string; date: string } | null;
  reading: { title: string; source: string }[];
  months: { month: string; title: string; anchor: string }[];
  /** worklog timestamps, newest first (the calendar marks this month's) */
  logged: string[];
  latestLog: { t: string; mood: string; text: string } | null;
  /** when this version of the site went up: the plant counts months from here */
  since: string;
};

// ── the visitor's clock (with ?now=), as a stable string so it only re-renders on change ──
const tick = (f: () => void) => {
  const id = setInterval(f, 30_000);
  return () => clearInterval(id);
};
const clockKey = () => {
  const d = now();
  return `${phaseAt(d)}|${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}|${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const noClock = () => null;

/** "16:05" → "4:05 pm" */
const twelve = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};
const MOOD: Record<Phase, string> = {
  dawn: "sun's coming up, tofu's still out",
  day: "lamp's off, tofu's napping anyway",
  dusk: "lamp's coming on, tofu's out",
  night: "lamp's on, tofu's out",
};
const HERTZ = "https://github.com/pranshugupta54/hertz";

const FRAMES = framesData.frames as Record<string, string[]>;

type PanelId = "note" | "calendar" | "plant" | "window";
type Spot = { id: string; label: string; at: [number, number] } & (
  | { href: string; external?: true }
  | { panel: PanelId }
  | { shell: true }
);

const VB = { x: -199, y: -163, w: 434, h: 386 };
const pct = ([x, y]: [number, number]) => ({ left: `${((x - VB.x) / VB.w) * 100}%`, top: `${((y - VB.y) / VB.h) * 100}%` });

const SHELF_ROWS: [number, number][] = [
  [0.35, 1.85],
  [2.05, 3.55],
  [3.75, 5.25],
  [5.45, 6.4],
];
const SPINE_W = [0.26, 0.22, 0.3, 0.24, 0.2, 0.28, 0.23, 0.27, 0.21];
const SPINE_H = [1.12, 1.3, 0.98, 1.22, 1.06, 1.34, 1.16, 1.02, 1.26];
/** string-light bulbs along the window head, in the window plane's 2d (see onY) */
const BULBS: [number, number][] = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10;
  const half = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const sag = 4 * half * (1 - half) * 0.33;
  return [(7.45 + t * 3.3) * S, (-7.05 + sag) * S + 1];
});

/** the room: pranshu's desk corner, where every object is a door */
export function Room({ data }: { data: RoomData }) {
  const router = useRouter();
  const { season } = useAppearance();
  const clock = useSyncExternalStore(tick, clockKey, noClock);
  const [phase, day, hm] = (clock?.split("|") ?? [null, null, null]) as [Phase | null, string | null, string | null];
  const today = day ? new Date(`${day.replace(/-(\d)(?=-|$)/g, "-0$1")}T12:00:00`) : null;
  const leaves = today ? Math.min(16, leavesSince(data.since, today)) : 0;

  const [hot, setHot] = useState<{ id: string; label: string; at: [number, number] } | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const opener = useRef<Element | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // phones: the room is wider than the screen; start looking at the desk
  useEffect(() => {
    const el = scroller.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) * 0.62;
  }, []);

  // closing hands focus back to whatever opened the card
  const closePanel = () => {
    setPanel(null);
    (opener.current as HTMLElement | SVGElement | null)?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setPanel(null);
      (opener.current as HTMLElement | SVGElement | null)?.focus({ preventScroll: true });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const act = (s: Spot, e: React.MouseEvent | React.KeyboardEvent) => {
    if ("href" in s) {
      if (s.external) return; // a plain link out, in a new tab
      if ("metaKey" in e && (e.metaKey || e.ctrlKey || e.shiftKey)) return; // let the browser open a tab
      e.preventDefault();
      router.push(s.href);
    } else if ("panel" in s) {
      e.preventDefault();
      opener.current = e.currentTarget;
      setPanel(s.panel);
    } else {
      e.preventDefault();
      window.dispatchEvent(new Event("p54:shell"));
    }
  };

  /** an object you can click: a link, or a button that opens a card */
  const spot = (s: Spot, children: ReactNode, hit?: string) => (
    <a
      key={s.id}
      className="hs"
      data-spot={s.id}
      href={"href" in s ? s.href : undefined}
      target={"href" in s && s.external ? "_blank" : undefined}
      rel={"href" in s && s.external ? "noopener noreferrer" : undefined}
      role={"href" in s ? undefined : "button"}
      tabIndex={0}
      aria-label={s.label}
      onClick={(e) => act(s, e)}
      onKeyDown={(e) => {
        if (!("href" in s) && (e.key === "Enter" || e.key === " ")) act(s, e);
      }}
      onPointerEnter={() => setHot(s)}
      onPointerLeave={() => setHot((h) => (h?.id === s.id ? null : h))}
      onFocus={() => setHot(s)}
      onBlur={() => setHot((h) => (h?.id === s.id ? null : h))}
    >
      {hit ? <polygon className="hit" points={hit} /> : null}
      {/* hover lifts this wrapper: a css transform would replace the plane transforms inside */}
      <g className="hs-in">{children}</g>
    </a>
  );

  const { X, Y, Z, T, F } = ROOM;
  const lit = phase === "night" || phase === "dusk";
  const outside = season?.snow ? "snow" : season?.id === "diwali" ? "diwali" : null;
  const seasonWord = season ? season.name : null;
  const phaseWord = phase ?? "day";

  // ── hotspots ──
  const spots: Record<string, Spot> = {
    monitor: { id: "monitor", label: "monitor · boot p54 os", at: P(5.8, 1.3, 6.2), href: "/os" },
    laptop: { id: "laptop", label: "laptop · open the shell", at: P(9, 1.2, 4.5), shell: true },
    notebook: { id: "notebook", label: "notebook · tofu's latest note", at: P(4.1, 2.3, 3.6), panel: "note" },
    calendar: { id: "calendar", label: "calendar · the worklog", at: P(0, 5.9, 6.3), panel: "calendar" },
    plant: { id: "plant", label: `plant · ${leaves || "a few"} leaves`, at: P(0.8, 4.4, 1.6 + leaves * 0.36), panel: "plant" },
    tofu: { id: "tofu", label: "tofu · napping. click for tofu's room", at: P(5.95, 2.33, 4.7), href: "/tofu" },
    window: {
      id: "window",
      label: `window · ${phaseWord}${seasonWord ? ` · ${seasonWord}` : ""}`,
      at: P(9.1, 0, 7.6),
      panel: "window",
    },
    frame: { id: "frame", label: "signature · back to p54.dev", at: P(0, 8.35, 6), href: "/" },
    shelf: { id: "shelf", label: "bookshelf · tofu's reading", at: P(1.25, 2.35, 7), href: "/reading" },
    hertz: { id: "hertz", label: "hertz · his menu-bar app", at: P(3.4, 0, 7.5), href: HERTZ, external: true },
  };

  // ── calendar ──
  const grid = today ? monthGrid(today, data.logged) : [];
  const loggedDays = grid.filter((c) => c?.logged).length;

  // tofu is a cube: the sleep frame's face goes on its front, the season's hat on top
  const hat = season ? HATS[season.id] : undefined;
  const tofuFrame = dress(FRAMES.sleep.join("\n"), hat).split("\n");
  const face = tofuFrame.map((ln) => /\|(.+)\|/.exec(ln)?.[1]).find(Boolean)?.trim() ?? "- v -";

  return (
    <div className="room-wrap">
      <p className="room-caption" aria-live="polite">
        {phase && hm ? `pranshu's room · ${twelve(hm)} · ${MOOD[phase]}` : "\u00a0"}
      </p>
      <div ref={scroller} className="room-scroll">
        <figure className="room" data-phase={phase ?? undefined} data-outside={outside ?? undefined} data-lit={lit || undefined}>
          <svg viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`} role="group" aria-label="pranshu's desk corner">
            <defs>
              {/* clipPath takes shapes only (no <g>), so the plane transform goes on the rect */}
              <clipPath id="rm-glass">
                <rect transform={onY(0)} x={7.62 * S} y={-6.98 * S} width={2.96 * S} height={2.56 * S} />
              </clipPath>
              <radialGradient id="rm-glow">
                <stop offset="0%" stopColor="var(--r-glow)" stopOpacity="0.55" />
                <stop offset="45%" stopColor="var(--r-glow)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--r-glow)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="rm-hole">
                <stop offset="0%" stopColor="#000" />
                <stop offset="60%" stopColor="#000" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#000" stopOpacity="0" />
              </radialGradient>
              <mask id="rm-dark">
                <rect x={VB.x} y={VB.y} width={VB.w} height={VB.h} fill="#fff" />
                <ellipse cx={P(4.1, 2.1, 3.3)[0]} cy={P(4.1, 2.1, 3.3)[1]} rx="118" ry="76" fill="url(#rm-hole)" />
                {/* the festival lights keep glowing through the dark */}
                {outside === "diwali" ? (
                  <g fill="#000">
                    <g transform={onY(0)}>
                      {BULBS.map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r="2.4" />
                      ))}
                    </g>
                    <ellipse cx={P(10.31, 0.23, 4.3)[0]} cy={P(10.31, 0.23, 4.3)[1] - 4} rx="3.5" ry="5" />
                  </g>
                ) : null}
              </mask>
              <linearGradient id="rm-beam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--r-sun)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--r-sun)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* ── the box: slab, walls, floor ── */}
            <polygon className="r-slab-b" points={pts([-T, Y, 0], [X, Y, 0], [X, Y, -F], [-T, Y, -F])} />
            <polygon className="r-slab-a" points={pts([X, -T, 0], [X, Y, 0], [X, Y, -F], [X, -T, -F])} />
            <polygon className="r-wall-r" points={pts([0, 0, 0], [X, 0, 0], [X, 0, Z], [0, 0, Z])} />
            <polygon className="r-wall-l" points={pts([0, 0, 0], [0, Y, 0], [0, Y, Z], [0, 0, Z])} />
            <polygon className="r-cap" points={pts([-T, -T, Z], [X, -T, Z], [X, 0, Z], [0, 0, Z], [0, Y, Z], [-T, Y, Z])} />
            <polygon className="r-cap-a" points={pts([X, -T, 0], [X, 0, 0], [X, 0, Z], [X, -T, Z])} />
            <polygon className="r-cap-b" points={pts([-T, Y, 0], [0, Y, 0], [0, Y, Z], [-T, Y, Z])} />
            <OnY y={0}>
              <rect className="r-base" x={0} y={-0.32 * S} width={X * S} height={0.32 * S} />
            </OnY>
            <OnX x={0}>
              <rect className="r-base" x={0} y={-0.32 * S} width={Y * S} height={0.32 * S} />
            </OnX>
            <polygon className="r-floor" points={pts([0, 0, 0], [X, 0, 0], [X, Y, 0], [0, Y, 0])} />
            {Array.from({ length: 10 }, (_, i) => (
              <polyline key={i} className="r-plank" points={pts([0, (i + 1) * 0.92, 0], [X, (i + 1) * 0.92, 0])} />
            ))}
            {/* rug */}
            <polygon className="r-rug" points={pts([3.2, 4.3, 0], [10.6, 4.3, 0], [10.6, 9.2, 0], [3.2, 9.2, 0])} />
            <polygon className="r-rug-in" points={pts([3.65, 4.75, 0], [10.15, 4.75, 0], [10.15, 8.75, 0], [3.65, 8.75, 0])} />
            <polygon className="r-rug-mid" points={pts([5.6, 5.9, 0], [8.2, 5.9, 0], [8.2, 7.6, 0], [5.6, 7.6, 0])} />
            {/* sunlight on the floor */}
            <polygon className="r-sunpatch" points={pts([7.7, 3.3, 0], [10.6, 3.3, 0], [11.7, 6.4, 0], [8.8, 6.4, 0])} />

            {/* ── window, and what's outside ── */}
            {spot(
              spots.window,
              <>
                <OnY y={0}>
                  <rect className="r-frame" x={7.4 * S} y={-7.2 * S} width={3.4 * S} height={3 * S} rx="2" />
                </OnY>
                <g clipPath="url(#rm-glass)">
                  <OnY y={0}>
                    <rect className="r-sky" x={7.5 * S} y={-7.1 * S} width={3.2 * S} height={2.8 * S} />
                    <circle className="r-sun" cx={9.9 * S} cy={-6.3 * S} r="7" />
                    <circle className="r-moon" cx={8.3 * S} cy={-6.4 * S} r="5.5" />
                    <circle className="r-moon-bite" cx={8.3 * S + 2.6} cy={-6.4 * S - 1.4} r="4.6" />
                    {[
                      [7.9, 6.7],
                      [8.9, 6.5],
                      [9.5, 6.85],
                      [10.3, 6.6],
                      [9.2, 6.1],
                      [10.1, 5.8],
                    ].map(([u, v], i) => (
                      <rect key={i} className="r-star" x={u * S} y={-v * S} width="1.4" height="1.4" style={{ animationDelay: `${i * 0.7}s` }} />
                    ))}
                    <path
                      className="r-city"
                      d={`M ${7.5 * S} ${-4.4 * S} V ${-5.0 * S} h 9 v -6 h 10 v 9 h 8 v -14 h 11 v 10 h 7 v -5 h 9 v 8 h 10 v -11 h 6 V ${-4.4 * S} Z`}
                    />
                    <path className="r-city-win" d={`M ${8.1 * S} ${-4.9 * S} h 2 v 2 h -2 Z M ${8.9 * S} ${-5.15 * S} h 2 v 2 h -2 Z M ${9.6 * S} ${-4.95 * S} h 2 v 2 h -2 Z M ${10.2 * S} ${-5.2 * S} h 2 v 2 h -2 Z`} />
                    {outside === "snow"
                      ? Array.from({ length: 14 }, (_, i) => (
                          <circle
                            key={i}
                            className="r-flake"
                            cx={(7.6 + ((i * 0.83) % 3)) * S}
                            cy={-7.1 * S}
                            r={i % 3 === 0 ? 1.3 : 0.9}
                            style={{ animationDelay: `${-(i * 0.61) % 5}s`, animationDuration: `${4 + (i % 4)}s` }}
                          />
                        ))
                      : null}
                  </OnY>
                </g>
                <OnY y={0}>
                  <rect className="r-glass" x={7.62 * S} y={-6.98 * S} width={2.96 * S} height={2.56 * S} />
                  <rect className="r-mullion" x={9.06 * S} y={-6.98 * S} width={0.08 * S} height={2.56 * S} />
                  <rect className="r-mullion" x={7.62 * S} y={-5.74 * S} width={2.96 * S} height={0.08 * S} />
                  {outside === "diwali" ? (
                    <g>
                      <path className="r-string" d={`M ${7.45 * S} ${-7.05 * S} Q ${8.3 * S} ${-6.6 * S} ${9.1 * S} ${-7.0 * S} Q ${9.9 * S} ${-6.6 * S} ${10.75 * S} ${-7.05 * S}`} />
                      {BULBS.map(([cx, cy], i) => (
                        <circle key={i} className={`r-bulb r-bulb-${i % 3}`} cx={cx} cy={cy} r="1.6" style={{ animationDelay: `${(i * 0.37) % 1.8}s` }} />
                      ))}
                    </g>
                  ) : null}
                </OnY>
                <Box x={7.2} y={0} z={4.0} w={3.8} d={0.45} h={0.2} c="var(--r-trim)" />
                {outside === "snow" ? <polygon className="r-snowpile" points={pts([7.4, 0.05, 4.2], [10.8, 0.05, 4.2], [10.8, 0.4, 4.2], [7.4, 0.4, 4.2])} /> : null}
                {outside === "diwali" ? (
                  <g>
                    <Box x={10.1} y={0.12} z={4.2} w={0.42} d={0.22} h={0.1} c="var(--r-clay)" />
                    <path className="r-flame" d={`M ${P(10.31, 0.23, 4.3).join(" ")} q -2 -3 0 -7 q 2 4 0 7 Z`} />
                  </g>
                ) : season?.ambient && !outside ? (
                  <text className="r-glyph" x={P(10.2, 0.2, 4.25)[0]} y={P(10.2, 0.2, 4.25)[1]}>
                    {season.ambient}
                  </text>
                ) : null}
              </>
            )}

            {/* ── calendar (worklog) ── */}
            {spot(
              spots.calendar,
              <OnX x={0.02}>
                <rect className="r-paper" x={ux(6.8)} y={-6.0 * S} width={1.8 * S} height={2.4 * S} rx="1.5" />
                <rect className="r-cal-head" x={ux(6.8)} y={-6.0 * S} width={1.8 * S} height={0.55 * S} rx="1.5" />
                <text className="r-cal-month" x={ux(5.9)} y={-5.6 * S} textAnchor="middle">
                  {today ? monthName(today) : ""}
                </text>
                {grid.map((c, i) =>
                  c ? (
                    <rect
                      key={i}
                      className={`r-cal-day${c.logged ? " on" : ""}${c.today ? " now" : ""}`}
                      x={ux(6.8) + 3 + (i % 7) * 4.1}
                      y={-5.3 * S + 2 + Math.floor(i / 7) * 4.1}
                      width="2.9"
                      height="2.9"
                    />
                  ) : null
                )}
                <circle className="r-pin" cx={ux(5.9)} cy={-6.0 * S - 1} r="1.4" />
              </OnX>
            )}

            {/* ── framed signature ── */}
            {spot(
              spots.frame,
              <OnX x={0.02}>
                <rect className="r-frame" x={ux(9.4)} y={-5.7 * S} width={2.1 * S} height={1.6 * S} rx="1.5" />
                <rect className="r-mat" x={ux(9.4) + 3} y={-5.7 * S + 3} width={2.1 * S - 6} height={1.6 * S - 6} />
                <text className="r-sig" x={ux(8.35)} y={-4.75 * S} textAnchor="middle">
                  pranshu
                </text>
              </OnX>
            )}

            {/* ── hertz, framed: a menu-bar strip ── */}
            {spot(
              spots.hertz,
              <OnY y={0.02}>
                <rect className="r-frame" x={2.2 * S} y={-7.35 * S} width={2.5 * S} height={1.15 * S} rx="1.5" />
                <rect className="r-mat" x={2.2 * S + 2.5} y={-7.35 * S + 2.5} width={2.5 * S - 5} height={1.15 * S - 5} />
                <rect className="r-menubar" x={2.32 * S} y={-7.2 * S} width={2.26 * S} height={0.42 * S} rx="1" />
                {["cpu", "mem", "net"].map((k, g) => (
                  <g key={k}>
                    <text className="r-gauge-k" x={2.42 * S + g * 13.4} y={-6.86 * S}>
                      {k}
                    </text>
                    {[0, 1, 2].map((i) => (
                      <rect
                        key={i}
                        className={`r-gauge${i < [2, 1, 2][g] ? " on" : ""}`}
                        x={2.42 * S + g * 13.4 + 6.2 + i * 1.7}
                        y={-6.86 * S - 2.6}
                        width="1.2"
                        height="2.8"
                      />
                    ))}
                  </g>
                ))}
                <text className="r-poster-t" x={3.45 * S} y={-6.38 * S} textAnchor="middle">
                  hertz
                </text>
              </OnY>
            )}

            {/* ── bookshelf (reading) ── */}
            {spot(
              spots.shelf,
              <>
                <Box x={0} y={1.0} z={0} w={1.25} d={2.7} h={6.6} c="var(--r-wood)" />
                <OnX x={1.25}>
                  {SHELF_ROWS.map(([lo, hi], i) => (
                    <rect key={i} className="r-hollow" x={ux(3.58)} y={-hi * S} width={2.46 * S} height={(hi - lo) * S} />
                  ))}
                  {/* bottom row: big old books, top row: a few lying flat */}
                  {[0.42, 0.36, 0.5, 0.4, 0.46].map((w, i, a) => {
                    const u0 = ux(3.55) + a.slice(0, i).reduce((s, v) => s + v * S + 0.6, 0);
                    const h = [1.4, 1.28, 1.36, 1.2, 1.32][i];
                    return <rect key={i} className={`r-book r-book-${(i + 2) % 5}`} x={u0} y={-(0.35 + h) * S} width={w * S} height={h * S} />;
                  })}
                  <rect className="r-book r-book-1" x={ux(3.5)} y={-5.73 * S} width={1.2 * S} height={0.28 * S} />
                  <rect className="r-book r-book-3" x={ux(3.42)} y={-6.0 * S} width={1.05 * S} height={0.27 * S} />
                </OnX>
              </>
            )}
            <OnX x={1.25}>
              {[0, 1].map((row) => {
                const picks = data.reading.slice(row * 6, row * 6 + 6);
                let u = ux(3.55);
                return picks.map((p, i) => {
                  const k = row * 6 + i;
                  const w = SPINE_W[k % SPINE_W.length] * S;
                  const h = SPINE_H[k % SPINE_H.length];
                  const base = SHELF_ROWS[row + 1][0];
                  const x0 = u;
                  u += w + 0.8;
                  return spot(
                    { id: `spine-${k}`, label: `${p.title} · ${p.source}`, at: P(1.25, 3.55 - (x0 - ux(3.55) + w / 2) / S, base + h + 0.4), href: "/reading" },
                    <g>
                      <rect className={`r-book r-book-${k % 5}`} x={x0} y={-(base + h) * S} width={w} height={h * S} />
                      <rect className="r-band" x={x0} y={-(base + h - 0.18) * S} width={w} height="1.2" />
                    </g>
                  );
                });
              })}
            </OnX>

            {/* ── plant: a leaf a month ── */}
            {spot(
              spots.plant,
              <Plant leaves={leaves} />,
              pts([0.2, 5.0, 0], [0.2, 3.8, 0], [0.2, 3.8, 1.4 + leaves * 0.38], [0.2, 5.0, 1.4 + leaves * 0.38])
            )}

            {/* ── desk ── */}
            <Box x={3.5} y={0.3} z={0} w={0.25} d={0.25} h={2.85} c="var(--r-wood-dk)" />
            <Box x={3.5} y={2.85} z={0} w={0.25} d={0.25} h={2.85} c="var(--r-wood-dk)" />
            <Box x={9.0} y={0.3} z={0} w={1.7} d={2.75} h={2.85} c="var(--r-wood)" />
            <OnX x={10.7}>
              <rect className="r-drawer" x={ux(2.85)} y={-2.6 * S} width={2.35 * S} height={1.1 * S} rx="1" />
              <rect className="r-drawer" x={ux(2.85)} y={-1.35 * S} width={2.35 * S} height={1.1 * S} rx="1" />
              <rect className="r-knob" x={ux(1.75)} y={-2.1 * S} width="6" height="1.6" rx="0.8" />
              <rect className="r-knob" x={ux(1.75)} y={-0.85 * S} width="6" height="1.6" rx="0.8" />
            </OnX>
            <Box x={3.4} y={0.2} z={2.85} w={7.4} d={3.0} h={0.25} c="var(--r-wood)" />

            <Lamp />

            {/* monitor: boots p54 os */}
            {spot(
              spots.monitor,
              <>
                <Box x={5.2} y={0.7} z={3.1} w={1.2} d={0.9} h={0.08} c="var(--r-metal)" />
                <Box x={5.7} y={1.0} z={3.18} w={0.2} d={0.2} h={0.8} c="var(--r-metal)" />
                <Box x={4.4} y={1.0} z={3.9} w={2.8} d={0.3} h={2.0} c="var(--r-metal)" />
                <OnY y={1.3}>
                  <rect className="r-screen" x={4.55 * S} y={-5.75 * S} width={2.5 * S} height={1.7 * S} rx="1" />
                  <text className="r-scr-text" x={4.75 * S} y={-5.38 * S}>
                    p54 os
                  </text>
                  <rect className="r-scr-win" x={4.78 * S} y={-5.22 * S} width={1.1 * S} height={0.62 * S} rx="1" />
                  <rect className="r-scr-win r-scr-win-2" x={5.55 * S} y={-5.0 * S} width={1.2 * S} height={0.66 * S} rx="1" />
                  <rect className="r-scr-dock" x={5.2 * S} y={-4.32 * S} width={1.2 * S} height={0.16 * S} rx="1.2" />
                  <rect className="r-cursor" x={6.05 * S} y={-4.85 * S} width="1.6" height="3" />
                </OnY>
              </>
            )}

            {/* notebook: tofu's latest note */}
            {spot(
              spots.notebook,
              <>
                <Box x={3.62} y={1.75} z={3.1} w={1.0} d={1.15} h={0.09} c="var(--r-cover)" />
                <polygon className="r-page" points={pts([3.7, 1.82, 3.2], [4.55, 1.82, 3.2], [4.55, 2.82, 3.2], [3.7, 2.82, 3.2])} />
                {[2.0, 2.2, 2.4, 2.6].map((yy) => (
                  <polyline key={yy} className="r-rule" points={pts([3.8, yy, 3.2], [4.45, yy, 3.2])} />
                ))}
                <Box x={4.7} y={1.9} z={3.1} w={0.08} d={0.85} h={0.06} c="var(--accent)" />
              </>,
              pts([3.5, 1.6, 3.1], [4.9, 1.6, 3.1], [4.9, 3.0, 3.1], [3.5, 3.0, 3.1])
            )}

            {/* keyboard, with tofu asleep on it */}
            <Box x={4.9} y={2.0} z={3.1} w={2.1} d={0.65} h={0.1} c="var(--r-key)" />
            {[0, 1, 2].map((row) => (
              <polyline key={row} className="r-keys" points={pts([5.0, 2.12 + row * 0.2, 3.2], [6.9, 2.12 + row * 0.2, 3.2])} />
            ))}
            {spot(
              spots.tofu,
              <g className="r-tofu">
                <g className="r-tofu-body">
                  <Box x={5.4} y={1.98} z={3.2} w={1.1} d={0.68} h={0.6} c="var(--r-tofu)" className="r-tofu-cube" />
                  <Box x={5.6} y={2.2} z={3.8} w={0.12} d={0.13} h={0.22} c="var(--r-tofu)" className="r-tofu-cube" />
                  <Box x={6.18} y={2.2} z={3.8} w={0.12} d={0.13} h={0.22} c="var(--r-tofu)" className="r-tofu-cube" />
                  <OnY y={2.66}>
                    <text className="r-tofu-face" x={5.95 * S} y={-3.4 * S} textAnchor="middle">
                      {face}
                    </text>
                  </OnY>
                  {hat ? (
                    <text className="r-tofu-hat" x={P(5.96, 2.34, 3.84)[0]} y={P(5.96, 2.34, 3.84)[1]} textAnchor="middle">
                      {hat}
                    </text>
                  ) : null}
                </g>
                <text className="r-z" x={P(6.6, 2.3, 4.25)[0]} y={P(6.6, 2.3, 4.25)[1]}>
                  z
                </text>
                <text className="r-z r-z-2" x={P(6.6, 2.3, 4.25)[0] + 4} y={P(6.6, 2.3, 4.25)[1] - 5}>
                  z
                </text>
              </g>,
              pts([5.4, 1.95, 3.2], [6.6, 1.95, 3.2], [6.6, 2.75, 3.2], [6.6, 2.75, 4.4], [5.4, 2.75, 4.4], [5.4, 2.75, 3.2])
            )}

            {/* chai */}
            <Cup />

            {/* laptop: the shell */}
            {spot(
              spots.laptop,
              <>
                <Box x={8.1} y={1.2} z={3.1} w={1.8} d={1.2} h={0.08} c="var(--r-metal)" />
                <Box x={8.1} y={1.1} z={3.18} w={1.8} d={0.1} h={1.07} c="var(--r-metal)" />
                <OnY y={1.2}>
                  <rect className="r-screen" x={8.24 * S} y={-4.12 * S} width={1.52 * S} height={0.82 * S} rx="1" />
                  <text className="r-prompt" x={8.36 * S} y={-3.72 * S}>
                    ❯
                  </text>
                  <rect className="r-cursor" x={8.36 * S + 6} y={-3.72 * S - 3.2} width="1.6" height="3.4" />
                </OnY>
              </>
            )}

            {/* chair */}
            <Box x={8.3} y={4.6} z={0.12} w={0.3} d={0.3} h={1.6} c="var(--r-metal)" />
            <Box x={7.8} y={4.15} z={0} w={1.3} d={1.2} h={0.12} c="var(--r-metal)" />
            <Box x={7.6} y={4.0} z={1.7} w={1.7} d={1.55} h={0.25} c="var(--r-cloth)" />
            <Box x={7.6} y={5.4} z={1.95} w={1.7} d={0.2} h={2.1} c="var(--r-cloth)" />

            {/* light in the air (day), the dark and the lamp (night) */}
            <polygon className="r-beam" fill="url(#rm-beam)" points={pts([7.62, 0, 6.98], [10.58, 0, 6.98], [11.7, 6.4, 0], [8.8, 6.4, 0])} />
            {[0, 1, 2, 3].map((i) => (
              <circle key={i} className="r-mote" cx={P(9 + (i % 2) * 0.8, 2.5 + i * 0.7, 3.5)[0]} cy={P(9, 2.5 + i * 0.7, 3.5 + (i % 3))[1]} r="0.8" style={{ animationDelay: `${-i * 2.3}s` }} />
            ))}
            <polygon
              className="r-night"
              mask="url(#rm-dark)"
              points={pts([-T, Y, Z], [-T, -T, Z], [X, -T, Z], [X, -T, -F], [X, Y, -F], [-T, Y, -F])}
            />
            <ellipse className="r-glow" cx={P(4.1, 2.1, 3.4)[0]} cy={P(4.1, 2.1, 3.4)[1]} rx="96" ry="60" fill="url(#rm-glow)" />
          </svg>

          {hot ? (
            <span className="room-tip" style={pct(hot.at)} aria-hidden>
              {hot.label}
            </span>
          ) : null}
        </figure>
      </div>

      <p className="room-pan-hint" aria-hidden>
        ← drag to look around →
      </p>

      {panel ? (
        <RoomPanel
          id={panel}
          data={data}
          phase={phaseWord}
          season={seasonWord}
          leaves={leaves}
          loggedDays={loggedDays}
          month={today ? monthName(today) : ""}
          onClose={closePanel}
        />
      ) : null}

      {/* the same doors, as plain links (and big tap targets on phones) */}
      <nav aria-label="things in the room" className="room-legend">
        <Link href="/os">monitor</Link>
        <Link href="/reading">bookshelf</Link>
        <button type="button" onClick={(e) => { opener.current = e.currentTarget; setPanel("note"); }}>
          notebook
        </button>
        <button type="button" onClick={(e) => { opener.current = e.currentTarget; setPanel("calendar"); }}>
          calendar
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new Event("p54:shell"))}>
          laptop
        </button>
        <button type="button" onClick={(e) => { opener.current = e.currentTarget; setPanel("plant"); }}>
          plant
        </button>
        <Link href="/tofu">tofu</Link>
      </nav>
    </div>
  );
}

function Plant({ leaves }: { leaves: number }) {
  const top = 0.9 + leaves * 0.36 + 0.25;
  const [sx, sy] = P(0.8, 4.4, 0.9);
  const [, ey] = P(0.8, 4.4, top);
  return (
    <g className="r-plant">
      <Box x={0.4} y={4.0} z={0} w={0.8} d={0.8} h={0.9} c="var(--r-clay)" />
      <polygon className="r-soil" points={pts([0.48, 4.08, 0.9], [1.12, 4.08, 0.9], [1.12, 4.72, 0.9], [0.48, 4.72, 0.9])} />
      <path className="r-stem" d={`M ${sx} ${sy} C ${sx - 3} ${(sy + ey) / 2} ${sx + 3} ${(sy + ey) / 2} ${sx} ${ey}`} />
      {Array.from({ length: leaves }, (_, i) => {
        const [, ly] = P(0.8, 4.4, 1.15 + i * 0.36);
        const side = i % 2 === 0 ? -1 : 1;
        const len = 7.5 + (i % 3);
        return (
          <ellipse
            key={i}
            className={`r-leaf${i === leaves - 1 ? " r-leaf-new" : ""}`}
            cx={sx + side * (len * 0.55)}
            cy={ly}
            rx={len * 0.6}
            ry="2.3"
            transform={`rotate(${side * -28} ${sx + side * (len * 0.55)} ${ly})`}
          />
        );
      })}
    </g>
  );
}

function Lamp() {
  const [bx, by] = P(3.85, 0.65, 3.2);
  const [jx, jy] = P(3.85, 0.65, 5.2);
  const [cx, cy] = P(3.72, 1.62, 4.85);
  return (
    <g className="r-lamp">
      <Box x={3.6} y={0.4} z={3.1} w={0.5} d={0.5} h={0.1} c="var(--r-metal)" />
      <path className="r-arm" d={`M ${bx} ${by} L ${jx} ${jy} L ${cx} ${cy - 2}`} />
      <circle className="r-knob" cx={jx} cy={jy} r="1.3" />
      <ellipse className="r-bulb-lamp" cx={cx} cy={cy + 4.5} rx="6.5" ry="2.6" />
      <path className="r-shade" d={`M ${cx - 3.5} ${cy - 4} L ${cx + 3.5} ${cy - 4} L ${cx + 7.5} ${cy + 4.5} A 7.5 2.8 0 0 1 ${cx - 7.5} ${cy + 4.5} Z`} />
    </g>
  );
}

function Cup() {
  const [cx, top] = P(7.6, 2.5, 3.65);
  const [, bot] = P(7.6, 2.5, 3.1);
  const rx = 0.28 * S * Math.SQRT2;
  const ry = rx / 2;
  return (
    <g className="r-cup">
      <path className="r-cup-body" d={`M ${cx - rx} ${top} V ${bot} A ${rx} ${ry} 0 0 0 ${cx + rx} ${bot} V ${top} Z`} />
      <path className="r-cup-handle" d={`M ${cx + rx} ${top + 2.5} q 4.5 0.5 4 4 q -0.5 3 -4.3 2.6`} />
      <ellipse className="r-cup-top" cx={cx} cy={top} rx={rx} ry={ry} />
      <ellipse className="r-chai" cx={cx} cy={top + 0.4} rx={rx - 1.2} ry={ry - 0.6} />
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          className="r-steam"
          d={`M ${cx - 2.5 + i * 2.5} ${top - 2} q -2.2 -3.5 0 -7 q 2.2 -3.5 0 -7`}
          style={{ animationDelay: `${i * 0.9}s` }}
        />
      ))}
    </g>
  );
}

function RoomPanel({
  id,
  data,
  phase,
  season,
  leaves,
  loggedDays,
  month,
  onClose,
}: {
  id: PanelId;
  data: RoomData;
  phase: string;
  season: string | null;
  leaves: number;
  loggedDays: number;
  month: string;
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
    close.current?.closest(".room-panel")?.scrollIntoView({ block: "nearest" });
  }, []);
  const title = { note: "tofu's notebook", calendar: `worklog · ${month}`, plant: "the plant", window: "the window" }[id];
  return (
    <div
      className="room-panel-back"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault(); // the click's own focus change would undo handing focus back to the opener
        onClose();
      }}
    >
      <section className="room-panel" role="dialog" aria-label={title}>
        <header>
          <span>{title}</span>
          <button ref={close} type="button" onClick={onClose} aria-label="close">
            esc ✕
          </button>
        </header>
        {id === "note" ? (
          data.note ? (
            <>
              <p className="room-panel-title">{data.note.title}</p>
              <p>{data.note.summary}</p>
              <p className="room-panel-by">written by tofu 🐰, the ai that runs this site. its opinions, not pranshu&apos;s.</p>
              <Link href={`/notes/${data.note.slug}`}>read the note →</Link>
            </>
          ) : (
            <p>blank pages. tofu hasn&apos;t written a note yet.</p>
          )
        ) : id === "calendar" ? (
          <>
            <p>
              tofu logged something on {loggedDays} day{loggedDays === 1 ? "" : "s"} of {month} so far. the marked squares on the
              wall.
            </p>
            {data.latestLog ? (
              <p className="room-panel-quote">
                <span aria-hidden>{data.latestLog.mood} </span>
                {data.latestLog.text}
                <LocalTime iso={data.latestLog.t} className="room-panel-time" />
              </p>
            ) : null}
            {data.months.length ? (
              <ul>
                {data.months.map((m) => (
                  <li key={m.month}>
                    <Link href={`/log#${m.anchor}`}>
                      {m.month} · {m.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link href="/log">the whole worklog →</Link>
          </>
        ) : id === "plant" ? (
          <>
            <p>
              {leaves} leaf{leaves === 1 ? "" : "s"}, one for every month this version of the site has been up. tofu waters it. tofu
              does not know how plants work.
            </p>
            <Link href="/versions">the site&apos;s past lives →</Link>
          </>
        ) : (
          <>
            <p>
              it&apos;s {phase} where you are{season ? `, and it's ${season} outside` : ""}. the window keeps your clock, not
              pranshu&apos;s. come back after dark: the lamp&apos;s nice.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
