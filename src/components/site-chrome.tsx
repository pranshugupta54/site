"use client";

import { usePathname } from "next/navigation";
import { Tofu } from "@/components/tofu";
import { FooterShell } from "@/components/footer-shell";
import { KeyboardMap } from "@/components/keyboard-map";
import { SeasonAmbient } from "@/components/season-ambient";
import { SeasonSnow } from "@/components/season-snow";

// The layout's chrome: roaming tofu, the season glyph and snow, the footer shell, the `?` map.
// /os is a whole desktop with its own tofu, terminal and keys, so it gets none of it.
export const isOs = (path: string | null) => path === "/os" || !!path?.startsWith("/os/");
// /room has tofu asleep on the keyboard, so the roaming one stays out
const isRoom = (path: string | null) => path === "/room";

export function SiteChrome() {
  const path = usePathname();
  if (isOs(path)) return null;
  return (
    <>
      <SeasonSnow />
      {isRoom(path) ? null : <Tofu />}
      <SeasonAmbient />
      <FooterShell />
      <KeyboardMap />
    </>
  );
}
