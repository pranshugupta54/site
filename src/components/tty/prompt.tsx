"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShellLine, useShellEngine, type ShellPalette } from "@/components/shell-engine";
import { homeKey } from "@/lib/tty";
import { BOARD_SNAKE } from "@/lib/keymap";

// the session's colors follow the page's terminal theme (skin × light/dark)
const PALETTE: ShellPalette = { FG: "var(--fg)", MUTED: "var(--muted)", GREEN: "var(--accent)", ORANGE: "var(--accent)" };

export function PromptLabel() {
  return (
    <span className="tty-ps1">
      pranshu<span className="tty-host">@p54</span> <span className="tty-dim">~ %</span>
    </span>
  );
}

/**
 * The live prompt at the bottom of the home page, and the page's only shell:
 * the same engine as p54 os's terminal, so every command and egg works here.
 * Type anywhere and it lands here; `/` focuses; 1–7 switch tabs while it's empty.
 */
export function TtyPrompt() {
  const router = useRouter();
  const onTofu = useCallback(() => router.push("/tofu"), [router]);
  const onOs = useCallback(() => router.push("/os"), [router]);
  const onRoom = useCallback(() => router.push("/room"), [router]);
  const { input, setInput, lines, onInputKey, snakeOn, outRef, inputRef } = useShellEngine({ onTofu, onOs, onRoom });
  const [focused, setFocused] = useState(false);

  // the page is the scroller here: keep the newest output and the prompt in view
  useEffect(() => {
    if (lines.length > 1) inputRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines, inputRef]);

  useEffect(() => {
    // The heatmap snake reads keys off the document and unmounts the moment q/Esc quits it,
    // so by the time an event bubbles to the window its game may already be gone. Note
    // ownership on the way down (capture) and honor it for the whole event.
    const boardKeys = new WeakSet<KeyboardEvent>();
    const onCapture = (e: KeyboardEvent) => {
      if (document.querySelector(BOARD_SNAKE)) boardKeys.add(e);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // the keyboard map (capture phase) took it
      const el = document.activeElement;
      const tag = el?.tagName;
      const prompt = inputRef.current;
      const act = homeKey(e, {
        // either snake owns the keys: the prompt's own, or the heatmap's in the side pane
        snakeOn: snakeOn || boardKeys.has(e),
        typingElsewhere: el !== prompt && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!(el as HTMLElement | null)?.isContentEditable),
        promptFocused: el === prompt,
        promptEmpty: !prompt?.value,
      });
      if (!act) return;
      e.preventDefault();
      if (act.kind === "tab") {
        if (act.href.startsWith("/#")) document.getElementById(act.href.slice(2))?.scrollIntoView({ block: "start" });
        else if (act.href === "/") window.scrollTo({ top: 0 });
        else router.push(act.href);
        return;
      }
      if (act.kind === "type") setInput((v) => v + act.text);
      prompt?.focus({ preventScroll: false });
      prompt?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onCapture, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [snakeOn, router, setInput, inputRef]);

  return (
    <div
      // the `?` map stays shut while a game here owns the keyboard (lib/keymap.ts)
      aria-label="Terminal shell"
      data-open={snakeOn ? "true" : "false"}
      className="tty-live"
      onMouseUp={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus({ preventScroll: true });
      }}
    >
      <div ref={outRef} aria-live="polite">
        {lines.map((l) => (
          <ShellLine key={l.id} line={l} palette={PALETTE} prompt={<PromptLabel />} />
        ))}
      </div>
      <label className="tty-input">
        <PromptLabel />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return; // an IME is mid-word: Enter/Esc are its
            // the game reads every key off the window: keep them out of the line, and away
            // from the prompt's history and submit
            if (snakeOn) {
              if (e.key.length === 1) e.preventDefault();
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              e.currentTarget.blur(); // hands the keys back: `?`, 1–7, type-anywhere
              return;
            }
            onInputKey(e);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Terminal input"
        />
        {!focused && !input ? (
          <span className="tty-hint" aria-hidden>
            <span className="tty-cursor" /> type &apos;help&apos;, or just start typing
          </span>
        ) : null}
      </label>
    </div>
  );
}
