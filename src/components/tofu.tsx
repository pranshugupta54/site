"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion";
import framesData from "@/data/tofu-frames.json";
import quips from "@/data/quips.json";
import { Scramble } from "@/components/scramble";

const FRAMES = framesData.frames as Record<string, string[]>;
const HOP = (framesData.hop as string[][]).map((f) => f.join("\n"));
const F = (k: string) => (FRAMES[k] ?? FRAMES.idle).join("\n");

const PXW = 84;
const PXH = 58;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Side = "left" | "right";
type Bounds = { minX: number; maxX: number; minY: number; maxY: number; winW: number };

function bounds(side: Side): Bounds {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const cx = winW / 2;
  const half = 320;
  let minX: number, maxX: number;
  if (side === "left") {
    minX = 6;
    maxX = Math.max(6, cx - half - PXW);
  } else {
    maxX = winW - PXW - 6;
    minX = Math.min(maxX, cx + half);
  }
  if (maxX < minX) maxX = minX;
  const minY = 70;
  const maxY = Math.max(minY, winH - PXH - 72);
  return { minX, maxX, minY, maxY, winW };
}

export function Tofu() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [ready, setReady] = useState(false);
  const [frame, setFrame] = useState(F("idle"));
  const [quip, setQuip] = useState<string | null>(null);
  const [bubbleRight, setBubbleRight] = useState(true);

  const pos = useRef({ x: 0, y: 0 });
  const side = useRef<Side>("right");
  const alive = useRef(true);
  const hovering = useRef(false);
  const busy = useRef(false);
  const sleeping = useRef(false);
  const atEdge = useRef(false);
  const interrupt = useRef(false);
  const lastActive = useRef(0);
  const altBreath = useRef(false);
  const anims = useRef<ReturnType<typeof animate>[]>([]);
  const macroTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const microTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quipTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQuip = useRef(-1);

  const move = (tx: number | number[], ty: number | number[], dur: number, ease = "easeOut") => {
    const opts = Array.isArray(tx)
      ? { duration: dur, ease, times: [0, 0.5, 1] }
      : { duration: dur, ease };
    anims.current = [
      animate(x, tx as number, opts as never),
      animate(y, ty as number, opts as never),
    ];
  };

  // freeze instantly (on hover) — sync logical pos to the live position, no teleport on resume
  const stopMotion = () => {
    interrupt.current = true;
    anims.current.forEach((a) => a.stop());
    anims.current = [];
    pos.current = { x: x.get(), y: y.get() };
  };

  const hopTo = async (tx: number, ty: number) => {
    interrupt.current = false;
    const fx = x.get();
    const fy = y.get();
    const apex = Math.min(fy, ty) - 16;
    const dur = 0.5;
    move([fx, (fx + tx) / 2, tx], [fy, apex, ty], dur);
    for (let i = 0; i < HOP.length; i++) {
      if (interrupt.current || !alive.current) return;
      setFrame(HOP[i]);
      await wait(Math.round((dur * 1000) / HOP.length));
    }
    if (interrupt.current || !alive.current) return;
    pos.current = { x: tx, y: ty };
    setFrame(F("idle"));
  };

  useEffect(() => {
    alive.current = true;
    const s: Side = Math.random() < 0.5 ? "left" : "right";
    side.current = s;
    const b = bounds(s);
    const startY = b.minY + Math.random() * (b.maxY - b.minY);
    const tuckX = s === "left" ? -PXW * 0.4 : b.winW - PXW * 0.55;
    pos.current = { x: tuckX, y: startY };
    x.set(tuckX);
    y.set(startY);
    setFrame(F("peek"));
    atEdge.current = true;
    lastActive.current = Date.now();
    setReady(true);

    if (reduce) {
      const inX = s === "left" ? b.minX : b.maxX;
      move(inX, startY, 0.6);
      pos.current = { x: inX, y: startY };
      atEdge.current = false;
      setFrame(F("idle"));
      return () => {
        alive.current = false;
      };
    }

    const schedule = (ms: number) => {
      macroTimer.current = setTimeout(beat, ms);
    };

    const beat = async () => {
      if (!alive.current) return;
      if (hovering.current) {
        schedule(450);
        return;
      }
      if (sleeping.current) {
        schedule(1500);
        return;
      }
      if (Date.now() - lastActive.current > 40000 && !atEdge.current && !busy.current) {
        sleeping.current = true;
        setFrame(F("sleep"));
        schedule(2000);
        return;
      }

      busy.current = true;
      const b2 = bounds(side.current);
      const r = Math.random();
      if (atEdge.current) {
        const inX = side.current === "left" ? b2.minX + 6 : b2.maxX - 6;
        await hopTo(inX, clamp(pos.current.y, b2.minY, b2.maxY));
        atEdge.current = false;
      } else if (r < 0.16) {
        const edgeX = side.current === "left" ? b2.minX : b2.maxX;
        await hopTo(edgeX, pos.current.y);
        if (!hovering.current && !interrupt.current) {
          const tuckX2 = side.current === "left" ? -PXW * 0.4 : b2.winW - PXW * 0.55;
          move(tuckX2, pos.current.y, 0.45);
          pos.current = { x: tuckX2, y: pos.current.y };
          setFrame(F("peek"));
          atEdge.current = true;
        }
      } else {
        const stepX = 40 + Math.random() * 60;
        const stepY = 24 + Math.random() * 44;
        const tx = clamp(pos.current.x + (Math.random() < 0.5 ? -stepX : stepX), b2.minX, b2.maxX);
        const ty = clamp(pos.current.y + (Math.random() < 0.5 ? -stepY : stepY), b2.minY, b2.maxY);
        await hopTo(tx, ty);
      }
      busy.current = false;
      if (!alive.current) return;
      schedule(800 + Math.random() * 1500);
    };
    schedule(1400);

    const idleOk = () =>
      alive.current && !busy.current && !sleeping.current && !atEdge.current && !hovering.current;
    const micro = () => {
      microTimer.current = setTimeout(() => {
        if (idleOk()) {
          const r = Math.random();
          if (r < 0.12) {
            setFrame(F("blink"));
            setTimeout(() => idleOk() && setFrame(F("idle")), 130);
          } else if (r < 0.2) {
            setFrame(F("twitch"));
            setTimeout(() => idleOk() && setFrame(F("idle")), 220);
          } else {
            altBreath.current = !altBreath.current;
            setFrame(altBreath.current ? F("breathe") : F("idle"));
          }
        }
        micro();
      }, 700 + Math.random() * 500);
    };
    micro();

    return () => {
      alive.current = false;
      if (macroTimer.current) clearTimeout(macroTimer.current);
      if (microTimer.current) clearTimeout(microTimer.current);
      if (quipTimer.current) clearInterval(quipTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const wake = () => {
    lastActive.current = Date.now();
    if (sleeping.current) {
      sleeping.current = false;
      setFrame(F("idle"));
    }
  };
  const pickQuip = () => {
    let i = Math.floor(Math.random() * quips.length);
    if (quips.length > 1) while (i === lastQuip.current) i = Math.floor(Math.random() * quips.length);
    lastQuip.current = i;
    setQuip(quips[i]);
  };
  const onEnter = () => {
    hovering.current = true;
    stopMotion(); // freeze in place — stable, clickable target
    setFrame(F("idle"));
    wake();
    setBubbleRight(pos.current.x > window.innerWidth / 2);
    pickQuip();
    if (quipTimer.current) clearInterval(quipTimer.current);
    quipTimer.current = setInterval(pickQuip, 5000);
  };
  const onLeave = () => {
    hovering.current = false;
    lastActive.current = Date.now();
    if (quipTimer.current) {
      clearInterval(quipTimer.current);
      quipTimer.current = null;
    }
    setQuip(null);
  };

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-30 hidden select-none sm:block"
      style={{ x, y, opacity: ready ? 1 : 0 }}
    >
      <div className="pointer-events-auto relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {quip && (
          <div className="absolute bottom-full mb-2 w-44" style={{ [bubbleRight ? "right" : "left"]: 0 }}>
            <div className="rounded-none border-2 border-fg bg-bg px-2 py-1.5 font-mono text-[10px] leading-tight text-fg shadow-[3px_3px_0_0_var(--line)]">
              <Scramble text={quip} key={quip} speedMs={14} reveal={1.4} />
            </div>
            <span className="absolute top-full" style={{ [bubbleRight ? "right" : "left"]: 14 }}>
              <span className="block h-[4px] w-[8px] bg-fg" />
              <span
                className="block h-[4px] w-[4px] bg-fg"
                style={{ [bubbleRight ? "marginRight" : "marginLeft"]: 2 }}
              />
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => router.push("/log")}
          aria-label="open Tofu's worklog"
          title="read my worklog →"
          className="-m-2 block cursor-pointer p-2 text-muted transition-colors hover:text-accent"
        >
          <pre className="m-0 select-none font-mono text-[12px] leading-[1.15]">{frame}</pre>
        </button>
      </div>
    </motion.div>
  );
}
