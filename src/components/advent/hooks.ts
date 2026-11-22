"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

// The calendar's clock and the viewer's opened doors.

/**
 * The server's "now" (ISO), ticking forward once a second from when the page loaded.
 * The first render uses it as-is, so the server html and hydration agree.
 */
export function useAdventClock(serverNow: string): Date {
  const [t, setT] = useState(() => Date.parse(serverNow));
  useEffect(() => {
    const server = Date.parse(serverNow);
    const at = Date.now();
    const tick = () => setT(server + (Date.now() - at));
    const first = setTimeout(tick, 0); // a fresh serverNow (after a refresh) shows at once
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [serverNow]);
  return new Date(t);
}

/**
 * When `next` (ms since epoch) passes, fetch the page again so the newly opened door
 * arrives from the server. A ?now= preview moves its own clock forward in the url,
 * since re-requesting the same ?now= would never open anything.
 */
export function useOpenWhen(next: number | null, now: Date, preview: boolean) {
  const router = useRouter();
  // when we last asked; while the server still says locked (offline at midnight, a
  // slightly slow server clock), ask again every few seconds
  const asked = useRef<{ next: number; at: number } | null>(null);
  useEffect(() => {
    if (next === null || now.getTime() < next) return;
    if (asked.current?.next === next && Date.now() - asked.current.at < 5000) return;
    asked.current = { next, at: Date.now() };
    if (preview) {
      const u = new URL(location.href);
      u.searchParams.set("now", new Date(next + 1000).toISOString());
      router.replace(u.pathname + u.search, { scroll: false });
    } else router.refresh();
  }, [next, now, preview, router]);
}

// ─── opened doors, per viewer (localStorage; the calendar still works without it) ───

const KEY = "p54:advent:opened";
const listeners = new Set<() => void>();
let cache: string | null = null;

// what this visit marked wins: it's ahead of storage when a write failed (storage full,
// private mode), and storage can't be read at all in some browsers
function read(): string {
  if (cache !== null) return cache;
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

const parse = (raw: string): number[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n) && n >= 1 && n <= 24) : [];
  } catch {
    return [];
  }
};

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
};

export function useOpened(): { opened: Set<number>; markOpened: (n: number) => void } {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const markOpened = useCallback((n: number) => {
    const list = parse(read());
    if (list.includes(n)) return;
    const next = JSON.stringify([...list, n].sort((a, b) => a - b));
    cache = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: remembered for this visit only */
    }
    listeners.forEach((l) => l());
  }, []);
  return { opened: new Set(parse(raw)), markOpened };
}
