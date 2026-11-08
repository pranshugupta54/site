"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/providers";
import { SITE, projectBlurb } from "@/lib/site";
import { resumeLines } from "@/lib/resume";
import funfacts from "@/data/funfacts.json";
import { SEASONS } from "@/data/seasons";
import { CURRENT, RENOVATION } from "@/lib/versions";
import {
  GAUGES,
  HERTZ_INSTALL,
  HERTZ_REPO,
  SKILLS_INSTALL,
  eggRunner,
  hertzReadout,
  matchEgg,
  oneSkillLine,
  type Egg,
} from "@/lib/shell-eggs";
import { helpText, shellCommands } from "@/lib/shell-commands";

// The shell's command engine — output lines, history, commands, eggs, snake.
// Shared by the footer shell and p54 os's terminal app; each host owns only
// its chrome (open/close, sizing, global keys).

// ─── types ───────────────────────────────────────────────────────────────────

export type OutputLine = {
  id: number;
  type: "cmd" | "res" | "ok" | "warn" | "html" | "game";
  text: string;
};

export type ShellIO = {
  addLine: (type: OutputLine["type"], text: string) => number;
};

export type ShellEngineOptions = {
  /** the `tofu` command: take the visitor to tofu */
  onTofu: () => void;
  /** the `os` command: boot p54 os. Hosts already inside it leave this out. */
  onOs?: () => void;
  /** host-specific commands, tried before the built-ins; return true when handled */
  extra?: (cmd: string, args: string[], io: ShellIO) => boolean;
  /** appended to `help` */
  helpExtra?: string;
};

// ─── constants ───────────────────────────────────────────────────────────────

const SNAKE_W = 34;
const SNAKE_H = 12;

// window.open skips next's basePath, so archived builds (/v/<n>/) prefix it themselves
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const RESUME = BASE_PATH ? `${BASE_PATH}/resume/` : "/resume";

// terminal palette — intentionally a dark terminal overlay regardless of skin
export const TERM = {
  BG: "rgb(15,18,17)",
  FG: "rgb(207,214,209)",
  MUTED: "rgb(120,128,122)",
  LINE: "rgb(38,44,42)",
  DIM: "rgb(24,28,26)",
  GREEN: "#3ecf8e",
  ORANGE: "#ff7a18",
} as const;

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

// ─── engine ──────────────────────────────────────────────────────────────────

export function useShellEngine({ onTofu, onOs, extra, helpExtra }: ShellEngineOptions) {
  const { toggleTheme, cycleSkin, theme, season, setSeason } = useAppearance();
  const [input, setInput] = useState("");
  // boot message: initial state, not an effect, so it shows exactly once
  const [lines, setLines] = useState<OutputLine[]>(() => [
    { id: 0, type: "ok", text: `pranshu.sh v${CURRENT.version} — type 'help' to start.` },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [, setHistoryIdx] = useState(-1);

  const [snakeOn, setSnakeOn] = useState(false);
  const snakeRef = useRef<{ quit: (refocus?: boolean) => void } | null>(null);
  const lineCounter = useRef(0);
  const outRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [eggs] = useState(eggRunner); // gauge timer + pending fetch for the hidden eggs

  // ── cleanup snake + eggs on unmount ──
  useEffect(() => () => snakeRef.current?.quit(false), []);
  useEffect(() => () => eggs.cancel(), [eggs]);

  // ── scroll output to bottom on new line ──
  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [lines]);

  const addLine = useCallback((type: OutputLine["type"], text: string): number => {
    const id = ++lineCounter.current;
    setLines((prev) => [...prev, { id, type, text }]);
    return id;
  }, []);

  const updateLine = useCallback((id: number, text: string) => {
    // a line that's gone (cleared) leaves state untouched, so nothing re-renders or re-scrolls
    setLines((prev) => (prev.some((l) => l.id === id) ? prev.map((l) => (l.id === id ? { ...l, text } : l)) : prev));
  }, []);

  // ── snake ──
  const startSnake = useCallback(() => {
    setSnakeOn(true);
    const rnd = () => ({ x: Math.floor(Math.random() * SNAKE_W), y: Math.floor(Math.random() * SNAKE_H) });
    const ref = {
      state: { snake: [{ x: 8, y: 6 }], food: rnd(), score: 0, dead: false } as SnakeState,
      dir: { x: 1, y: 0 },
      loop: null as ReturnType<typeof setInterval> | null,
      lineId: -1,
      quit: (() => {}) as (refocus?: boolean) => void,
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

    ref.quit = (refocus = true) => {
      if (snakeRef.current !== ref) return; // already over
      snakeRef.current = null;
      if (ref.loop) clearInterval(ref.loop);
      window.removeEventListener("keydown", key);
      setSnakeOn(false);
      try {
        const hi = Math.max(ref.state.score, parseInt(localStorage.getItem("snakeHi") || "0", 10));
        localStorage.setItem("snakeHi", String(hi));
      } catch { /* ignore */ }
      setLines((prev) => prev.filter((l) => l.id !== instructId));
      addLine("ok", "← back to shell");
      if (refocus) setTimeout(() => inputRef.current?.focus(), 50);
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

  // ── hidden eggs (not in help) ──
  const runEgg = useCallback(
    (egg: Egg) => {
      eggs.cancel(true); // a rerun settles the last gauge and drops its pending fetch
      if (egg === "hertz") {
        addLine("res", "hertz is a cask. the real line:");
        addLine("ok", HERTZ_INSTALL);
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const id = addLine("res", still ? hertzReadout() : hertzReadout(GAUGES.map(() => 0)));
        addLine("res", `real numbers live in the real app →\n${HERTZ_REPO}`);
        if (still) return;
        // gauges fill with a little jitter, then settle on words
        const TICKS = 10;
        eggs.animate(
          TICKS,
          80,
          (tick) => updateLine(id, hertzReadout(GAUGES.map((g) => (g.level * tick) / TICKS + Math.random() * 3 - 1))),
          () => updateLine(id, hertzReadout())
        );
        return;
      }
      addLine("res", egg === "skills-bare" ? "needs a repo. the real line:" : "the real line:");
      addLine("ok", SKILLS_INSTALL);
      addLine("res", "  for any agent that reads a SKILL.md");
      const id = addLine("res", oneSkillLine());
      addLine("res", "  all of them, explained → /skills");
      // a real skill name from the live list; the <name> placeholder if it's unavailable
      fetch("/skills.json")
        .then((r) => (r.ok ? r.json() : []))
        .then(
          eggs.guard((names: string[]) => {
            if (names.length) updateLine(id, oneSkillLine(names[Math.floor(Math.random() * names.length)]));
          })
        )
        .catch(() => {});
    },
    [eggs, addLine, updateLine]
  );

  // ── clear: drops the output and any egg work still writing into it ──
  const clearOutput = useCallback(() => {
    eggs.cancel();
    setLines([]);
  }, [eggs]);

  // ── commands ──
  const exec = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      setHistory((prev) => [trimmed, ...prev]);
      setHistoryIdx(-1);
      addLine("cmd", trimmed);
      const [cmd, ...args] = trimmed.split(/\s+/);

      if (extra?.(cmd.toLowerCase(), args, { addLine })) return;

      switch (cmd.toLowerCase()) {
        case "help":
          addLine("res", helpText(shellCommands(season)) + (helpExtra ? `\n${helpExtra}` : ""));
          break;
        case "about":
          addLine("res", SITE.bio);
          addLine("res", `${SITE.role} — systems that feel inevitable.`);
          break;
        case "projects":
          addLine("res", SITE.projects.map((p) => `  ${p.name.padEnd(14)} — ${projectBlurb(p)}`).join("\n"));
          break;
        case "writing":
          addLine("res", "tofu's room → /tofu · worklog → /log · notes → /notes · reading → /reading");
          break;
        case "tofu":
          // navigate now, not on a timer: a deferred push can't outlive a clear,
          // a newer command or an unmount
          addLine("ok", "→ tofu's room");
          onTofu();
          break;
        case "os":
          if (onOs) {
            addLine("ok", "→ booting p54 os");
            onOs();
          } else addLine("res", "you're already in it.");
          break;
        case "resume":
          if (args[0] === "--pdf") {
            addLine("ok", `→ ${RESUME} · print dialog → save as pdf`);
            setTimeout(() => {
              if (!window.open(`${RESUME}?print=1`, "_blank")) addLine("warn", `popup blocked → open ${RESUME}, then pdf ↓`);
            }, 350);
          } else if (args.length) addLine("warn", "usage: resume [--pdf]");
          else {
            resumeLines().forEach((l) => addLine(l.kind === "head" ? "ok" : "res", l.text));
            addLine("res", "\npdf → resume --pdf");
          }
          break;
        case "gh":
          addLine("res", "live github stats are up on the page → " + SITE.socials.github.url);
          break;
        case "funfact": {
          const local = () => funfacts[Math.floor(Math.random() * funfacts.length)];
          const id = addLine("res", "fetching a tech fact…");
          fetch("https://v2.jokeapi.dev/joke/Programming?type=single&safe-mode")
            .then((r) => r.json())
            .then((j) => updateLine(id, j && !j.error && j.joke ? j.joke : local()))
            .catch(() => updateLine(id, local()));
          break;
        }
        case "clock":
          addLine("res", new Date().toLocaleTimeString("en-GB", { timeZone: SITE.timezone, hour12: false }) + " IST");
          break;
        case "clear":
          clearOutput();
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
        case "season": {
          const want = args[0]?.toLowerCase();
          const names = SEASONS.map((s) => s.id).join(" · ");
          if (!want) {
            addLine("res", season ? `it's ${season.name}. tofu is dressed for it.` : "no season on right now. just regular tofu.");
            addLine("res", `try: season ${names} · off · auto`);
          } else if (want === "off" || want === "auto" || SEASONS.some((s) => s.id === want)) {
            setSeason(want);
            addLine("ok", want === "auto" ? "season → back to the calendar" : `season → ${want} (this tab)`);
          } else addLine("warn", `usage: season ${names}|off|auto`);
          break;
        }
        case "version":
        case "versions":
          addLine("res", `v${CURRENT.version} · ${CURRENT.name} · since ${CURRENT.date}\n${CURRENT.tofu}`);
          if (RENOVATION) addLine("res", `tofu is renovating · peek at v${RENOVATION.version} → ${RENOVATION.href}`);
          addLine("ok", "the whole story → /versions");
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
        default: {
          const hidden = matchEgg(trimmed);
          if (hidden) {
            runEgg(hidden);
            break;
          }
          const egg = season?.commands && Object.hasOwn(season.commands, cmd.toLowerCase())
            ? season.commands[cmd.toLowerCase()]
            : undefined;
          if (typeof egg === "string") addLine("res", egg);
          else addLine("warn", `command not found: ${cmd} — try 'help'`);
        }
      }
    },
    [addLine, updateLine, startSnake, runEgg, clearOutput, toggleTheme, cycleSkin, theme, season, setSeason, onTofu, onOs, extra, helpExtra]
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

  // end a running game without pulling focus back (its window went to the back, say)
  const quitSnake = useCallback(() => snakeRef.current?.quit(false), []);

  return { input, setInput, lines, exec, onInputKey, clearOutput, snakeOn, quitSnake, outRef, inputRef };
}

// ─── one output line ─────────────────────────────────────────────────────────

const LINE_BASE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  margin: "1px 0",
};

export function ShellLine({ line: l }: { line: OutputLine }) {
  const { FG, MUTED, GREEN, ORANGE } = TERM;
  if (l.type === "cmd")
    return (
      <div style={LINE_BASE}>
        <span style={{ color: GREEN }}>❯</span> <span style={{ color: FG }}>{l.text}</span>
      </div>
    );
  if (l.type === "ok") return <div style={{ ...LINE_BASE, color: GREEN }}>{l.text}</div>;
  if (l.type === "warn") return <div style={{ ...LINE_BASE, color: ORANGE }}>{l.text}</div>;
  if (l.type === "game") {
    const parts = l.text.split("◆");
    return (
      <pre style={{ ...LINE_BASE, lineHeight: 1.05, letterSpacing: 1, margin: "6px 0", color: FG }}>
        {parts.map((p, i) => (
          <span key={i}>
            <span style={{ color: GREEN }}>{p}</span>
            {i < parts.length - 1 && <span style={{ color: FG }}>◆</span>}
          </span>
        ))}
      </pre>
    );
  }
  return <div style={{ ...LINE_BASE, color: MUTED }}>{l.text}</div>;
}
