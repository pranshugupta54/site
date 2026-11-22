"use client";

import "./toys.css";
import { useEffect, useState } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { newSeed, rng, seedLabel } from "./rng";

// door 14: 10 PRINT. a slash or a backslash, a coin flip each, typed out like the
// original (instantly in reduced motion). click for another maze.

const W = 34;
const H = 12;

export default function Maze() {
  const reduced = useReducedMotionLive();
  const [seed, setSeed] = useState(() => newSeed());
  const [typed, setTyped] = useState(0);
  const n = reduced ? W * H : typed; // reduced motion: the whole maze, at once
  const r = rng(seed);
  const all = Array.from({ length: W * H }, () => (r() < 0.5 ? "/" : "\\"));

  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(W * H, i + 9);
      setTyped(i);
      if (i >= W * H) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [seed, reduced]);

  const rows: string[] = [];
  for (let y = 0; y < H; y++) rows.push(all.slice(y * W, y * W + W).map((c, x) => (y * W + x < n ? c : " ")).join(""));

  return (
    <div className="adv-toy">
      <button type="button" className="adv-field-btn" onClick={() => {
          setTyped(0);
          setSeed(newSeed());
        }} aria-label="draw a new maze">
        <pre className="adv-field adv-art adv-maze" aria-hidden>
          {rows.join("\n")}
        </pre>
      </button>
      <div className="adv-toy-bar">
        <span className="adv-dim">10 PRINT CHR$(205.5+RND(1)); : GOTO 10</span>
        <span className="adv-dim">{seedLabel(seed)}</span>
      </div>
    </div>
  );
}
