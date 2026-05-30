"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";

export function LiveClock({ className }: { className?: string }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", {
        timeZone: SITE.timezone,
        hour12: false,
      });
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} suppressHydrationWarning>
      {t || "--:--:--"} IST
    </span>
  );
}
