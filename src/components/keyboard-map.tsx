"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/providers";
import { SHORTCUTS, shellCommands } from "@/lib/shell-commands";

const FOCUSABLE = 'button, [href], input, [tabindex]:not([tabindex="-1"])';

function typingIn(el: Element | null): boolean {
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

// "?" anywhere outside a text field opens a map of every shortcut and shell command.
export function KeyboardMap() {
  const { season } = useAppearance();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false); // the key handler reads this, not a stale closure
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const show = useCallback((v: boolean) => {
    if (v === openRef.current) return;
    openRef.current = v;
    if (v) returnTo.current = document.activeElement as HTMLElement | null;
    else {
      const el = returnTo.current;
      returnTo.current = null;
      if (el?.isConnected) el.focus();
    }
    setOpen(v);
  }, []);

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  // capture phase on window, so this runs before the shell's own key handler
  useEffect(() => {
    const trap = (e: KeyboardEvent) => {
      const root = dialogRef.current;
      if (!root) return;
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const active = document.activeElement as HTMLElement | null;
      if (!items.length) return e.preventDefault();
      const first = items[0];
      const last = items[items.length - 1];
      if (!active || !items.includes(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const bare = !e.ctrlKey && !e.metaKey && !e.altKey;
      if (openRef.current) {
        if (e.key === "Escape" || (e.key === "?" && bare)) {
          e.preventDefault();
          show(false);
        } else if (e.key === "Tab") trap(e);
        e.stopPropagation(); // the page underneath (shell, snakes) hears nothing while the map is up
        return;
      }
      if (e.key !== "?" || !bare || e.repeat || e.isComposing || typingIn(document.activeElement)) return;
      e.preventDefault();
      e.stopPropagation(); // or the shell's type-anywhere opens with a "?"
      show(true);
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [show]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 motion-safe:duration-150 motion-safe:animate-in motion-safe:fade-in-0"
      style={{ background: "color-mix(in srgb, var(--bg) 70%, transparent)" }}
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault(); // keep the browser from moving focus after it's been restored
        show(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keymap-title"
        tabIndex={-1}
        className="max-h-[min(80vh,640px)] w-full max-w-[420px] overflow-y-auto rounded-lg border border-line bg-card p-5 font-mono text-[12px] leading-relaxed text-fg shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] outline-none motion-safe:duration-150 motion-safe:animate-in motion-safe:zoom-in-[0.98]"
      >
        <div className="flex items-baseline justify-between">
          <h2 id="keymap-title" className="text-[13px] font-medium">
            keyboard map
          </h2>
          <button
            type="button"
            onClick={() => show(false)}
            aria-label="close keyboard map"
            className="rounded text-[11px] text-muted transition-colors hover:text-accent focus-visible:text-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-line"
          >
            esc
          </button>
        </div>

        <p className="mt-5 text-[11px] text-muted">keys</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {SHORTCUTS.map((s) => (
            <Fragment key={s.desc}>
              <dt className="flex flex-wrap gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-line bg-bg px-1.5 font-mono text-[11px] leading-[18px] text-fg"
                  >
                    {k}
                  </kbd>
                ))}
              </dt>
              <dd className="text-muted">{s.desc}</dd>
            </Fragment>
          ))}
        </dl>

        <p className="mt-5 text-[11px] text-muted">
          in the shell <span className="opacity-70">· same as &apos;help&apos;</span>
        </p>
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
          {shellCommands(season).map((c) =>
            c.desc ? (
              <Fragment key={c.usage}>
                <span>{c.usage}</span>
                <span className="text-muted">{c.desc}</span>
              </Fragment>
            ) : (
              <span key={c.usage} className="col-span-2">
                {c.usage}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
