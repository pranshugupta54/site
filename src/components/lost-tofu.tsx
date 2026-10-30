"use client";

import { useEffect, useState } from "react";
import framesData from "@/data/tofu-frames.json";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";

const FRAMES = framesData.frames as Record<string, string[]>;
const F = (k: string) => FRAMES[k].join("\n");

// Tofu in place, glancing side to side with the odd blink, in the season's
// hat like the roaming one. Static under reduced motion (tracked live).
// Server renders the first frame, so no hydration flash.
export function LostTofu() {
  const { season } = useAppearance();
  const hat = season ? HATS[season.id] : undefined;
  const [frame, setFrame] = useState(F("lost"));

  // one bunny on screen: body[data-lost] parks the roaming Tofu (globals.css)
  useEffect(() => {
    document.body.dataset.lost = "";
    return () => {
      delete document.body.dataset.lost;
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let look = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
    };
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
    const sync = () => {
      stop();
      look = false;
      setFrame(F("lost"));
      if (!mq.matches) timer = setTimeout(tick, 1600);
    };
    sync();
    // Safari < 14 only has the deprecated addListener/removeListener
    const modern = typeof mq.addEventListener === "function";
    if (modern) mq.addEventListener("change", sync);
    else mq.addListener(sync);
    return () => {
      if (modern) mq.removeEventListener("change", sync);
      else mq.removeListener(sync);
      stop();
    };
  }, []);

  // -ml-[2ch] cancels the frame's built-in left padding so the body lines up
  // with the text column
  return (
    <pre
      aria-hidden
      className="m-0 -ml-[2ch] select-none font-mono text-[16px] leading-[1.15] text-muted [font-variant-ligatures:none]"
    >
      {dress(frame, hat)}
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
      <span className="select-none">·</span>
      <span className="min-w-0 truncate">{path}</span>
    </>
  );
}
