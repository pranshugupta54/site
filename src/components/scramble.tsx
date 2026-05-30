"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}=+*^?#abcdef0123456789";

type Props = {
  text: string;
  className?: string;
  hover?: boolean;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  speedMs?: number; // ms per frame (lower = faster)
  reveal?: number; // chars locked in per frame (higher = faster)
};

export function Scramble({
  text,
  className,
  hover = false,
  delay = 0,
  as = "span",
  speedMs = 30,
  reveal = 0.5,
}: Props) {
  const [out, setOut] = useState(text); // SSR + first paint render the real text
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const run = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setOut(text);
      return;
    }
    if (timer.current) clearInterval(timer.current);
    const chars = text.split("");
    let frame = 0;
    timer.current = setInterval(() => {
      setOut(
        chars
          .map((c, i) =>
            i < (frame - 4) * reveal
              ? c
              : c === " "
              ? " "
              : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          )
          .join("")
      );
      frame++;
      if (frame > chars.length / reveal + 6) {
        if (timer.current) clearInterval(timer.current);
        setOut(text);
      }
    }, speedMs);
  }, [text, speedMs, reveal]);

  useEffect(() => {
    const t = setTimeout(run, delay);
    return () => {
      clearTimeout(t);
      if (timer.current) clearInterval(timer.current);
    };
  }, [run, delay]);

  const Tag = as as any;
  return (
    <Tag className={className} onMouseEnter={hover ? run : undefined}>
      {out}
    </Tag>
  );
}
