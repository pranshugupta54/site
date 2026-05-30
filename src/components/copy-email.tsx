"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

export function CopyEmail({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard?.writeText(SITE.email);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {SITE.email}{" "}
      <span className="font-mono text-xs text-muted">
        {copied ? "(copied ✓)" : "(copy)"}
      </span>
    </button>
  );
}
