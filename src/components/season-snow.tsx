"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { useAppearance } from "@/components/providers";

// ASCII snow for seasons with `snow`: flakes drift down the empty side gutters (>=1024px only,
// never over the text column) and settle into a thin drift along the top of the shell bar.
// One canvas, no layout cost; the loop stops while the tab is hidden. Reduced motion gets a
// still scatter instead.
const WIDE = "(min-width: 1024px)";
const CHARS = ["*", "·", ".", "+"];
const BAR = 40; // footer-shell's collapsed bar height
const CLEAR = 24; // gap kept between flakes and the text column
const COL = 7; // drift-line column width, px
const STACK = 2; // max flakes per drift column

type Flake = { gx: number; x: number; y: number; vy: number; amp: number; ph: number; ch: string; a: number; size: number };

export function SeasonSnow() {
  const { season } = useAppearance();
  const reduce = useReducedMotionLive();
  const [wide, setWide] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const on = !!season?.snow && wide;

  useEffect(() => {
    const mq = matchMedia(WIDE);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!on || !canvas || !ctx) return;

    let w = 0, h = 0, ground = 0;
    let gutters: [number, number][] = []; // [from, to] x ranges flakes may use
    let flakes: Flake[] = [];
    let drift: string[][] = [];
    let color = "";
    let font = "monospace"; // canvas fonts can't take var(), so read the computed stack
    let raf = 0;
    let last = 0;

    const readTokens = () => {
      const cs = getComputedStyle(document.documentElement);
      color = cs.getPropertyValue("--muted").trim() || "#888";
      font = cs.getPropertyValue("--font-mono").trim() || "monospace";
    };
    const pick = (): number => {
      const total = gutters.reduce((s, [a, b]) => s + (b - a), 0);
      let r = Math.random() * total;
      for (const [a, b] of gutters) {
        if (r < b - a) return a + r;
        r -= b - a;
      }
      return gutters[0][0];
    };
    const flake = (y: number): Flake => {
      const gx = pick();
      return {
        gx, x: gx, y,
        vy: 10 + Math.random() * 16,
        amp: 3 + Math.random() * 7,
        ph: Math.random() * Math.PI * 2,
        ch: CHARS[(Math.random() * CHARS.length) | 0],
        a: 0.45 + Math.random() * 0.45,
        size: 10 + Math.random() * 3,
      };
    };
    const layout = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      ground = h - BAR - 2;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const r = document.querySelector("main")?.getBoundingClientRect();
      const left = (r?.left ?? (w - 600) / 2) - CLEAR;
      const right = (r?.right ?? (w + 600) / 2) + CLEAR;
      gutters = ([[8, left - 12], [right, w - 20]] as [number, number][]).filter(([a, b]) => b - a > 40);
      const area = gutters.reduce((s, [a, b]) => s + (b - a), 0) * h;
      flakes = gutters.length ? Array.from({ length: Math.min(90, Math.round(area / 11000)) }, () => flake(Math.random() * ground)) : [];
      drift = Array.from({ length: Math.ceil(w / COL) }, () => []);
      // start with a sparse drift so the settled line reads from the first second
      for (const [a, b] of gutters)
        for (let x = a; x < b; x += COL) if (Math.random() < (reduce ? 0.45 : 0.3)) drift[(x / COL) | 0].push(CHARS[(Math.random() * 3) | 0]);
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.textBaseline = "bottom";
      for (const f of flakes) {
        ctx.globalAlpha = f.a;
        ctx.font = `${f.size}px ${font}`;
        const x = reduce ? f.gx : f.gx + Math.sin(t / 1600 + f.ph) * f.amp;
        ctx.fillText(f.ch, x, f.y);
      }
      ctx.globalAlpha = 0.7;
      ctx.font = `10px ${font}`;
      drift.forEach((col, i) => col.forEach((ch, k) => ctx.fillText(ch, i * COL, ground + 2 - k * 6)));
      ctx.globalAlpha = 1;
    };
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      for (const f of flakes) {
        f.y += f.vy * dt;
        const x = f.gx + Math.sin(t / 1600 + f.ph) * f.amp;
        const col = drift[Math.max(0, Math.min(drift.length - 1, (x / COL) | 0))];
        if (f.y >= ground - col.length * 6) {
          if (col.length < STACK) col.push(f.ch === "+" ? "*" : f.ch);
          Object.assign(f, flake(-8 - Math.random() * 40));
        }
      }
      draw(t);
      raf = requestAnimationFrame(step);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (reduce) return draw(0);
      if (document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    const onResize = () => {
      layout();
      start();
    };
    const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    const mo = new MutationObserver(() => {
      readTokens();
      if (reduce) draw(0);
    });

    readTokens();
    layout();
    start();
    addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-skin", "data-season"] });
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      mo.disconnect();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [on, reduce]);

  if (!on) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-10 h-full w-full" />;
}
