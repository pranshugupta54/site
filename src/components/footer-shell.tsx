"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Vitals } from "@/components/vitals";
import { ShellLine, TERM, useShellEngine } from "@/components/shell-engine";

// ─── constants ───────────────────────────────────────────────────────────────

const CHIPS = ["help", "projects", "gh", "snake", "theme"];

const MIN_H = 200;
const DEFAULT_H = 440;

// terminal palette — intentionally a dark terminal overlay regardless of skin
const { BG, FG, MUTED, LINE, DIM, GREEN } = TERM;

// ─── main component ──────────────────────────────────────────────────────────

export function FooterShell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(DEFAULT_H);
  const dragging = useRef(false); // read by the window listeners
  const [isDragging, setIsDragging] = useState(false); // read by render (drops the height transition)

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
      setIsDragging(false);
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  // ref mirror of `open` — the global key handler must see the current value
  // immediately, not a stale closure between state update and effect re-subscribe
  const openRef = useRef(false);

  // `tofu` closes the panel and navigates; doOpen needs the engine's input, so go through a ref
  const doOpenRef = useRef<(v: boolean) => void>(() => {});
  const onTofu = useCallback(() => {
    doOpenRef.current(false);
    router.push("/tofu");
  }, [router]);
  const { input, setInput, lines, exec, onInputKey, clearOutput, snakeOn, outRef, inputRef } = useShellEngine({ onTofu });

  const doOpen = useCallback((v: boolean) => {
    openRef.current = v;
    setOpen(v);
    if (!v) inputRef.current?.blur(); // hidden input must not keep eating keystrokes
    if (v)
      setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length); // caret after any carried-over chars
      }, 0);
  }, [inputRef]);
  useEffect(() => {
    doOpenRef.current = doOpen;
  }, [doOpen]);

  // ── global keys: "/" opens, any typed character opens + carries over, Esc closes ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (snakeOn) return;
      const isOpen = openRef.current;
      const tag = document.activeElement?.tagName;
      const typingElsewhere = tag === "INPUT" || tag === "TEXTAREA";
      if (!isOpen && !typingElsewhere && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === "/") {
          e.preventDefault();
          doOpen(true);
        } else if (e.key.length === 1 && e.key !== " ") {
          // the blinking cursor in the collapsed bar promises a real prompt —
          // honor it: start typing anywhere and the shell opens mid-word
          e.preventDefault();
          setInput((prev) => prev + e.key);
          doOpen(true);
        }
      } else if (e.key === "Escape" && isOpen) {
        doOpen(false);
      } else if (
        isOpen &&
        !typingElsewhere &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.length === 1
      ) {
        // panel open but input not focused yet (or user clicked away) — don't drop keystrokes
        e.preventDefault();
        setInput((prev) => prev + e.key);
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, snakeOn, doOpen, setInput, inputRef]);

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
        inert={open}
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
          viewTransitionName: "shell-bar", // stays on top through page transitions (globals.css)
        }}
      >
        <span className="shrink-0 whitespace-nowrap" style={{ color: GREEN }}>~/pranshu ❯</span>
        <span className="shrink-0 whitespace-nowrap" style={{ color: MUTED }}>type &apos;help&apos;</span>
        <span style={{ color: FG }} aria-hidden className="animate-[blink_1s_steps(1)_infinite]">▋</span>
        <span className="lg:hidden" style={{ marginLeft: "auto", color: MUTED, fontSize: 11 }}>just start typing</span>
        <span className="ml-auto hidden lg:block" style={{ color: MUTED }}><Vitals /></span>
      </div>

      {/* expanded panel */}
      <div
        aria-label="Terminal shell"
        data-open={open} // the ? keyboard map stays shut while the shell owns the keyboard
        inert={!open} // closed at height 0: its controls must not be Tab stops
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          background: BG, color: FG, borderTop: `1px solid ${LINE}`,
          height: open ? height : 0, overflow: "hidden",
          transition: isDragging ? "none" : "height 0.26s cubic-bezier(0.2,0.8,0.2,1)",
          boxShadow: "0 -30px 60px -30px rgba(0,0,0,0.5)",
          fontFamily: "var(--font-mono)",
          viewTransitionName: "shell-panel",
        }}
      >
        {/* drag handle */}
        <div
          onMouseDown={() => {
            dragging.current = true;
            setIsDragging(true);
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
              <button style={btn} onClick={clearOutput}>clear</button>
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
            {lines.map((l) => <ShellLine key={l.id} line={l} />)}
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
