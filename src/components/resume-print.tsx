"use client";

import { useEffect, useRef } from "react";

// "pdf ↓" opens the print dialog. `?print=1` (the shell's `resume --pdf`) opens
// it once on load, after the fonts are in so the pdf never catches a fallback face.
export function ResumePrint() {
  // ?print=1 intent, read once — a ref so Strict Mode's effect replay
  // (setup → cleanup → setup) still sees it after the param is stripped
  const auto = useRef<boolean | null>(null);
  // an auto-print is waiting on fonts; the button defers to it (one dialog)
  const queued = useRef(false);

  useEffect(() => {
    if (auto.current === null) {
      const url = new URL(window.location.href);
      auto.current = url.searchParams.get("print") === "1";
      if (auto.current) {
        url.searchParams.delete("print");
        // a refresh shouldn't re-prompt; keep Next's history state (__NA, tree)
        // or back/forward to this entry can't restore the page
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    }
    if (!auto.current) return;

    let cancelled = false;
    let frame = 0;
    queued.current = true;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        queued.current = false;
        auto.current = false;
        window.print();
      });
    });
    // left before the fonts landed — never print whatever page comes next
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      queued.current = false;
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        if (!queued.current) window.print();
      }}
      className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
    >
      pdf ↓
    </button>
  );
}
