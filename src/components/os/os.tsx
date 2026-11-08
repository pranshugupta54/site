"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import framesData from "@/data/tofu-frames.json";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";
import type { OsData } from "./data";
import { Desktop } from "./desktop";
import { Phone } from "./phone";
import "./os.css";

const PHONE = "(max-width: 767px)";
const watchPhone = (f: () => void) => {
  const mq = matchMedia(PHONE);
  mq.addEventListener("change", f);
  return () => mq.removeEventListener("change", f);
};
const isPhone = () => matchMedia(PHONE).matches;
const onServer = () => null;

const BOOT_KEY = "p54os:booted";
const BOOT_MS = 860; // face + bar; the fade-out adds ~240ms on top
const FACE = (framesData.frames as Record<string, string[]>).idle.join("\n");

type Boot = "on" | "out" | "off";

// once per tab, and never for anyone who asked for less motion
function firstBoot(): Boot {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return "off";
    return sessionStorage.getItem(BOOT_KEY) ? "off" : "on";
  } catch {
    return "off";
  }
}

/** a short boot: tofu's face, a thin bar, then the desktop. A click or any key skips it. */
function BootScreen({ phase, skip, done }: { phase: Boot; skip: () => void; done: () => void }) {
  const { season } = useAppearance();
  useEffect(() => {
    try {
      sessionStorage.setItem(BOOT_KEY, "1");
    } catch {
      /* ignore */
    }
    const t = setTimeout(skip, BOOT_MS);
    // the key that skips the boot shouldn't also land on the desktop
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      skip();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [skip]);
  return (
    <div
      className="os-boot"
      data-out={phase === "out" || undefined}
      aria-hidden
      onPointerDown={skip}
      onAnimationEnd={(e) => e.animationName === "os-boot-out" && done()}
    >
      <pre>{dress(FACE, season ? HATS[season.id] : undefined)}</pre>
      <div className="os-boot-bar">
        <span />
      </div>
    </div>
  );
}

/**
 * p54 os: the site as a tiny desktop. The wallpaper renders on the server;
 * the desktop (or, below 768px, a phone home screen) mounts on the client,
 * where it can know the screen it's on and what this tab already had open.
 */
export function Os(data: OsData) {
  const phone = useSyncExternalStore(watchPhone, isPhone, onServer);
  // read during hydration but only used once `phone` is known (client-only)
  const [boot, setBoot] = useState<Boot>(firstBoot);
  const [skip] = useState(() => () => setBoot((b) => (b === "on" ? "out" : b)));
  const [done] = useState(() => () => setBoot("off"));
  return (
    <div className="os-root">
      <div className="os-wall" aria-hidden>
        <span className="os-sig">pranshu</span>
      </div>
      <h1 className="sr-only">p54 os — pranshu gupta&apos;s site, as a desktop</h1>
      {phone === null || boot === "on" ? null : phone ? <Phone data={data} /> : <Desktop data={data} />}
      {phone !== null && boot !== "off" ? <BootScreen phase={boot} skip={skip} done={done} /> : null}
    </div>
  );
}
