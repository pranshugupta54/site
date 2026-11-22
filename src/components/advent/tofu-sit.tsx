"use client";

import { useEffect, useState } from "react";
import framesData from "@/data/tofu-frames.json";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { dress } from "@/lib/tofu-dress";

// tofu, in a winter hat, sitting on the calendar. Blinks and breathes unless motion
// is reduced; a click makes it happy for a moment.

type Frame = keyof typeof framesData.frames;
const IDLE: Frame[] = ["idle", "idle", "breathe", "idle", "blink", "idle", "idle", "twitch", "idle", "breathe"];

export function TofuSit({ say, frame: forced, onPoke, className }: { say?: string; frame?: Frame; onPoke?: () => void; className?: string }) {
  const reduced = useReducedMotionLive();
  const [i, setI] = useState(0);
  const [happy, setHappy] = useState(false);
  useEffect(() => {
    if (reduced || forced) return;
    const id = setInterval(() => setI((x) => (x + 1) % IDLE.length), 700);
    return () => clearInterval(id);
  }, [reduced, forced]);
  useEffect(() => {
    if (!happy) return;
    const id = setTimeout(() => setHappy(false), 1400);
    return () => clearTimeout(id);
  }, [happy]);
  const frame: Frame = happy ? "happy" : (forced ?? (reduced ? "idle" : IDLE[i]));
  return (
    <div className={`adv-tofu ${className ?? ""}`}>
      {say ? (
        <p className="adv-say" aria-live="polite">
          {say}
        </p>
      ) : null}
      <button
        type="button"
        className="adv-tofu-face"
        aria-label="tofu"
        onClick={() => {
          setHappy(true);
          onPoke?.();
        }}
      >
        <pre aria-hidden>{dress(framesData.frames[frame].join("\n"), framesData.hats.winter)}</pre>
      </button>
    </div>
  );
}
