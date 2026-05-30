"use client";

import { useEffect, useState } from "react";

function relative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 30) return `${day}d ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.round(mon / 12)}y ago`;
}

// Renders a UTC ISO timestamp in the *viewer's* local timezone + a relative hint.
// Client-only (after mount) to avoid SSR/locale hydration mismatch.
export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const local = d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    setLabel(`${local} · ${relative(d)}`);
  }, [iso]);
  return (
    <time
      dateTime={iso}
      suppressHydrationWarning
      className={className ?? "font-mono text-[12px] text-muted"}
    >
      {label || iso.slice(0, 10)}
    </time>
  );
}
