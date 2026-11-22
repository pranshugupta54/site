"use client";

import "./toys.css";
import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { doorPath } from "@/lib/advent";
import type { DoorTile } from "@/lib/advent-server";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { useOpened } from "../hooks";

// door 24: the tree. every other door is an ornament on it, lit if this visitor opened
// it. the star lights them all for a moment. then tofu's note (`copy`), unwrapped.

const ROWS = 8;
const PER_ROW = [1, 1, 2, 2, 3, 4, 5, 5]; // 23 ornaments, one per door
const CX = 14;

/** the tree as cells; ornament cells carry the door number they stand for */
function tree(): { ch: string; door?: number }[][] {
  const out: { ch: string; door?: number }[][] = [];
  const W = CX * 2 + 1;
  out.push([...Array(W)].map((_, x) => ({ ch: x === CX ? "*" : " " })));
  let door = 1;
  for (let k = 1; k <= ROWS; k++) {
    const row = [...Array(W)].map(() => ({ ch: " " }) as { ch: string; door?: number });
    row[CX - k] = { ch: "/" };
    row[CX + k] = { ch: "\\" };
    // spread this row's ornaments evenly across its inside
    const inner = 2 * k - 1;
    const count = PER_ROW[k - 1];
    for (let j = 0; j < count; j++) {
      const x = CX - k + 1 + Math.round(((j + 0.5) * inner) / count - 0.5);
      row[x] = { ch: "o", door: door++ };
    }
    out.push(row);
  }
  const trunk = [...Array(W)].map(() => ({ ch: " " }));
  trunk[CX - 1] = { ch: "|" };
  trunk[CX + 1] = { ch: "|" };
  trunk[CX] = { ch: "_" };
  out.push(trunk);
  return out;
}
const TREE = tree();

export default function Finale({ ornaments = [], copy: NOTE = [] }: { ornaments?: DoorTile[]; copy?: string[] }) {
  const reduced = useReducedMotionLive();
  const { opened } = useOpened();
  const [hover, setHover] = useState<number | null>(null);
  const [glow, setGlow] = useState(false);
  const [note, setNote] = useState(false);
  const [typed, setTyped] = useState(0);
  const total = NOTE.join("\n").length;
  const byN = new Map(ornaments.map((o) => [o.n, o]));
  const count = [...opened].filter((n) => n !== 24).length;

  useEffect(() => {
    if (!glow) return;
    const id = setTimeout(() => setGlow(false), 2400);
    return () => clearTimeout(id);
  }, [glow]);

  useEffect(() => {
    if (!note || reduced) return;
    const id = setInterval(() => setTyped((t) => (t >= total ? (clearInterval(id), t) : t + 3)), 18);
    return () => clearInterval(id);
  }, [note, reduced, total]);

  const shown = reduced ? total : typed;
  // where each paragraph starts in the typed-out text (+1 for the line break)
  const starts = NOTE.map((_, i) => NOTE.slice(0, i).reduce((a, p) => a + p.length + 1, 0));
  return (
    <div className="adv-toy adv-finale">
      <div className="adv-scene">
        <pre className="adv-art adv-tree" aria-label={`a tree with ${count} of 23 ornaments lit`}>
          {TREE.map((row, y) => (
            <Fragment key={y}>
              {row.map((c, x) =>
                y === 0 && c.ch === "*" ? (
                  <button key={x} type="button" className={`adv-star${glow ? " on" : ""}`} aria-label="light every ornament" onClick={() => setGlow(true)}>
                    *
                  </button>
                ) : c.door ? (
                  <span
                    key={x}
                    className={`adv-orn${opened.has(c.door) || glow ? " on" : ""}${hover === c.door ? " hi" : ""}${glow && !reduced ? " tw" : ""}`}
                    style={glow && !reduced ? { animationDelay: `${(c.door * 97) % 600}ms` } : undefined}
                  >
                    o
                  </span>
                ) : (
                  <span key={x} className={c.ch === " " ? undefined : "adv-wire"}>
                    {c.ch}
                  </span>
                )
              )}
              {"\n"}
            </Fragment>
          ))}
        </pre>
        <pre className="adv-art adv-gifts" aria-hidden>
          {["   n_o_n    ", "  .-----.   ", "  |^ w ^| []", "  '-----'[##]"].join("\n")}
        </pre>
      </div>

      <p className="adv-toy-line">
        {count === 0
          ? "no ornaments lit yet. every door you open on the calendar hangs one here."
          : count >= 23
            ? "all 23 doors, all on the tree. you found every one. tofu is a little emotional."
            : `you opened ${count} of 23 doors. each one is up there, lit. the rest are still on the calendar.`}
      </p>

      <ol className="adv-orns" aria-label="ornaments">
        {Array.from({ length: 23 }, (_, i) => i + 1).map((n) => {
          const o = byN.get(n);
          const on = opened.has(n);
          return (
            <li key={n}>
              <Link
                href={doorPath(n)}
                className={`adv-orn-chip${on ? " on" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                title={o && o.state === "open" ? `door ${n}: ${o.title}` : `door ${n}`}
              >
                <span className="adv-dim">{n}</span> {o && o.state === "open" ? o.glyph : "o"}
              </Link>
            </li>
          );
        })}
      </ol>

      {note ? (
        <div className="adv-note" aria-live="polite">
          {NOTE.map((p, i) => (
            <p key={i}>{p.slice(0, Math.max(0, shown - starts[i])) || "\u00a0"}</p>
          ))}
        </div>
      ) : (
        <button type="button" className="adv-btn" onClick={() => setNote(true)}>
          unwrap tofu&apos;s note [##]
        </button>
      )}
    </div>
  );
}
