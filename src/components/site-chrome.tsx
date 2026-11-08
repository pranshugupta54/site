"use client";

import { usePathname } from "next/navigation";
import { Tofu } from "@/components/tofu";
import { FooterShell } from "@/components/footer-shell";
import { KeyboardMap } from "@/components/keyboard-map";
import { SeasonAmbient } from "@/components/season-ambient";

// The layout's chrome: roaming tofu, the season glyph, the footer shell, the `?` map.
// /os is a whole desktop with its own tofu, terminal and keys, so it gets none of it.
export function SiteChrome() {
  const path = usePathname();
  if (path === "/os" || path?.startsWith("/os/")) return null;
  return (
    <>
      <Tofu />
      <SeasonAmbient />
      <FooterShell />
      <KeyboardMap />
    </>
  );
}
