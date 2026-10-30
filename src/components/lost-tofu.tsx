"use client";

import { useEffect, useState } from "react";
import framesData from "@/data/tofu-frames.json";

const FRAMES = framesData.frames as Record<string, string[]>;
const F = (k: string) => FRAMES[k].join("\n");

// Tofu in place, glancing side to side with the odd blink. Static under
// reduced motion. Server renders the first frame, so no hydration flash.
export function LostTofu() {
  const [frame, setFrame] = useState(F("lost"));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let look = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (Math.random() < 0.18) {
        setFrame(F("lostBlink"));
        timer = setTimeout(() => {
          setFrame(F(look ? "lostLook" : "lost"));
          timer = setTimeout(tick, 900 + Math.random() * 900);
        }, 130);
        return;
      }
      look = !look;
      setFrame(F(look ? "lostLook" : "lost"));
      timer = setTimeout(tick, 1400 + Math.random() * 1200);
    };
    timer = setTimeout(tick, 1600);
    return () => clearTimeout(timer);
  }, []);

  // -ml-[2ch] cancels the frame's built-in left padding so the body lines up
  // with the text column
  return (
    <pre
      aria-hidden
      className="m-0 -ml-[2ch] select-none font-mono text-[16px] leading-[1.15] text-muted"
    >
      {frame}
    </pre>
  );
}

// The path that 404'd. Read after mount: the not-found page is prerendered
// once, so the server never knows which url brought you here.
export function LostPath() {
  const [path, setPath] = useState("");
  useEffect(() => setPath(window.location.pathname), []);
  if (!path) return null;
  return (
    <>
      <span className="select-none text-line">·</span>
      <span className="min-w-0 truncate">{path}</span>
    </>
  );
}
