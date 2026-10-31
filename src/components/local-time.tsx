"use client";

import { useSyncExternalStore } from "react";

export function relative(d: Date): string {
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
// false on the server and during hydration, true once mounted on the client
const noSubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(noSubscribe, () => true, () => false);

export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const mounted = useMounted();
  let label = "";
  if (mounted) {
    const d = new Date(iso);
    const local = d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    label = `${local} · ${relative(d)}`;
  }
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
