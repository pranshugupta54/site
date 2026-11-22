"use client";

import "./toys.css";
import { useEffect, useState } from "react";
import framesData from "@/data/tofu-frames.json";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { dress } from "@/lib/tofu-dress";

// door 1: pet tofu. that's it. that's the toy.

// copy[i] shows from AT[i] pets on (the words live in the door data)
const AT = [0, 1, 3, 7, 12, 20, 40];

export default function Pet({ copy = [] }: { copy?: string[] }) {
  const reduced = useReducedMotionLive();
  const [pets, setPets] = useState(0);
  const [happy, setHappy] = useState(false);
  const [blink, setBlink] = useState(false);
  const [hearts, setHearts] = useState<number[]>([]);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3200);
    return () => clearInterval(id);
  }, [reduced]);
  useEffect(() => {
    if (!happy) return;
    const id = setTimeout(() => setHappy(false), 700);
    return () => clearTimeout(id);
  }, [happy, pets]);

  const frame = happy ? "happy" : blink ? "blink" : "idle";
  const at = AT.findLastIndex((n) => pets >= n);
  const line = copy[Math.min(at, copy.length - 1)] ?? "";

  return (
    <div className="adv-toy adv-pet">
      <button
        type="button"
        className="adv-pet-btn"
        aria-label={`pet tofu (${pets} so far)`}
        onClick={() => {
          setPets((p) => p + 1);
          setHappy(true);
          if (!reduced) setHearts((h) => [...h.slice(-5), Date.now()]);
        }}
      >
        {hearts.map((k) => (
          <span key={k} className="adv-heart" aria-hidden onAnimationEnd={() => setHearts((h) => h.filter((x) => x !== k))}>
            {"<3"}
          </span>
        ))}
        <pre aria-hidden>{dress(framesData.frames[frame].join("\n"), framesData.hats.winter)}</pre>
      </button>
      <p className="adv-toy-line" aria-live="polite">
        {line}
        {pets ? <span className="adv-dim"> · pets: {pets}</span> : null}
      </p>
    </div>
  );
}
