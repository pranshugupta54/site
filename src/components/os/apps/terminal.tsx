"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShellLine, TERM, useShellEngine, type ShellIO } from "@/components/shell-engine";
import { APP_IDS, type AppId } from "../wm";

const OS_HELP = "  open <app>  projects · notes · reading · tofu · about\n  exit        close this window";

/**
 * The site's shell in a window — the same engine as the footer shell, plus a
 * couple of desktop commands. `tofu` opens tofu's window instead of leaving.
 */
export function TerminalApp({
  openApp,
  close,
  onSnake,
  active,
}: {
  openApp: (id: AppId) => void;
  close: () => void;
  /** the snake owns the keyboard (Esc quits it); the desktop keeps its hands off */
  onSnake: (on: boolean) => void;
  /** the snake only owns the keyboard while this window is frontmost */
  active: boolean;
}) {
  const onTofu = useCallback(() => openApp("tofu"), [openApp]);
  const router = useRouter();
  const onRoom = useCallback(() => router.push("/room"), [router]);
  const extra = useCallback(
    (cmd: string, args: string[], { addLine }: ShellIO) => {
      if (cmd === "exit") {
        close();
        return true;
      }
      if (cmd === "apps") {
        addLine("res", APP_IDS.join(" · "));
        return true;
      }
      if (cmd === "open") {
        const want = args[0]?.toLowerCase();
        if (want && (APP_IDS as readonly string[]).includes(want)) {
          addLine("ok", `→ ${want}`);
          openApp(want as AppId);
        } else addLine("warn", `usage: open ${APP_IDS.join("|")}`);
        return true;
      }
      return false;
    },
    [openApp, close]
  );
  const { input, setInput, lines, onInputKey, snakeOn, quitSnake, outRef, inputRef } = useShellEngine({
    onTofu,
    onRoom,
    extra,
    helpExtra: OS_HELP,
  });

  useEffect(() => onSnake(snakeOn), [snakeOn, onSnake]);
  // minimized or sent behind another window: the game ends rather than
  // keep eating arrow keys and Esc meant for the window in front
  useEffect(() => {
    if (!active) quitSnake();
  }, [active, quitSnake]);
  useEffect(() => () => onSnake(false), [onSnake]);

  return (
    <div
      className="flex h-full min-h-0 flex-col px-4"
      style={{ background: TERM.BG, color: TERM.FG, fontFamily: "var(--font-mono)" }}
      onMouseUp={() => {
        // a click anywhere puts the caret back, unless it was a text selection
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
    >
      <div ref={outRef} className="min-h-0 flex-1 overflow-y-auto py-3" aria-live="polite">
        {lines.map((l) => (
          <ShellLine key={l.id} line={l} />
        ))}
      </div>
      <div className="flex flex-none items-center gap-2.5 pb-3 pt-1" style={{ fontSize: 13 }}>
        <span style={{ color: TERM.GREEN }}>~/pranshu ❯</span>
        <input
          ref={inputRef}
          data-autofocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onInputKey}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="type 'help'"
          aria-label="Terminal input"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:opacity-50"
          style={{ color: TERM.FG, fontFamily: "var(--font-mono)", fontSize: 13, caretColor: TERM.GREEN }}
        />
      </div>
    </div>
  );
}
