"use client";

import "./toys.css";
import { useEffect, useRef, useState } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";

// door 11: a snow globe with tofu inside. click to shake; the snow drifts down and
// settles on tofu and the floor. In reduced motion a shake just lands the snow.

const GLOBE = [
  "     .-'''''''-.     ",
  "   .'           '.   ",
  "  /               \\  ",
  " |                 | ",
  " |                 | ",
  " |                 | ",
  " |       n_n       | ",
  " |      (o.o)      | ",
  "  \\_______________/  ",
  "    [___________]    ",
];
const W = GLOBE[0].length;
const COUNT = 30;
type F = { x: number; y: number; vy: number; ph: number; still: boolean };

// a cell snow can occupy: inside the glass and not part of tofu
const inside = (x: number, y: number) => {
  const row = GLOBE[y];
  if (!row || x < 0 || x >= W || row[x] !== " ") return false;
  const l = row.search(/[^ ]/);
  const r = row.length - 1 - [...row].reverse().join("").search(/[^ ]/);
  return y > 0 && x > l && x < r;
};

function scatter(): F[] {
  const fs: F[] = [];
  while (fs.length < COUNT) {
    const x = Math.floor(Math.random() * W);
    const y = 1 + Math.floor(Math.random() * 5);
    if (inside(x, y)) fs.push({ x, y, vy: 0.18 + Math.random() * 0.3, ph: Math.random() * 6, still: false });
  }
  return fs;
}

/** where a flake comes to rest below (x, y): on the floor, on tofu, or on settled snow */
function landing(fs: F[], x: number, y: number): number {
  let yy = Math.floor(y);
  while (inside(x, yy + 1) && !fs.some((f) => f.still && f.x === x && f.y === yy + 1)) yy++;
  return yy;
}

/** fresh snow: in the air, or (reduced motion) already landed */
function snow(reduced: boolean): F[] {
  const fs = scatter();
  if (!reduced) return fs;
  const settled: F[] = [];
  for (const f of fs) settled.push({ ...f, y: landing(settled, f.x, f.y), still: true });
  return settled;
}

export default function Globe() {
  const reduced = useReducedMotionLive();
  const [flakes, setFlakes] = useState<F[]>(() => snow(reduced));
  const [shaking, setShaking] = useState(false);
  const ref = useRef<F[]>(flakes);

  const shake = () => {
    const fs = snow(reduced);
    if (!reduced) {
      setShaking(true);
      setTimeout(() => setShaking(false), 420);
    }
    ref.current = fs;
    setFlakes(fs);
  };

  useEffect(() => {
    if (reduced) return;
    let t = 0;
    const id = setInterval(() => {
      t++;
      let moving = false;
      const fs = ref.current.map((f) => ({ ...f }));
      for (const f of fs) {
        if (f.still) continue;
        moving = true;
        const ny = f.y + f.vy;
        const drift = Math.round(Math.sin(t / 4 + f.ph) * 0.6);
        const nx = inside(f.x + drift, Math.floor(ny)) ? f.x + drift : f.x;
        const floor = landing(fs, nx, f.y);
        if (ny >= floor) Object.assign(f, { x: nx, y: floor, still: true });
        else Object.assign(f, { x: nx, y: ny });
      }
      if (moving) {
        ref.current = fs;
        setFlakes(fs);
      }
    }, 90);
    return () => clearInterval(id);
  }, [reduced]);

  const grid = GLOBE.map((r) => [...r]);
  for (const f of flakes) {
    const y = Math.floor(f.y);
    if (grid[y]?.[f.x] === " ") grid[y][f.x] = f.still ? "." : "*";
  }

  return (
    <div className="adv-toy adv-globe">
      <button type="button" className={`adv-field-btn${shaking ? " adv-shake" : ""}`} onClick={shake} aria-label="shake the snow globe">
        <pre className="adv-art" aria-hidden>
          {grid.map((r) => r.join("")).join("\n")}
        </pre>
      </button>
      <p className="adv-toy-line adv-dim">click to shake</p>
    </div>
  );
}
