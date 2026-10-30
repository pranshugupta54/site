"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useAppearance } from "@/components/providers";

// The season's ambient glyph drifts across the top of the page once per visit (tab session),
// a few seconds after load. Never in reduced motion, never below sm (same as tofu).
const FLOWN_KEY = "season-ambient-flown";
export function SeasonAmbient() {
  const { season } = useAppearance();
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<{ top: number; rtl: boolean } | null>(null);
  const glyph = season?.ambient;
  const id = season?.id;

  useEffect(() => {
    if (!glyph || !id || reduce || !matchMedia("(min-width: 640px)").matches) return;
    try {
      if (sessionStorage.getItem(FLOWN_KEY) === id) return;
    } catch {
      /* storage blocked — fly anyway, still once per page load */
    }
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(FLOWN_KEY, id);
      } catch {
        /* ignore */
      }
      setFlight({ top: 6 + Math.random() * 22, rtl: Math.random() < 0.5 });
    }, 4000);
    return () => clearTimeout(t);
  }, [glyph, id, reduce]);

  if (!glyph || reduce || !flight) return null;

  return (
    <div
      key={id}
      aria-hidden
      className="season-drift pointer-events-none fixed left-0 z-20 hidden select-none font-mono text-[11px] text-muted sm:block"
      style={{ top: `${flight.top}vh`, animationDirection: flight.rtl ? "reverse" : "normal" }}
    >
      <span className="season-bob block">{glyph}</span>
    </div>
  );
}
