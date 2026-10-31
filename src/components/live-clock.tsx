"use client";

import { useSyncExternalStore } from "react";
import { SITE } from "@/lib/site";

// a clock that ticks every second on the client and is empty on the server
const everySecond = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const fmt = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: SITE.timezone,
    hour12: false,
  });
const onServer = () => "";

export function LiveClock({ className }: { className?: string }) {
  const t = useSyncExternalStore(everySecond, fmt, onServer);
  return (
    <span className={className} suppressHydrationWarning>
      {t || "--:--:--"} IST
    </span>
  );
}
