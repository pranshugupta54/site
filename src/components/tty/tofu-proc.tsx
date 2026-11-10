"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import framesData from "@/data/tofu-frames.json";
import quips from "@/data/quips.json";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";
import { POSES, moodNow, timedQuip, type Mood } from "@/lib/tofu-mood";
import { MOOD_WORD } from "@/lib/vitals";
import { useReducedMotionLive } from "@/lib/reduced-motion";

const FRAMES = framesData.frames as Record<string, string[]>;
const frame = (k: string) => (FRAMES[k] ?? FRAMES.idle).join("\n");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tofu as a process in the side pane: the same frames as the roaming tofu,
 * its mood from Pranshu's clock, the season's hat, a quip on hover. Click → /tofu.
 * First paint is the plain idle frame on server and client alike; the mood and
 * the animation start after mount.
 */
export function TofuProc() {
  const { season } = useAppearance();
  const reduce = useReducedMotionLive();
  const hat = season ? HATS[season.id] : undefined;
  const [key, setKey] = useState("idle");
  const [mood, setMood] = useState<Mood | null>(null);
  const [quip, setQuip] = useState<string | null>(null);
  const hover = useRef(false);
  const lastQuip = useRef<string | null>(null);

  // mood: Pranshu's hour, checked once a minute
  useEffect(() => {
    const tick = () => setMood(moodNow());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  // the frame loop: asleep at night, otherwise idle with blinks and the mood's habit
  useEffect(() => {
    if (!mood) return;
    let alive = true;
    const run = async () => {
      if (mood === "night" && !hover.current) {
        setKey("sleep");
        return;
      }
      setKey("idle");
      if (reduce) return;
      while (alive) {
        await wait(2200 + Math.random() * 2600);
        if (!alive) return;
        const pose = !hover.current && mood !== "day" && Math.random() < 0.35 ? POSES[mood === "morning" ? "coffee" : mood === "evening" ? "yawn" : "slowBlink"] : null;
        const seq: [string, number][] = pose ?? (hover.current ? [["happy", 900]] : [["blink", 160]]);
        for (const [f, ms] of seq) {
          if (!alive) return;
          setKey(f);
          await wait(ms);
        }
        if (alive) setKey("idle");
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [mood, reduce]);

  const sayHi = () => {
    hover.current = true;
    const pool: string[] = season?.quips ? [...quips, ...season.quips] : quips;
    const timed = mood ? timedQuip(mood, lastQuip.current) : null;
    let q = timed ?? pool[Math.floor(Math.random() * pool.length)];
    if (q === lastQuip.current && pool.length > 1) q = pool[(pool.indexOf(q) + 1) % pool.length];
    lastQuip.current = q;
    setQuip(q);
    setKey(mood === "night" ? "blink" : "happy");
  };
  const bye = () => {
    hover.current = false;
    setQuip(null);
    setKey(mood === "night" ? "sleep" : "idle");
  };

  const state = mood ? (key === "sleep" ? "asleep" : MOOD_WORD[mood]) : "awake";

  return (
    <Link
      href="/tofu"
      className="tty-box tty-tofu"
      onMouseEnter={sayHi}
      onMouseLeave={bye}
      onFocus={sayHi}
      onBlur={bye}
      aria-label="tofu, the ai that runs this site. visit tofu's room"
    >
      <span className="tty-box-t">
        tofu · pid 54 · {state}
      </span>
      {season?.snow ? (
        <span className="tty-snow" aria-hidden>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ left: `${6 + i * 11}%`, animationDelay: `${-i * 1.3}s` }}>
              {i % 3 ? "·" : "*"}
            </i>
          ))}
        </span>
      ) : null}
      <pre className="tty-tofu-frame" aria-hidden>
        {dress(frame(key), hat)}
      </pre>
      <span className="tty-tofu-say">{quip ? `"${quip}"` : "i run this place. pranshu builds it."}</span>
    </Link>
  );
}
