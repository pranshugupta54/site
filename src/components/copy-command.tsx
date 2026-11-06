"use client";

import { useState } from "react";

const BOX = "rounded-lg border border-line bg-card px-4 py-3 text-left transition-colors hover:border-accent";

// `inline` drops the card chrome and shortens the copied label, for use inside a list row.
export function CopyCommand({
  cmd,
  className,
  inline = false,
}: {
  cmd: string;
  className?: string;
  inline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy command: ${cmd}`}
      className={`group flex w-full items-center justify-between ${inline ? "gap-2 text-left" : `gap-3 ${BOX}`} ${className ?? ""}`}
      onClick={() => {
        navigator.clipboard?.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      <code className={`min-w-0 font-mono ${inline ? "text-[10.5px]" : "text-[13px]"}`}>
        <span className="text-muted">$ </span>
        <span className={inline ? "text-muted transition-colors group-hover:text-fg" : "text-accent"}>{cmd}</span>
      </code>
      <span className="shrink-0 font-mono text-[11px] text-muted transition-colors group-hover:text-accent">
        {copied ? (inline ? "✓" : "copied ✓") : "copy"}
      </span>
    </button>
  );
}
