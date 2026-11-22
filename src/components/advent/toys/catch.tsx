"use client";

import "./toys.css";
import { useCallback, useEffect, useRef, useState } from "react";

// door 5: catch the snow. 20 seconds; flakes on tofu's head score, golden ones score 3.
// ← → or a,d to move; on touch, drag or tap the side you want.

const W = 23;
const H = 11;
const SECONDS = 20;
const BEST = "p54:advent:catch";
const TOFU = [" n_n ", "(o.o)"]; // 5 wide, the top row catches
type Flake = { x: number; y: number; gold: boolean };

// copy[i] is tofu's verdict for a score below CUTS[i] (the last one: anything above)
const CUTS = [1, 8, 16, 26];
const verdict = (copy: string[], score: number) => copy[Math.min(copy.length - 1, CUTS.filter((c) => score >= c).length)] ?? "";

export default function Catch({ copy = [] }: { copy?: string[] }) {
  const [state, setState] = useState<"idle" | "play" | "done">("idle");
  const [x, setX] = useState(Math.floor((W - 5) / 2));
  const [flakes, setFlakes] = useState<Flake[]>([]);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem(BEST)) || 0;
    } catch {
      return 0;
    }
  });
  const xRef = useRef(x);
  const scoreRef = useRef(0);
  useEffect(() => {
    xRef.current = x;
  }, [x]);
  const flakesRef = useRef<Flake[]>([]);
  const field = useRef<HTMLPreElement>(null);

  const move = useCallback((dx: number) => setX((v) => Math.max(0, Math.min(W - 5, v + dx))), []);

  const start = () => {
    flakesRef.current = [];
    scoreRef.current = 0;
    setFlakes([]);
    setScore(0);
    setLeft(SECONDS);
    setState("play");
    field.current?.focus();
  };

  useEffect(() => {
    if (state !== "play") return;
    const started = Date.now();
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      const t = (Date.now() - started) / 1000;
      setLeft(Math.max(0, Math.ceil(SECONDS - t)));
      if (t >= SECONDS) {
        const final = scoreRef.current;
        setState("done");
        setBest((b) => Math.max(b, final));
        try {
          if (final > (Number(localStorage.getItem(BEST)) || 0)) localStorage.setItem(BEST, String(final));
        } catch {
          /* no storage */
        }
        return;
      }
      let caught = 0;
      const next: Flake[] = [];
      for (const f of flakesRef.current) {
        const y = f.y + 1;
        const tx = xRef.current;
        if (y === H - 3 && f.x >= tx && f.x < tx + 5) caught += f.gold ? 3 : 1;
        else if (y < H) next.push({ ...f, y });
      }
      // more snow as the clock runs down
      const spawn = tick % 2 === 0 || t > 12 ? 1 + (t > 15 && Math.random() < 0.5 ? 1 : 0) : 0;
      for (let i = 0; i < spawn; i++) next.push({ x: Math.floor(Math.random() * W), y: 0, gold: Math.random() < 0.08 });
      flakesRef.current = next;
      setFlakes(next);
      if (caught) {
        scoreRef.current += caught;
        setScore(scoreRef.current);
      }
    }, 140);
    return () => clearInterval(id);
  }, [state]);

  const onKey = (e: React.KeyboardEvent) => {
    if (state !== "play") {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        start();
      }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return; // browser shortcuts stay the browser's
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") move(-1);
    else if (k === "arrowright" || k === "d") move(1);
    // mid-game, every other letter stays here too: the site shell opens on any typed key
    else if (k.length !== 1 && k !== "arrowup" && k !== "arrowdown") return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onPointer = (e: React.PointerEvent) => {
    if (state !== "play" || !field.current) return;
    const r = field.current.getBoundingClientRect();
    const col = Math.floor(((e.clientX - r.left) / r.width) * W);
    setX(Math.max(0, Math.min(W - 5, col - 2)));
  };

  const rows: string[] = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let c = 0; c < W; c++) {
      const f = flakes.find((f) => f.x === c && f.y === y);
      row += f ? (f.gold ? "o" : "*") : y === H - 1 ? "_" : " ";
    }
    rows.push(row);
  }
  for (let i = 0; i < 2; i++) {
    const y = H - 3 + i;
    rows[y] = rows[y].slice(0, x) + TOFU[i] + rows[y].slice(x + 5);
  }

  return (
    <div className="adv-toy adv-catch">
      <div className="adv-toy-bar">
        <span>
          score <b>{score}</b>
        </span>
        <span>{state === "play" ? `${left}s` : best ? `best ${best}` : "20s"}</span>
      </div>
      <pre
        ref={field}
        tabIndex={0}
        className="adv-field"
        onKeyDown={onKey}
        onPointerDown={onPointer}
        onPointerMove={(e) => e.buttons && onPointer(e)}
        aria-label={state === "play" ? `catch the snow: ${left} seconds left, score ${score}` : "catch the snow. press enter to start"}
      >
        {rows.join("\n")}
      </pre>
      <p className="adv-toy-line" aria-live="polite">
        {state === "idle" ? "* is 1 point, o is 3." : state === "play" ? "catch!" : `${score} points. ${verdict(copy, score)}`}
      </p>
      {state !== "play" ? (
        <button type="button" className="adv-btn" onClick={start}>
          {state === "idle" ? "start · 20s" : "again"}
        </button>
      ) : null}
    </div>
  );
}
