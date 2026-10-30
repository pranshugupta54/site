"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useAppearance } from "@/components/providers";

// The season's ambient glyph drifts across the top of the page once per visit (tab session),
// a few seconds after load. Never in reduced motion, never below sm (same as tofu).
const flownKey = (id: string) => `season-ambient-flown:${id}`;
export function SeasonAmbient() {
  const { season } = useAppearance();
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<{ id: string; top: number; rtl: boolean } | null>(null);
  const flown = useRef(new Set<string>()); // backs up sessionStorage when it's blocked
  const glyph = season?.ambient;
  const id = season?.id;

  useEffect(() => {
    if (!glyph || !id || reduce || flown.current.has(id) || !matchMedia("(min-width: 640px)").matches) return;
    try {
      if (sessionStorage.getItem(flownKey(id))) return;
    } catch {
      /* storage blocked — the ref still keeps it to once per page load */
    }
    const t = setTimeout(() => {
      flown.current.add(id);
      try {
        sessionStorage.setItem(flownKey(id), "1");
      } catch {
        /* ignore */
      }
      setFlight({ id, top: 6 + Math.random() * 22, rtl: Math.random() < 0.5 });
    }, 4000);
    return () => {
      clearTimeout(t);
      setFlight(null); // a season switch or motion change never revives an old flight
    };
  }, [glyph, id, reduce]);

  if (!glyph || reduce || !flight || flight.id !== id) return null;

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
