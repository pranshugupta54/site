"use client";

import { useAppearance } from "@/components/providers";

export function AppearanceSwitcher() {
  const { skin, theme, cycleSkin, toggleTheme } = useAppearance();
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <button
        type="button"
        onClick={cycleSkin}
        title="switch skin"
        className="rounded-full border border-line px-2.5 py-1 text-muted transition-colors hover:text-fg"
      >
        ◍<span className="hidden sm:inline"> {skin}</span>
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        title="toggle theme"
        className="rounded-full border border-line px-2.5 py-1 text-muted transition-colors hover:text-fg"
      >
        {theme === "dark" ? "☾" : "☀"}
      </button>
    </div>
  );
}
