"use client";

import { useState } from "react";

export function CopyCommand({ cmd, className }: { cmd: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy command: ${cmd}`}
      className={`group flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3 text-left transition-colors hover:border-accent ${className ?? ""}`}
      onClick={() => {
        navigator.clipboard?.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      <code className="font-mono text-[13px]">
        <span className="text-muted">$ </span>
        <span className="text-accent">{cmd}</span>
      </code>
      <span className="shrink-0 font-mono text-[11px] text-muted transition-colors group-hover:text-accent">
        {copied ? "copied ✓" : "copy"}
      </span>
    </button>
  );
}
