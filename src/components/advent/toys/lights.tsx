"use client";

import "./toys.css";
import { Fragment, useEffect, useState } from "react";
import { useReducedMotionLive } from "@/lib/reduced-motion";

// door 22: ascii string lights, three strands sagging across. pick a pattern, or click a
// bulb to flick it. In reduced motion the bulbs hold still (patterns pick which are lit).

const W = 34;
const STRANDS = [
  { top: 0, sag: 2, offset: 0 },
  { top: 3, sag: 2, offset: 1 },
  { top: 6, sag: 2, offset: 2 },
];
const H = 9;
type Cell = { ch: string; bulb?: number };

// three sagging strands; every third point on the wire is a bulb
function layout(): { grid: Cell[][]; bulbs: number } {
  const grid: Cell[][] = Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: " " })));
  let b = 0;
  for (const s of STRANDS) {
    const ys = Array.from({ length: W }, (_, x) => {
      const u = (x - (W - 1) / 2) / ((W - 1) / 2);
      return s.top + Math.round(s.sag * (1 - u * u));
    });
    for (let x = 0; x < W; x++) {
      const y = ys[x];
      const prev = ys[x - 1] ?? y;
      const next = ys[x + 1] ?? y;
      if ((x + s.offset) % 3 === 1) grid[y][x] = { ch: "o", bulb: b++ };
      else grid[y][x] = { ch: next > y ? "." : prev > y ? "." : prev < y || next < y ? "'" : "-" };
    }
  }
  return { grid, bulbs: b };
}

const { grid, bulbs: BULBS } = layout();
const PATTERNS = ["chase", "twinkle", "alternate", "steady"] as const;
type Pattern = (typeof PATTERNS)[number];

function lit(p: Pattern, i: number, t: number, reduced: boolean): boolean {
  if (p === "steady") return true;
  if (p === "alternate") return (i + (reduced ? 0 : t)) % 2 === 0;
  if (p === "chase") return reduced ? i % 3 !== 0 : ((i - t) % 4 + 4) % 4 !== 0;
  // twinkle: each bulb on its own slow clock
  return reduced ? i % 4 !== 2 : Math.sin(t * 0.9 + i * 2.3) > -0.2;
}

export default function Lights() {
  const reduced = useReducedMotionLive();
  const [p, setP] = useState<Pattern>("chase");
  const [t, setT] = useState(0);
  const [off, setOff] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setT((x) => x + 1), p === "twinkle" ? 260 : 380);
    return () => clearInterval(id);
  }, [reduced, p]);

  return (
    <div className="adv-toy adv-lights">
      <pre className="adv-field adv-art" aria-label={`string lights, ${p}`}>
        {grid.map((row, y) => (
          <Fragment key={y}>
            {row.map((c, x) =>
              c.bulb === undefined ? (
                <span key={x} className="adv-wire">
                  {c.ch}
                </span>
              ) : (
                <button
                  key={x}
                  type="button"
                  className={`adv-bulb adv-b${c.bulb % 3}${lit(p, c.bulb, t, reduced) && !off.has(c.bulb) ? " on" : ""}`}
                  aria-label={`bulb ${c.bulb + 1}${off.has(c.bulb) ? ", off" : ""}`}
                  onClick={() =>
                    setOff((s) => {
                      const n = new Set(s);
                      if (n.has(c.bulb!)) n.delete(c.bulb!);
                      else n.add(c.bulb!);
                      return n;
                    })
                  }
                >
                  o
                </button>
              )
            )}
            {"\n"}
          </Fragment>
        ))}
      </pre>
      <div className="adv-toy-bar adv-chips" role="group" aria-label="pattern">
        {PATTERNS.map((x) => (
          <button key={x} type="button" className={`adv-chip${x === p ? " on" : ""}`} aria-pressed={x === p} onClick={() => setP(x)}>
            {x}
          </button>
        ))}
        <span className="adv-dim">{BULBS - off.size} of {BULBS} bulbs</span>
      </div>
    </div>
  );
}
