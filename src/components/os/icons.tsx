"use client";

import Image from "next/image";
import framesData from "@/data/tofu-frames.json";
import { useAppearance } from "@/components/providers";
import { HATS, dress } from "@/components/tofu";
import { TERM } from "@/components/shell-engine";
import type { AppId } from "./wm";

const IDLE = (framesData.frames as Record<string, string[]>).idle.join("\n");

export type IconId = AppId | "home";

// App icons, drawn from the skin's tokens so they re-tint with every skin,
// theme and season. The terminal keeps the shell's dark palette; about is his photo.
export function AppIcon({ id, size }: { id: IconId; size: number }) {
  const { season } = useAppearance();
  const s = { width: size, height: size };

  if (id === "about")
    return (
      <span className="os-icon" style={s}>
        <Image src="/me.jpeg" alt="" width={size * 2} height={size * 2} className="h-full w-full object-cover" priority />
      </span>
    );

  if (id === "terminal")
    return (
      <span
        className="os-icon"
        style={{ ...s, background: TERM.BG, boxShadow: `inset 0 0 0 1px ${TERM.LINE}, 0 1px 2px rgba(0,0,0,.25)` }}
      >
        <span
          className="absolute font-mono font-semibold"
          style={{ left: size * 0.17, top: size * 0.14, fontSize: size * 0.3, color: TERM.GREEN, lineHeight: 1 }}
        >
          ❯<span style={{ color: TERM.FG }}>_</span>
        </span>
        <span className="absolute inset-x-0 top-0" style={{ height: size * 0.08, background: TERM.LINE }} />
      </span>
    );

  if (id === "tofu")
    return (
      <span className="os-icon grid place-items-center" style={{ ...s, background: "var(--mark)" }}>
        <pre
          aria-hidden
          className="m-0 font-mono text-fg [font-variant-ligatures:none]"
          style={{ fontSize: size * 0.118, lineHeight: 1.1, marginTop: size * 0.02 }}
        >
          {dress(IDLE, season ? HATS[season.id] : undefined)}
        </pre>
      </span>
    );

  if (id === "home")
    return (
      <span className="os-icon grid place-items-center" style={{ ...s, background: "var(--bg)" }}>
        <span className="font-display font-semibold tracking-tight text-fg" style={{ fontSize: size * 0.34 }}>
          p<span className="text-accent">54</span>
        </span>
      </span>
    );

  return (
    <span className="os-icon" style={{ ...s, background: id === "projects" ? "var(--card)" : "var(--bg)" }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="absolute inset-0">
        {id === "projects" && (
          <>
            <path d="M8 15a3 3 0 0 1 3-3h9l3 3h14a3 3 0 0 1 3 3v2H8z" fill="color-mix(in srgb, var(--accent) 55%, var(--card))" />
            <rect x="8" y="18" width="32" height="19" rx="3" fill="var(--accent)" />
            <rect x="8" y="18" width="32" height="2" fill="color-mix(in srgb, var(--bg) 30%, transparent)" />
            <path d="M19 28h10" stroke="color-mix(in srgb, var(--bg) 55%, transparent)" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {id === "notes" && (
          <>
            <rect x="0" y="0" width="48" height="12" fill="color-mix(in srgb, var(--accent) 80%, var(--bg))" />
            {[19, 25, 31, 37].map((y, i) => (
              <path key={y} d={`M9 ${y}h${i === 3 ? 18 : 30}`} stroke="var(--line)" strokeWidth="1.4" strokeLinecap="round" />
            ))}
            <path d="M9 19h14" stroke="var(--muted)" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {id === "reading" && (
          <>
            <path d="M24 15c-4-3-10-3-15-2v21c5-1 11-1 15 2z" fill="var(--card)" stroke="var(--muted)" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M24 15c4-3 10-3 15-2v21c-5-1-11-1-15 2z" fill="var(--card)" stroke="var(--muted)" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M31 12v12l2.5-2 2.5 2V12.4" fill="var(--accent)" />
            {[20, 24, 28].map((y) => (
              <path key={y} d={`M12.5 ${y}c2.5-.4 5-.3 8 .6`} stroke="var(--line)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            ))}
          </>
        )}
      </svg>
    </span>
  );
}
