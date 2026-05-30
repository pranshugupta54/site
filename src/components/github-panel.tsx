"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { SITE } from "@/lib/site";

// ─── types ────────────────────────────────────────────────────────────────────

type CellData = { level: 0 | 1 | 2 | 3 | 4; col: number; row: number; idx: number };
type GameState = "idle" | "playing" | "dead";
type Dir = { x: number; y: number };
type Point = { x: number; y: number };

// ─── constants ────────────────────────────────────────────────────────────────

const GRID_COLS = 30;
const GRID_ROWS = 7;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

const SNAKE_W = 30;
const SNAKE_H = 12;

const TICK_MS = 110;

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Seeded pseudo-random (mulberry32) so SSR/client produce same sequence. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateCells(seed: number): CellData[] {
  const rand = mulberry32(seed);
  const cells: CellData[] = [];
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const r = rand();
    const level = r < 0.42 ? 0 : r < 0.65 ? 1 : r < 0.82 ? 2 : r < 0.94 ? 3 : 4;
    cells.push({
      level: level as 0 | 1 | 2 | 3 | 4,
      col: i % GRID_COLS,
      row: Math.floor(i / GRID_COLS),
      idx: i,
    });
  }
  return cells;
}

// ─── cell intensity → CSS opacity on --accent ────────────────────────────────
// Level 0 = var(--card), 1-4 = accent at increasing opacity
const LEVEL_OPACITY = [null, 0.18, 0.38, 0.65, 1.0];

function cellBg(level: CellData["level"]) {
  if (level === 0) return "var(--card)";
  return `color-mix(in srgb, var(--accent) ${Math.round((LEVEL_OPACITY[level] as number) * 100)}%, var(--card))`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function GitHubPanel() {
  const { commitsThisYear, streakDays, topLangs } = SITE.stats;

  // heatmap cells — generated client-side to avoid hydration mismatch
  const [cells, setCells] = useState<CellData[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // snake state
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);

  // snake internals stored in refs so interval closure can read latest without re-render
  const snakeRef = useRef<Point[]>([{ x: 8, y: 6 }]);
  const dirRef = useRef<Dir>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 20, y: 4 });
  const scoreRef = useRef(0);
  const deadRef = useRef(false);
  // Keep hi-score in a ref as well so the interval tick closure always sees the latest value
  const hiScoreRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // rendered snake board — array of rows, each row is a string of chars
  // Initialised as array of empty strings to avoid SSR/client mismatch;
  // the actual board is populated in drawBoard() which is only called client-side.
  const [boardRows, setBoardRows] = useState<string[]>(() =>
    Array.from({ length: SNAKE_H }, () => "·".repeat(SNAKE_W))
  );

  // ── init cells once on mount ──────────────────────────────────────────────
  useEffect(() => {
    // Use a fixed seed based on the year so the pattern is stable across
    // refreshes but still looks organic. Never call Date() at module scope.
    const seed = new Date().getFullYear() * 1000 + 42;
    setCells(generateCells(seed));
  }, []);

  // ── load high score from localStorage ────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem("snakeHi");
      if (stored) {
        const parsed = parseInt(stored, 10);
        setHiScore(parsed);
        hiScoreRef.current = parsed;
      }
    } catch {
      // localStorage unavailable (e.g. private browsing with strict settings)
    }
  }, []);

  // ─── snake helpers ────────────────────────────────────────────────────────

  const rndFood = useCallback((): Point => ({
    x: Math.floor(Math.random() * SNAKE_W),
    y: Math.floor(Math.random() * SNAKE_H),
  }), []);

  const drawBoard = useCallback(() => {
    const snake = snakeRef.current;
    const food = foodRef.current;
    const rows: string[] = [];
    for (let y = 0; y < SNAKE_H; y++) {
      let row = "";
      for (let x = 0; x < SNAKE_W; x++) {
        const isHead = snake[0].x === x && snake[0].y === y;
        const isBody = !isHead && snake.some((p) => p.x === x && p.y === y);
        const isFood = food.x === x && food.y === y;
        if (isHead) row += "█";
        else if (isBody) row += "▓";
        else if (isFood) row += "◆";
        else row += "·";
      }
      rows.push(row);
    }
    setBoardRows(rows);
  }, []);

  const stopGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (keyListenerRef.current) {
      document.removeEventListener("keydown", keyListenerRef.current);
      keyListenerRef.current = null;
    }
  }, []);

  const quitGame = useCallback(() => {
    stopGame();
    setGameState("idle");
    setScore(0);
  }, [stopGame]);

  const startGame = useCallback(() => {
    stopGame();

    // reset state
    snakeRef.current = [{ x: 8, y: 6 }];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 20, y: 4 };
    scoreRef.current = 0;
    deadRef.current = false;

    setScore(0);
    setGameState("playing");
    drawBoard();

    // key handler
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const d = dirRef.current;

      if (k === "arrowup" || k === "w") {
        if (d.y === 0) dirRef.current = { x: 0, y: -1 };
      } else if (k === "arrowdown" || k === "s") {
        if (d.y === 0) dirRef.current = { x: 0, y: 1 };
      } else if (k === "arrowleft" || k === "a") {
        if (d.x === 0) dirRef.current = { x: -1, y: 0 };
      } else if (k === "arrowright" || k === "d") {
        if (d.x === 0) dirRef.current = { x: 1, y: 0 };
      } else if (k === "enter" && deadRef.current) {
        // restart
        snakeRef.current = [{ x: 8, y: 6 }];
        dirRef.current = { x: 1, y: 0 };
        foodRef.current = rndFood();
        scoreRef.current = 0;
        deadRef.current = false;
        setScore(0);
        setGameState("playing");
      } else if (k === "q" || k === "escape") {
        quitGame();
        return;
      }

      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) {
        e.preventDefault();
      }
    };

    keyListenerRef.current = onKey;
    document.addEventListener("keydown", onKey);

    // game loop — reads hiScoreRef so it always has the latest value
    const tick = setInterval(() => {
      if (deadRef.current) return;

      const snake = snakeRef.current;
      const dir = dirRef.current;
      const food = foodRef.current;

      const head: Point = {
        x: (snake[0].x + dir.x + SNAKE_W) % SNAKE_W,
        y: (snake[0].y + dir.y + SNAKE_H) % SNAKE_H,
      };

      // self-collision
      if (snake.some((p) => p.x === head.x && p.y === head.y)) {
        deadRef.current = true;
        const newHi = Math.max(scoreRef.current, hiScoreRef.current);
        hiScoreRef.current = newHi;
        try { localStorage.setItem("snakeHi", String(newHi)); } catch { /* ignore */ }
        setHiScore(newHi);
        setGameState("dead");
        drawBoard();
        return;
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        scoreRef.current++;
        setScore(scoreRef.current);
        foodRef.current = rndFood();
      } else {
        snake.pop();
      }

      drawBoard();
    }, TICK_MS);

    intervalRef.current = tick;
  }, [stopGame, drawBoard, rndFood, quitGame]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopGame();
    };
  }, [stopGame]);

  // ─── stat line ────────────────────────────────────────────────────────────
  const langStr = topLangs.map((l) => `${l.name} ${l.pct}%`).join(" · ");

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <section aria-label="GitHub activity">
      <SectionLabel>GitHub</SectionLabel>

      {/* ── heatmap / snake container ─────────────────────────────────────── */}
      <div className="relative">
        {gameState === "idle" ? (
          /* ── heatmap ────────────────────────────────────────────────────── */
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
            onMouseLeave={() => setHoveredIdx(null)}
            aria-label="Contribution heatmap"
            role="img"
          >
            {cells.length === 0
              ? // skeleton while cells are being generated
                Array.from({ length: TOTAL_CELLS }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-[2px]"
                    style={{ background: "var(--card)" }}
                  />
                ))
              : cells.map((cell) => (
                  <div
                    key={cell.idx}
                    className="aspect-square rounded-[2px] transition-[box-shadow] duration-100"
                    style={{
                      background: cellBg(cell.level),
                      boxShadow:
                        hoveredIdx === cell.idx
                          ? "0 0 0 2px var(--accent)"
                          : "none",
                    }}
                    onMouseEnter={() => setHoveredIdx(cell.idx)}
                    aria-label={`Intensity level ${cell.level}`}
                  />
                ))}
          </div>
        ) : (
          /* ── snake game ─────────────────────────────────────────────────── */
          <div
            className="font-mono"
            style={{ fontSize: "13px", lineHeight: "1.08", letterSpacing: "1px" }}
            aria-live="polite"
            aria-label="Snake game"
          >
            {/* board — rendered as a <pre> with <span> rows (phrasing content only) */}
            <pre
              className="m-0 select-none overflow-hidden"
              style={{ color: "var(--muted)" }}
            >
              {boardRows.map((row, rowIdx) => (
                <span key={rowIdx} style={{ display: "block" }}>
                  {row.split("").map((ch, col) => {
                    const isSnake = ch === "█" || ch === "▓";
                    const isFood = ch === "◆";
                    return (
                      <span
                        key={col}
                        style={{
                          color: isSnake
                            ? "var(--accent)"
                            : isFood
                            ? "var(--fg)"
                            : undefined,
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </pre>

            {/* score line */}
            <div
              className="mt-1.5 text-[11px] tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              commits eaten:{" "}
              <span style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                {score}
              </span>
              {gameState === "dead" && (
                <span style={{ color: "var(--accent)" }}>
                  {"  "}GAME OVER — press enter to restart · esc to quit
                </span>
              )}
              {gameState === "playing" && (
                <span className="ml-4">
                  arrows / WASD · esc to quit
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── stat line ──────────────────────────────────────────────────────── */}
      <div
        className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] leading-none text-muted"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        <span>
          <span style={{ color: "var(--fg)" }}>{commitsThisYear}</span> commits this year
        </span>
        <span className="select-none text-[var(--line)]">·</span>
        <span>
          streak{" "}
          <span style={{ color: "var(--fg)" }}>{streakDays}</span>d
        </span>
        <span className="select-none text-[var(--line)]">·</span>
        <span className="text-muted">{langStr}</span>
      </div>

      {/* ── play / quit button ─────────────────────────────────────────────── */}
      <div className="mt-3 flex items-center gap-3">
        {gameState === "idle" ? (
          <button
            onClick={startGame}
            className="font-mono text-[12px] text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Play snake game on contribution grid"
          >
            ▶ play snake
          </button>
        ) : (
          <button
            onClick={quitGame}
            className="font-mono text-[12px] text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Quit snake and return to heatmap"
          >
            ✕ quit
          </button>
        )}

        {hiScore > 0 && (
          <span className="font-mono text-[11px] text-muted">
            hi-score{" "}
            <span style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
              {hiScore}
            </span>
          </span>
        )}
      </div>
    </section>
  );
}
