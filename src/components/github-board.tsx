"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type GameState = "idle" | "playing" | "dead";
type Point = { x: number; y: number };

const GRID_COLS = 30;
const SNAKE_W = 30;
const SNAKE_H = 12;
const TICK_MS = 110;

const LEVEL_OPACITY = [null, 0.18, 0.38, 0.65, 1.0];
function cellBg(level: number) {
  if (level <= 0) return "var(--card)";
  const o = LEVEL_OPACITY[Math.min(4, level)] as number;
  return `color-mix(in srgb, var(--accent) ${Math.round(o * 100)}%, var(--card))`;
}

// Real contribution levels come from the server (live GitHub). Children render
// between the heatmap and the play button (the stat line).
export function GitHubBoard({ levels, children }: { levels: number[]; children?: ReactNode }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(0);

  const snakeRef = useRef<Point[]>([{ x: 8, y: 6 }]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 20, y: 4 });
  const scoreRef = useRef(0);
  const deadRef = useRef(false);
  const hiScoreRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const [boardRows, setBoardRows] = useState<string[]>(() =>
    Array.from({ length: SNAKE_H }, () => "·".repeat(SNAKE_W))
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem("snakeHi");
      if (stored) {
        const parsed = parseInt(stored, 10);
        setHiScore(parsed);
        hiScoreRef.current = parsed;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const rndFood = useCallback(
    (): Point => ({ x: Math.floor(Math.random() * SNAKE_W), y: Math.floor(Math.random() * SNAKE_H) }),
    []
  );

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
        row += isHead ? "█" : isBody ? "▓" : isFood ? "◆" : "·";
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
    snakeRef.current = [{ x: 8, y: 6 }];
    dirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 20, y: 4 };
    scoreRef.current = 0;
    deadRef.current = false;
    setScore(0);
    setGameState("playing");
    drawBoard();

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const d = dirRef.current;
      if ((k === "arrowup" || k === "w") && d.y === 0) dirRef.current = { x: 0, y: -1 };
      else if ((k === "arrowdown" || k === "s") && d.y === 0) dirRef.current = { x: 0, y: 1 };
      else if ((k === "arrowleft" || k === "a") && d.x === 0) dirRef.current = { x: -1, y: 0 };
      else if ((k === "arrowright" || k === "d") && d.x === 0) dirRef.current = { x: 1, y: 0 };
      else if (k === "enter" && deadRef.current) {
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
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    };
    keyListenerRef.current = onKey;
    document.addEventListener("keydown", onKey);

    const tick = setInterval(() => {
      if (deadRef.current) return;
      const snake = snakeRef.current;
      const dir = dirRef.current;
      const food = foodRef.current;
      const head: Point = {
        x: (snake[0].x + dir.x + SNAKE_W) % SNAKE_W,
        y: (snake[0].y + dir.y + SNAKE_H) % SNAKE_H,
      };
      if (snake.some((p) => p.x === head.x && p.y === head.y)) {
        deadRef.current = true;
        const newHi = Math.max(scoreRef.current, hiScoreRef.current);
        hiScoreRef.current = newHi;
        try {
          localStorage.setItem("snakeHi", String(newHi));
        } catch {
          /* ignore */
        }
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

  useEffect(() => () => stopGame(), [stopGame]);

  return (
    <>
      <div className="relative">
        {gameState === "idle" ? (
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
            onMouseLeave={() => setHoveredIdx(null)}
            role="img"
            aria-label="GitHub contribution heatmap"
          >
            {levels.map((level, i) => (
              <div
                key={i}
                className="aspect-square rounded-[2px] transition-[box-shadow] duration-100"
                style={{
                  background: cellBg(level),
                  boxShadow: hoveredIdx === i ? "0 0 0 2px var(--accent)" : "none",
                }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}
          </div>
        ) : (
          <div
            className="font-mono"
            style={{ fontSize: "13px", lineHeight: "1.08", letterSpacing: "1px" }}
            aria-live="polite"
            aria-label="Snake game"
          >
            <pre className="m-0 select-none overflow-hidden" style={{ color: "var(--muted)" }}>
              {boardRows.map((row, rowIdx) => (
                <span key={rowIdx} style={{ display: "block" }}>
                  {row.split("").map((ch, col) => {
                    const isSnake = ch === "█" || ch === "▓";
                    const isFood = ch === "◆";
                    return (
                      <span
                        key={col}
                        style={{ color: isSnake ? "var(--accent)" : isFood ? "var(--fg)" : undefined }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </pre>
            <div className="mt-1.5 text-[11px] tracking-wide" style={{ color: "var(--muted)" }}>
              commits eaten:{" "}
              <span style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{score}</span>
              {gameState === "dead" && (
                <span style={{ color: "var(--accent)" }}>
                  {"  "}GAME OVER — press enter to restart · esc to quit
                </span>
              )}
              {gameState === "playing" && <span className="ml-4">arrows / WASD · esc to quit</span>}
            </div>
          </div>
        )}
      </div>

      {children}

      <div className="mt-3 flex items-center gap-3">
        {gameState === "idle" ? (
          <button
            onClick={startGame}
            className="font-mono text-[12px] text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Play snake game on the contribution grid"
          >
            ▶ play snake
          </button>
        ) : (
          <button
            onClick={quitGame}
            className="font-mono text-[12px] text-muted transition-colors duration-150 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
            aria-label="Quit snake and return to the heatmap"
          >
            ✕ quit
          </button>
        )}
        {hiScore > 0 && (
          <span className="font-mono text-[11px] text-muted">
            hi-score{" "}
            <span style={{ color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{hiScore}</span>
          </span>
        )}
      </div>
    </>
  );
}
