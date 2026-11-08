"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";

// A ~3s ascii firework over the page when the year turns. Once per visit (tab session); skipped
// entirely in reduced motion. Calls onDone when finished (or skipped).
const SPARKS = ["*", "+", ".", "o", "'", "*"];
const DURATION = 3000;

type P = { x: number; y: number; vx: number; vy: number; ch: string; born: number; life: number };

export function NewYearBurst({ year, onDone }: { year: number; onDone: () => void }) {
  const reduce = useReducedMotionLive();
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const key = `ny-burst:${year}`;
    let seen = false;
    try {
      seen = !!sessionStorage.getItem(key);
    } catch {
      /* storage blocked — the caller only mounts this once per crossing anyway */
    }
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (reduce || seen || !canvas || !ctx) return done.current();

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = innerWidth, h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const colors = [cs.getPropertyValue("--accent").trim(), cs.getPropertyValue("--fg").trim()];
    const font = cs.getPropertyValue("--font-mono").trim() || "monospace";

    // rockets climb from the shell bar, then pop into sparks — in the side gutters when the
    // text column leaves room, across the page when it doesn't
    const r = document.querySelector("main")?.getBoundingClientRect();
    const roomy = !!r && r.left > 180;
    const xs = roomy && r ? [r.left * 0.35, r.left * 0.7, r.right + (w - r.right) * 0.3, r.right + (w - r.right) * 0.65] : [0.18, 0.42, 0.62, 0.84].map((f) => w * f);
    const shots = xs.map((x, i) => ({
      x: x + (Math.random() - 0.5) * 30,
      top: h * (0.22 + Math.random() * 0.2),
      at: i * 380,
      popped: false,
    }));
    const sparks: P[] = [];
    const t0 = performance.now();
    let raf = 0;
    let marked = false;
    const frame = (t: number) => {
      if (!marked) {
        // mark the visit only once something is on screen, so an effect replay
        // (strict mode) that cancels the first frame doesn't use up the burst
        marked = true;
        try {
          sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
      }
      const el = t - t0;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.font = `13px ${font}`;
      for (const s of shots) {
        const k = (el - s.at) / 700;
        if (k < 0) continue;
        if (k < 1) {
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = colors[1];
          ctx.fillText("|", s.x, h - 44 - (h - 44 - s.top) * (1 - (1 - k) ** 2));
        } else if (!s.popped) {
          s.popped = true;
          for (let i = 0; i < 22; i++) {
            const a = (i / 22) * Math.PI * 2, v = 70 + Math.random() * 90;
            sparks.push({ x: s.x, y: s.top, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ch: SPARKS[i % SPARKS.length], born: el, life: 1100 + Math.random() * 600 });
          }
        }
      }
      for (const p of sparks) {
        const age = (el - p.born) / 1000;
        const fade = 1 - (el - p.born) / p.life;
        if (fade <= 0) continue;
        ctx.globalAlpha = fade;
        ctx.fillStyle = colors[(p.ch.charCodeAt(0) & 1) as 0 | 1];
        ctx.fillText(p.ch, p.x + p.vx * age, p.y + p.vy * age + 60 * age * age);
      }
      ctx.globalAlpha = 1;
      if (el < DURATION) raf = requestAnimationFrame(frame);
      else done.current();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [reduce, year]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[45] h-full w-full" />;
}
