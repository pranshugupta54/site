"use client";

import { usePathname } from "next/navigation";
import { useAppearance } from "@/components/providers";
import { isOs } from "@/components/site-chrome";

// A still line of ascii frost across the top of the page, for seasons with `snow` on screens
// too narrow for the gutter snow (<1024px). It sits in normal flow above the page, so it can
// never overlap the hero, and is clipped to the viewport, so it never overflows. Not on /os
// (same rule as the rest of the chrome).
const FROST = "·   *    .  +     ·  *   .     ·    +  *    .   ·     *  .    +   ·    *   .  ·     +    *  .";

export function SeasonFrost() {
  const { season } = useAppearance();
  const path = usePathname();
  if (!season?.snow || isOs(path)) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none select-none overflow-hidden whitespace-nowrap pt-3 text-center font-mono text-[10px] leading-none tracking-[0.12em] text-muted opacity-70 lg:hidden"
    >
      {FROST}
      <br />
      <span className="opacity-60">{FROST.slice(9)}</span>
    </div>
  );
}
