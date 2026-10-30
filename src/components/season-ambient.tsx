"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useAppearance } from "@/components/providers";

// The season's ambient glyph drifts across the top of the page once in a while.
// One at a time, never in reduced motion, hidden on small screens like tofu.
export function SeasonAmbient() {
  const { season } = useAppearance();
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<{ n: number; top: number; rtl: boolean } | null>(null);
  const glyph = season?.ambient;

  useEffect(() => {
    if (!glyph || reduce) return;
    let t: ReturnType<typeof setTimeout>;
    const launch = (n: number, delay: number) => {
      t = setTimeout(() => {
        setFlight({ n, top: 6 + Math.random() * 22, rtl: Math.random() < 0.5 });
        launch(n + 1, 45000 + Math.random() * 60000);
      }, delay);
    };
    launch(0, 6000);
    return () => {
      clearTimeout(t);
      setFlight(null);
    };
  }, [glyph, reduce]);

  if (!glyph || reduce || !flight) return null;

  return (
    <div
      key={flight.n}
      aria-hidden
      className="season-drift pointer-events-none fixed left-0 z-20 hidden select-none font-mono text-[11px] text-muted sm:block"
      style={{ top: `${flight.top}vh`, animationDirection: flight.rtl ? "reverse" : "normal" }}
    >
      <span className="season-bob block">{glyph}</span>
    </div>
  );
}
