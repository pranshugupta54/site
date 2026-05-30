"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/providers";
import { SITE } from "@/lib/site";

// ─── types ───────────────────────────────────────────────────────────────────

type OutputLine = {
  id: number;
  type: "cmd" | "res" | "ok" | "warn" | "html" | "game";
  text: string;
};

// ─── constants ───────────────────────────────────────────────────────────────

const SNAKE_W = 34;
const SNAKE_H = 12;
const CHIPS = ["help", "projects", "gh", "snake", "theme"];

const MIN_H = 200;
const DEFAULT_H = 440;

// terminal palette — intentionally a dark terminal overlay regardless of skin
const BG = "rgb(15,18,17)";
const FG = "rgb(207,214,209)";
const MUTED = "rgb(120,128,122)";
const LINE = "rgb(38,44,42)";
const DIM = "rgb(24,28,26)";
const GREEN = "#3ecf8e";
const ORANGE = "#ff7a18";

// ─── snake renderer ──────────────────────────────────────────────────────────

type SnakeState = {
  snake: { x: number; y: number }[];
  food: { x: number; y: number };
  score: number;
  dead: boolean;
};

function renderSnake(state: SnakeState): string {
  let s = "";
  for (let y = 0; y < SNAKE_H; y++) {
    for (let x = 0; x < SNAKE_W; x++) {
      const isSnake = state.snake.some((p) => p.x === x && p.y === y);
      const isFood = state.food.x === x && state.food.y === y;
      s += isSnake ? "█" : isFood ? "◆" : "·";
    }
    s += "\n";
  }
  return s;
}

// ─── main component ──────────────────────────────────────────────────────────

export function FooterShell() {
  const { toggleTheme, cycleSkin, theme } = useAppearance();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(DEFAULT_H);
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [, setHistoryIdx] = useState(-1);

  const [snakeOn, setSnakeOn] = useState(false);
  const snakeRef = useRef<{ quit: () => void } | null>(null);
  const lineCounter = useRef(0);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  // ── cleanup snake on unmount ──
  useEffect(() => () => snakeRef.current?.quit(), []);

  // ── scroll output to bottom on new line ──
  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [lines]);

  // ── drag-to-resize ──
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const h = window.innerHeight - e.clientY;
      setHeight(Math.max(MIN_H, Math.min(window.innerHeight * 0.92, h)));
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const addLine = useCallback((type: OutputLine["type"], text: string): number => {
    const id = ++lineCounter.current;
    setLines((prev) => [...prev, { id, type, text }]);
    return id;
  }, []);

  const updateLine = useCallback((id: number, text: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  }, []);

  const doOpen = useCallback((v: boolean) => {
    setOpen(v);
    if (v) setTimeout(() => inputRef.current?.focus(), 130);
  }, []);

  // ── boot message (once) ──
  useEffect(() => {
    addLine("ok", `pranshu.sh v${SITE.version} — type 'help' to start.`);
  }, [addLine]);

  // ── global keys: "/" opens, Esc closes ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (snakeOn) return;
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !open && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        doOpen(true);
      } else if (e.key === "Escape" && open) {
        doOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, snakeOn, doOpen]);

  // ── snake ──
  const startSnake = useCallback(() => {
    setSnakeOn(true);
    const rnd = () => ({ x: Math.floor(Math.random() * SNAKE_W), y: Math.floor(Math.random() * SNAKE_H) });
    const ref = {
      state: { snake: [{ x: 8, y: 6 }], food: rnd(), score: 0, dead: false } as SnakeState,
      dir: { x: 1, y: 0 },
      loop: null as ReturnType<typeof setInterval> | null,
      lineId: -1,
      quit: () => {},
    };

    const instructId = addLine("res", "arrows / WASD to move · q or esc to quit");
    ref.lineId = addLine("game", renderSnake(ref.state));

    const draw = () => {
      const s = ref.state;
      const footer = s.dead
        ? `\ncommits eaten: ${s.score}   GAME OVER — press enter to restart`
        : `\ncommits eaten: ${s.score}`;
      updateLine(ref.lineId, renderSnake(s) + footer);
    };

    const key = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((k === "arrowup" || k === "w") && ref.dir.y === 0) ref.dir = { x: 0, y: -1 };
      else if ((k === "arrowdown" || k === "s") && ref.dir.y === 0) ref.dir = { x: 0, y: 1 };
      else if ((k === "arrowleft" || k === "a") && ref.dir.x === 0) ref.dir = { x: -1, y: 0 };
      else if ((k === "arrowright" || k === "d") && ref.dir.x === 0) ref.dir = { x: 1, y: 0 };
      else if (k === "enter" && ref.state.dead) {
        ref.state = { snake: [{ x: 8, y: 6 }], food: rnd(), score: 0, dead: false };
        ref.dir = { x: 1, y: 0 };
        draw();
        return;
      } else if (k === "q" || k === "escape") {
        ref.quit();
        return;
      }
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    };

    ref.quit = () => {
      if (ref.loop) clearInterval(ref.loop);
      window.removeEventListener("keydown", key);
      setSnakeOn(false);
      try {
        const hi = Math.max(ref.state.score, parseInt(localStorage.getItem("snakeHi") || "0", 10));
        localStorage.setItem("snakeHi", String(hi));
      } catch { /* ignore */ }
      setLines((prev) => prev.filter((l) => l.id !== instructId));
      addLine("ok", "← back to shell");
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    ref.loop = setInterval(() => {
      const s = ref.state;
      if (s.dead) return;
      const head = {
        x: (s.snake[0].x + ref.dir.x + SNAKE_W) % SNAKE_W,
        y: (s.snake[0].y + ref.dir.y + SNAKE_H) % SNAKE_H,
      };
      if (s.snake.some((p) => p.x === head.x && p.y === head.y)) {
        ref.state = { ...s, dead: true };
        draw();
        return;
      }
      const snake = [head, ...s.snake];
      let food = s.food;
      let score = s.score;
      if (head.x === s.food.x && head.y === s.food.y) {
        score++;
        food = rnd();
      } else snake.pop();
      ref.state = { snake, food, score, dead: false };
      draw();
    }, 110);

    window.addEventListener("keydown", key);
    snakeRef.current = ref;
    draw();
  }, [addLine, updateLine]);

  // ── commands ──
  const exec = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      setHistory((prev) => [trimmed, ...prev]);
      setHistoryIdx(-1);
      addLine("cmd", trimmed);
      const [cmd, ...args] = trimmed.split(/\s+/);

      switch (cmd.toLowerCase()) {
        case "help":
          addLine(
            "res",
            `commands:
  about · projects · writing · gh
  snake      play snake on my commits
  theme      toggle light / dark
  skin       cycle editorial → mono → serif
  funfact    a fun fact
  goto <x>   github · x · email
  clock · clear · cowsay <msg> · sudo`
          );
          break;
        case "about":
          addLine("res", SITE.bio);
          addLine("res", `${SITE.role} — building systems that feel inevitable.`);
          break;
        case "projects":
          addLine("res", SITE.projects.map((p) => `  ${p.name.padEnd(14)} — ${p.blurb}`).join("\n"));
          break;
        case "writing":
          addLine("res", "worklog + notes → /log");
          break;
        case "gh":
          addLine("res", "live github stats are up on the page → " + SITE.socials.github.url);
          break;
        case "funfact":
          addLine("res", SITE.funFact);
          break;
        case "clock":
          addLine("res", new Date().toLocaleTimeString("en-GB", { timeZone: SITE.timezone, hour12: false }) + " IST");
          break;
        case "clear":
          setLines([]);
          break;
        case "goto": {
          const t = args[0]?.toLowerCase();
          const map: Record<string, string> = {
            github: SITE.socials.github.url,
            x: SITE.socials.x.url,
            email: `mailto:${SITE.email}`,
          };
          if (t && map[t]) {
            addLine("ok", `→ opening ${map[t]} …`);
            setTimeout(() => window.open(map[t], "_blank"), 350);
          } else addLine("warn", "usage: goto github|x|email");
          break;
        }
        case "theme":
          toggleTheme();
          addLine("ok", `theme → ${theme === "dark" ? "light" : "dark"}`);
          break;
        case "skin":
          cycleSkin();
          addLine("ok", "skin cycled");
          break;
        case "sudo":
          addLine("warn", "nice try. you don't have root here 😏");
          break;
        case "cowsay": {
          const m = args.join(" ") || "build cool";
          const bar = "_".repeat(m.length + 2);
          addLine("res", ` ${bar}\n< ${m} >\n ${"-".repeat(m.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`);
          break;
        }
        case "snake":
          startSnake();
          break;
        default:
          addLine("warn", `command not found: ${cmd} — try 'help'`);
      }
    },
    [addLine, startSnake, toggleTheme, cycleSkin, theme]
  );

  const onInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const v = input.trim();
        setInput("");
        if (v) exec(v);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistoryIdx((prev) => {
          const next = Math.min(prev + 1, history.length - 1);
          setInput(history[next] ?? "");
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistoryIdx((prev) => {
          const next = Math.max(prev - 1, -1);
          setInput(next === -1 ? "" : history[next] ?? "");
          return next;
        });
      }
    },
    [input, exec, history]
  );

  // ── render one output line ──
  const renderLine = (l: OutputLine) => {
    const base: React.CSSProperties = {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      lineHeight: 1.55,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      margin: "1px 0",
    };
    if (l.type === "cmd")
      return (
        <div key={l.id} style={base}>
          <span style={{ color: GREEN }}>❯</span> <span style={{ color: FG }}>{l.text}</span>
        </div>
      );
    if (l.type === "ok") return <div key={l.id} style={{ ...base, color: GREEN }}>{l.text}</div>;
    if (l.type === "warn") return <div key={l.id} style={{ ...base, color: ORANGE }}>{l.text}</div>;
    if (l.type === "game") {
      const parts = l.text.split("◆");
      return (
        <pre key={l.id} style={{ ...base, lineHeight: 1.05, letterSpacing: 1, margin: "6px 0", color: FG }}>
          {parts.map((p, i) => (
            <span key={i}>
              <span style={{ color: GREEN }}>{p}</span>
              {i < parts.length - 1 && <span style={{ color: FG }}>◆</span>}
            </span>
          ))}
        </pre>
      );
    }
    return <div key={l.id} style={{ ...base, color: MUTED }}>{l.text}</div>;
  };

  const btn: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: MUTED,
    padding: 0,
  };

  return (
    <>
      {/* collapsed bar */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Open terminal shell"
        onClick={() => doOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            doOpen(true);
          }
        }}
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40, height: 40,
          background: BG, color: FG, borderTop: `1px solid ${LINE}`,
          display: "flex", alignItems: "center", gap: 10, padding: "0 16px", cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 13,
          opacity: open ? 0 : 1, pointerEvents: open ? "none" : "auto",
          transition: "opacity 0.18s ease", userSelect: "none",
        }}
      >
        <span style={{ color: GREEN }}>~/pranshu ❯</span>
        <span style={{ color: MUTED }}>type &apos;help&apos;</span>
        <span style={{ color: FG }} aria-hidden className="animate-[blink_1s_steps(1)_infinite]">▋</span>
        <span style={{ marginLeft: "auto", color: MUTED, fontSize: 11 }}>press / to open</span>
      </div>

      {/* expanded panel */}
      <div
        aria-label="Terminal shell"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          background: BG, color: FG, borderTop: `1px solid ${LINE}`,
          height: open ? height : 0, overflow: "hidden",
          transition: dragging.current ? "none" : "height 0.26s cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: "0 -30px 60px -30px rgba(0,0,0,0.5)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {/* drag handle */}
        <div
          onMouseDown={() => {
            dragging.current = true;
            document.body.style.userSelect = "none";
          }}
          title="drag to resize"
          style={{
            height: 12, cursor: "ns-resize", display: "flex", alignItems: "center",
            justifyContent: "center", borderBottom: `1px solid ${LINE}`,
          }}
        >
          <span style={{ width: 36, height: 3, borderRadius: 2, background: LINE }} />
        </div>

        <div style={{ height: "calc(100% - 12px)", maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", padding: "0 16px" }}>
          {/* slim header */}
          <div style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${LINE}`, fontSize: 12 }}>
            <span style={{ color: GREEN }}>~/pranshu</span>
            <span style={{ color: MUTED, marginLeft: 8 }}>shell</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
              <button style={btn} onClick={() => setLines([])}>clear</button>
              <button
                style={{ ...btn, color: FG }}
                onClick={() => doOpen(false)}
                aria-label="Close terminal"
              >
                ✕ close <span style={{ color: MUTED }}>(esc)</span>
              </button>
            </div>
          </div>

          {/* output — the dominant region */}
          <div ref={outRef} style={{ flex: 1, overflowY: "auto", padding: "10px 0", minHeight: 0 }}>
            {lines.map(renderLine)}
          </div>

          {/* input + chips */}
          <div style={{ borderTop: `1px solid ${LINE}`, padding: "10px 0 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: DIM, border: `1px solid ${LINE}`, borderRadius: 8, padding: "9px 12px" }}>
              <span style={{ color: GREEN }}>❯</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKey}
                autoComplete="off"
                spellCheck={false}
                placeholder="type a command…"
                aria-label="Terminal input"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: FG, fontFamily: "var(--font-mono)", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              {CHIPS.map((c) => (
                <button
                  key={c}
                  onClick={() => { inputRef.current?.focus(); exec(c); }}
                  style={{ border: `1px solid ${LINE}`, color: MUTED, borderRadius: 6, padding: "3px 9px", fontSize: 12, cursor: "pointer", background: "none", fontFamily: "var(--font-mono)" }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        .animate-\\[blink_1s_steps\\(1\\)_infinite\\] { animation: blink 1s steps(1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[blink_1s_steps\\(1\\)_infinite\\] { animation: none; }
        }
      `}</style>
    </>
  );
}
