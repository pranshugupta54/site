"use client";

import "./toys.css";
import { useEffect, useState } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { newSeed, rng, seedLabel } from "./rng";

// door 8: a generative ascii pine forest. same seed, same forest. regrow draws a new one,
// row by row from the ground up (all at once in reduced motion).

const W = 34;
const H = 13;

function grow(seed: number): string[] {
  const r = rng(seed);
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  // sky: a few stars, maybe a moon
  for (let i = 0; i < 9; i++) g[Math.floor(r() * 4)][Math.floor(r() * W)] = r() < 0.3 ? "+" : ".";
  if (r() < 0.6) g[1][Math.floor(r() * (W - 4)) + 2] = "(";
  // trees, back to front: small far ones first, so near ones overlap them
  const trees = Array.from({ length: 6 + Math.floor(r() * 4) }, () => ({ x: Math.floor(r() * (W - 2)) + 1, h: 2 + Math.floor(r() * 6) })).sort((a, b) => a.h - b.h);
  for (const { x, h } of trees) {
    const base = H - 2;
    const top = base - h - 1;
    g[top][x] = h > 5 && r() < 0.5 ? "*" : "^";
    for (let k = 1; k <= h; k++) {
      const y = top + k;
      const w = Math.min(k, 4);
      for (let dx = -w; dx <= w; dx++) {
        const c = x + dx;
        if (c < 0 || c >= W) continue;
        g[y][c] = dx < 0 ? "/" : dx > 0 ? "\\" : k % 2 && r() < 0.35 ? "o" : " ";
      }
      // inner fill reads as needles
      for (let dx = -w + 1; dx < w; dx++) if (dx && x + dx >= 0 && x + dx < W) g[y][x + dx] = r() < 0.25 ? "." : " ";
    }
    g[base][x] = "|";
  }
  // snow on the ground
  for (let c = 0; c < W; c++) g[H - 1][c] = r() < 0.15 ? "." : "_";
  return g.map((row) => row.join(""));
}

export default function Forest() {
  const reduced = useReducedMotionLive();
  const [seed, setSeed] = useState(() => newSeed());
  const [grown, setGrown] = useState(0);
  const shown = reduced ? H : grown; // reduced motion: the whole forest, at once
  const rows = grow(seed);

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setGrown(i);
      if (i >= H) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [seed, reduced]);

  return (
    <div className="adv-toy">
      <pre className="adv-field adv-art" role="img" aria-label="an ascii pine forest under the stars">
        {rows.map((r, i) => (i >= H - shown ? r : " ".repeat(W))).join("\n")}
      </pre>
      <div className="adv-toy-bar">
        <button type="button" className="adv-btn" onClick={() => {
            setGrown(0);
            setSeed(newSeed());
          }}>
          regrow
        </button>
        <span className="adv-dim">seed {seedLabel(seed)}</span>
      </div>
    </div>
  );
}
