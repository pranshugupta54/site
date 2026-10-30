"use client";

import { useEffect } from "react";

// "pdf ↓" opens the print dialog. `?print=1` (the shell's `resume --pdf`) opens
// it once on load, after the fonts are in so the pdf never catches a fallback face.
export function ResumePrint() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("print") !== "1") return;
    url.searchParams.delete("print");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash); // a refresh shouldn't re-prompt
    document.fonts.ready.then(() => requestAnimationFrame(() => window.print()));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
    >
      pdf ↓
    </button>
  );
}
