"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { animate, motion, motionValue, type MotionValue } from "framer-motion";
import framesData from "@/data/tofu-frames.json";
import quips from "@/data/quips.json";
import { Scramble } from "@/components/scramble";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";
import { moodNow, timedQuip } from "@/lib/tofu-mood";
import { DOCK_SPACE, type Desk, type Win } from "./wm";

// Tofu, loose on the desktop. Hops between the wallpaper and the tops of windows,
// naps up there, and rides along when you drag the window it's sitting on.
// Never teleports: every move is a hop. Reduced motion: it stays put.

const FRAMES = framesData.frames as Record<string, string[]>;
const HOP = (framesData.hop as string[][]).map((f) => f.join("\n"));
const F = (k: string) => (FRAMES[k] ?? FRAMES.idle).join("\n");

export const TOFU_W = 80;
const TOFU_H = 56;
const SIT = TOFU_H - 9; // how far above a window's top edge it sits
const MIN_PERCH_Y = SIT + 6; // no perching under the menu bar
const NAP_AFTER = 26_000;

export type Spot = { kind: "desk"; x: number; y: number } | { kind: "win"; id: string; dx: number };
type View = { frame: string; asleep: boolean; quip: string | null; hovering: boolean; hopping: boolean };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class TofuBrain {
  spot: Spot = { kind: "desk", x: 60, y: 200 };
  view: View = { frame: F("idle"), asleep: false, quip: null, hovering: false, hopping: false };
  x: MotionValue<number> = motionValue(0);
  y: MotionValue<number> = motionValue(0);
  private wins: Win[] = [];
  private desk: Desk = { w: 1200, h: 800 };
  private reduce = false;
  private subs = new Set<() => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private alive = false;
  private lastActive = Date.now();
  private lastQuip = -1;
  private lastTimed: string | null = null;
  private pool: string[] = quips;
  private altBreath = false;

  subscribe = (f: () => void) => {
    this.subs.add(f);
    return () => this.subs.delete(f);
  };
  getSpot = () => this.spot;
  getView = () => this.view;
  private emit() {
    this.subs.forEach((f) => f());
  }
  private set(v: Partial<View>) {
    this.view = { ...this.view, ...v };
    this.emit();
  }
  private later(ms: number, f: () => void) {
    this.timers.push(setTimeout(f, ms));
  }

  setPool(extra?: string[]) {
    this.pool = extra?.length ? [...quips, ...extra] : quips;
  }

  /** the desktop tells tofu where things are, every render */
  setWorld(wins: Win[], desk: Desk, reduce: boolean) {
    this.wins = wins;
    this.desk = desk;
    this.reduce = reduce;
    // its window went away (closed / minimized / zoomed): get off it
    if (this.spot.kind === "win" && !this.view.hopping) {
      const id = this.spot.id;
      const w = wins.find((o) => o.id === id);
      if (!w || w.min || w.y < MIN_PERCH_Y) this.fall(w ?? this.lastRect(id));
    }
    if (this.spot.kind === "win") this.remember(this.spot.id);
    // a window landed on it: climb out, onto that window if it fits, else somewhere clear
    else if (!this.view.hopping && !this.escaping && this.alive) {
      const s = this.spot;
      const over = wins.filter((o) => !o.min && s.x + TOFU_W > o.x && s.x < o.x + o.w && s.y + TOFU_H > o.y && s.y < o.y + o.h);
      if (over.length) {
        this.escaping = true;
        this.later(this.reduce ? 0 : 450, () => {
          this.escaping = false;
          const top = this.visible().filter((o) => over.some((c) => c.id === o.id)).pop();
          void this.hop(top ? this.perchOn(top) : this.deskSpot());
        });
      }
    }
  }
  private escaping = false;

  private rects = new Map<string, Win>();
  private remember(id: string) {
    const w = this.wins.find((o) => o.id === id);
    if (w) this.rects.set(id, w);
  }
  private lastRect(id: string) {
    return this.rects.get(id);
  }

  private visible = () => this.wins.filter((w) => !w.min && !w.max && w.y >= MIN_PERCH_Y && w.w > TOFU_W + 40);

  /** desk coords of the sprite's top-left for a spot */
  posOf(s: Spot, from?: Win): { x: number; y: number } {
    if (s.kind === "desk") return { x: s.x, y: s.y };
    const w = from ?? this.wins.find((o) => o.id === s.id);
    return w ? { x: w.x + s.dx, y: w.y - SIT } : { x: 60, y: 200 };
  }

  // a spot on the wallpaper that no window covers, if there is one
  private deskSpot(nearX?: number): Spot {
    const { w, h } = this.desk;
    const vis = this.wins.filter((o) => !o.min);
    for (let i = 0; i < 14; i++) {
      const x = Math.round(nearX !== undefined && i < 6 ? nearX + rnd(-140, 140) : rnd(16, w - TOFU_W - 16));
      const y = Math.round(rnd(h * 0.2, h - DOCK_SPACE - TOFU_H - 12));
      const cx = Math.max(16, Math.min(w - TOFU_W - 16, x));
      const hit = vis.some((o) => cx + TOFU_W > o.x && cx < o.x + o.w && y + TOFU_H > o.y && y < o.y + o.h);
      if (!hit) return { kind: "desk", x: cx, y };
    }
    return { kind: "desk", x: Math.round(rnd(16, w - TOFU_W - 16)), y: Math.round(h - DOCK_SPACE - TOFU_H - 16) };
  }

  private perchOn(w: Win): Spot {
    return { kind: "win", id: w.id, dx: Math.round(rnd(90, Math.max(96, w.w - TOFU_W - 14))) };
  }

  /** where tofu starts: on top of the frontmost window it fits on, else the wallpaper */
  place(order: string[]) {
    const vis = this.visible();
    const top = [...order].reverse().map((id) => vis.find((w) => w.id === id)).find(Boolean);
    this.spot = top ? { kind: "win", id: top.id, dx: Math.max(90, top.w - TOFU_W - 34) } : this.deskSpot();
    const p = this.posOf(this.spot);
    this.x.set(p.x);
    this.y.set(p.y);
    if (moodNow() === "night") this.set({ asleep: true, frame: F("sleep") });
    this.emit();
  }

  private async hop(to: Spot, from?: Win) {
    const a = this.posOf(this.spot, from);
    const b = this.posOf(to);
    if (this.reduce) {
      this.spot = to;
      this.x.set(b.x);
      this.y.set(b.y);
      this.emit();
      return;
    }
    this.x.set(a.x);
    this.y.set(a.y);
    this.set({ hopping: true, asleep: false });
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const dur = Math.min(0.85, 0.42 + dist / 1600);
    const apex = Math.min(a.y, b.y) - Math.min(70, 18 + dist / 8);
    animate(this.x, [a.x, (a.x + b.x) / 2, b.x], { duration: dur, ease: "easeOut", times: [0, 0.5, 1] });
    animate(this.y, [a.y, apex, b.y], { duration: dur, ease: "easeOut", times: [0, 0.5, 1] });
    for (let i = 0; i < HOP.length; i++) {
      if (!this.alive) return;
      this.set({ frame: HOP[i] });
      await wait((dur * 1000) / HOP.length);
    }
    if (!this.alive) return;
    this.spot = to;
    this.set({ hopping: false, frame: F("idle") });
  }

  private fall(from?: Win) {
    const p = this.posOf(this.spot, from);
    void this.hop(this.deskSpot(p.x), from);
  }

  start() {
    this.alive = true;
    const beat = async () => {
      if (!this.alive) return;
      const v = this.view;
      if (this.reduce || v.hovering || v.hopping) return this.later(800, beat);
      if (v.asleep) {
        if (Math.random() < 0.12) this.wake();
        return this.later(rnd(3000, 5000), beat);
      }
      if (Date.now() - this.lastActive > NAP_AFTER && this.spot.kind === "win") {
        this.set({ asleep: true, frame: F("sleep") });
        return this.later(4000, beat);
      }
      const r = Math.random();
      const vis = this.visible();
      const s = this.spot;
      if (s.kind === "win") {
        const here = vis.find((w) => w.id === s.id);
        const others = vis.filter((w) => w.id !== s.id);
        if (here && r < 0.4) {
          const dx = Math.round(Math.max(90, Math.min(here.w - TOFU_W - 14, s.dx + (Math.random() < 0.5 ? -1 : 1) * rnd(50, 130))));
          await this.hop({ kind: "win", id: here.id, dx });
        } else if (others.length && r < 0.62) await this.hop(this.perchOn(others[Math.floor(Math.random() * others.length)]));
        else if (r < 0.74) await this.hop(this.deskSpot(this.posOf(s).x));
      } else {
        if (vis.length && r < 0.5) await this.hop(this.perchOn(vis[Math.floor(Math.random() * vis.length)]));
        else if (r < 0.8) await this.hop(this.deskSpot(s.x));
      }
      this.later(rnd(2600, 6000), beat);
    };
    const micro = () => {
      if (!this.alive) return;
      const v = this.view;
      if (!this.reduce && !v.hopping && !v.asleep && !v.hovering) {
        const r = Math.random();
        if (r < 0.12) {
          this.set({ frame: F("blink") });
          this.later(130, () => !this.view.hopping && !this.view.asleep && this.set({ frame: F("idle") }));
        } else if (r < 0.2) {
          this.set({ frame: F("twitch") });
          this.later(220, () => !this.view.hopping && !this.view.asleep && this.set({ frame: F("idle") }));
        } else {
          this.altBreath = !this.altBreath;
          this.set({ frame: F(this.altBreath ? "breathe" : "idle") });
        }
      }
      this.later(rnd(700, 1200), micro);
    };
    this.later(2400, beat);
    this.later(900, micro);
  }

  stop() {
    this.alive = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  wake() {
    this.lastActive = Date.now();
    if (this.view.asleep) this.set({ asleep: false, frame: F("idle") });
  }

  private pickQuip() {
    const timed = timedQuip(moodNow(), this.lastTimed);
    if (timed) {
      this.lastTimed = timed;
      return this.set({ quip: timed });
    }
    let i = Math.floor(Math.random() * this.pool.length);
    if (this.pool.length > 1) while (i === this.lastQuip) i = Math.floor(Math.random() * this.pool.length);
    this.lastQuip = i;
    this.set({ quip: this.pool[i] });
  }
  private quipTimer: ReturnType<typeof setInterval> | null = null;
  enter() {
    if (this.view.hopping) return;
    this.wake();
    this.set({ hovering: true, frame: F("idle") });
    this.pickQuip();
    if (this.quipTimer) clearInterval(this.quipTimer);
    this.quipTimer = setInterval(() => this.pickQuip(), 5000);
  }
  leave() {
    this.lastActive = Date.now();
    if (this.quipTimer) clearInterval(this.quipTimer);
    this.quipTimer = null;
    this.set({ hovering: false, quip: null });
  }
}

/** the sprite itself: frame, hat, nap z's, hover bubble */
export function TofuSprite({ brain, happy = false, onOpen }: { brain: TofuBrain; happy?: boolean; onOpen: () => void }) {
  const v = useSyncExternalStore(brain.subscribe, brain.getView, brain.getView);
  const { season } = useAppearance();
  const hat = season ? HATS[season.id] : undefined;
  const frame = happy && !v.hopping ? F("happy") : v.frame;
  const [right, setRight] = useState(true);

  return (
    <div
      className="relative"
      onMouseEnter={(e) => {
        setRight(e.currentTarget.getBoundingClientRect().left > window.innerWidth / 2);
        brain.enter();
      }}
      onMouseLeave={() => brain.leave()}
    >
      {v.quip ? (
        <div className="os-bubble" style={{ [right ? "right" : "left"]: 0 }}>
          <Scramble text={v.quip} key={v.quip} speedMs={14} reveal={1.4} />
        </div>
      ) : null}
      {v.asleep ? (
        <span className="os-zz" aria-hidden style={{ left: TOFU_W - 6, top: -4 }}>
          z
        </span>
      ) : null}
      <button type="button" onClick={onOpen} aria-label="tofu — open tofu's room" title="tofu">
        <pre>{dress(frame, hat)}</pre>
      </button>
    </div>
  );
}

/** tofu in the air or on the wallpaper (perched tofu renders inside its window instead) */
export function FloatingTofu({ brain, onOpen }: { brain: TofuBrain; onOpen: () => void }) {
  const spot = useSyncExternalStore(brain.subscribe, brain.getSpot, brain.getSpot);
  const v = useSyncExternalStore(brain.subscribe, brain.getView, brain.getView);
  if (spot.kind === "win" && !v.hopping) return null;
  return (
    <motion.div className="os-tofu" style={{ x: brain.x, y: brain.y, zIndex: v.hopping ? 3000 : 5 }}>
      <TofuSprite brain={brain} onOpen={onOpen} />
    </motion.div>
  );
}

/** tofu sitting on a window's top edge; rendered inside that window so it rides along */
export function PerchedTofu({ brain, id, happy, onOpen }: { brain: TofuBrain; id: string; happy: boolean; onOpen: () => void }) {
  const spot = useSyncExternalStore(brain.subscribe, brain.getSpot, brain.getSpot);
  const v = useSyncExternalStore(brain.subscribe, brain.getView, brain.getView);
  if (spot.kind !== "win" || spot.id !== id || v.hopping) return null;
  return (
    <div className="os-tofu os-perch" style={{ left: spot.dx, top: -SIT }}>
      <TofuSprite brain={brain} happy={happy} onOpen={onOpen} />
    </div>
  );
}

/** keep tofu's brain running while the desktop is up */
export function useTofuBrain(): TofuBrain {
  const [brain] = useState(() => new TofuBrain());
  const { season } = useAppearance();
  useEffect(() => brain.setPool(season?.quips), [brain, season]);
  useEffect(() => {
    brain.start();
    return () => brain.stop();
  }, [brain]);
  return brain;
}
