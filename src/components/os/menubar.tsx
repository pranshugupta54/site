"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAppearance } from "@/components/providers";
import { useSiteVitals } from "@/components/vitals";
import { CopyCommand } from "@/components/copy-command";
import { SITE } from "@/lib/site";
import { HERTZ_INSTALL } from "@/lib/shell-eggs";
import type { AppId } from "./wm";

// ── clock (pranshu's time, IST — the same clock tofu keeps) ──
let clockFmt: Intl.DateTimeFormat | null = null;
const clockNow = () => {
  clockFmt ??= new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(clockFmt.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month}  ${p.hour}:${p.minute}`.toLowerCase();
};
const everyFewSeconds = (tick: () => void) => {
  const id = setInterval(tick, 5000);
  return () => clearInterval(id);
};
const noClock = () => "";

// Pranshu's sky (northern hemisphere, IST) when no festival is on
let monthFmt: Intl.DateTimeFormat | null = null;
function skySeason(): string {
  monthFmt ??= new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, month: "numeric" });
  const m = Number(monthFmt.format(new Date()));
  return m === 12 || m <= 2 ? "winter" : m <= 5 ? "spring" : m <= 8 ? "summer" : "autumn";
}
const noSky = () => "";
const noSubscribe = () => () => {};

export type MenuWin = { id: string; title: string; min: boolean; active: boolean };

type Menu = "logo" | "window" | "vitals" | null;

export function MenuBar({
  appName,
  wins,
  openApp,
  focusWin,
  minActive,
  zoomActive,
  closeActive,
}: {
  appName: string;
  wins: MenuWin[];
  openApp: (id: AppId) => void;
  focusWin: (id: string) => void;
  minActive: () => void;
  zoomActive: () => void;
  closeActive: () => void;
}) {
  const router = useRouter();
  const { theme, skin, season, toggleTheme, cycleSkin } = useAppearance();
  const v = useSiteVitals();
  const clock = useSyncExternalStore(everyFewSeconds, clockNow, noClock);
  const sky = useSyncExternalStore(noSubscribe, skySeason, noSky);
  const [menu, setMenu] = useState<Menu>(null);
  const bar = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  // outside click / Esc closes; Esc is ours while a menu is up (capture, before the desktop's)
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setMenu(null);
      opener.current?.focus();
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key, true);
    };
  }, [menu]);

  // a keyboard-opened menu puts focus on its first item
  useEffect(() => {
    if (menu) bar.current?.querySelector<HTMLElement>(`[data-menu="${menu}"] [role="menuitem"]`)?.focus();
  }, [menu]);

  const toggle = (m: Exclude<Menu, null>, e: React.MouseEvent<HTMLButtonElement>) => {
    opener.current = e.currentTarget;
    setMenu((cur) => (cur === m ? null : m));
  };
  // hovering across the bar with a menu open switches menus, like the real thing
  const hover = (m: Exclude<Menu, null>, e: React.MouseEvent<HTMLButtonElement>) => {
    if (menu && menu !== m) {
      opener.current = e.currentTarget;
      setMenu(m);
    }
  };
  const run = (f: () => void) => () => {
    setMenu(null);
    f();
  };
  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  };

  const active = wins.find((w) => w.active);
  const ago = v.deployed?.replace(/^deployed /, "").replace(/ ago$/, "");
  const seasonLabel = season ? `${season.ambient ? `${season.ambient} ` : ""}${season.name}` : sky;

  const item = (label: string, onClick: () => void, hint?: string, disabled = false) => (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      className="os-menu-item"
      onClick={run(onClick)}
    >
      <span>{label}</span>
      {hint ? <span className="os-menu-hint">{hint}</span> : null}
    </button>
  );

  return (
    <div ref={bar} className="os-menubar" role="menubar" aria-label="menu bar">
      <div className="relative">
        <button
          type="button"
          className="os-mb-item"
          aria-haspopup="menu"
          aria-expanded={menu === "logo"}
          aria-label="p54 menu"
          onClick={(e) => toggle("logo", e)}
          onMouseEnter={(e) => hover("logo", e)}
        >
          <span className="os-mb-logo">p54</span>
        </button>
        {menu === "logo" && (
          <div className="os-menu" role="menu" data-menu="logo" style={{ left: 0 }} onKeyDown={onMenuKey}>
            {item("about pranshu", () => openApp("about"))}
            {item("tofu's room", () => openApp("tofu"))}
            {item("terminal", () => openApp("terminal"))}
            <div className="os-menu-sep" />
            {item("theme", toggleTheme, theme)}
            {item("skin", cycleSkin, skin)}
            <div className="os-menu-sep" />
            {item("back to p54.dev", () => router.push("/"), "↩")}
          </div>
        )}
      </div>

      <span className="os-mb-item font-semibold" aria-live="polite">
        {appName}
      </span>

      <div className="relative">
        <button
          type="button"
          className="os-mb-item"
          aria-haspopup="menu"
          aria-expanded={menu === "window"}
          onClick={(e) => toggle("window", e)}
          onMouseEnter={(e) => hover("window", e)}
        >
          window
        </button>
        {menu === "window" && (
          <div className="os-menu" role="menu" data-menu="window" style={{ left: 0 }} onKeyDown={onMenuKey}>
            {item("minimize", minActive, undefined, !active)}
            {item("zoom", zoomActive, undefined, !active)}
            {item("close", closeActive, "esc", !active)}
            {wins.length > 0 && <div className="os-menu-sep" />}
            {wins.map((w) => (
              <button
                key={w.id}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className="os-menu-item"
                onClick={run(() => focusWin(w.id))}
              >
                <span>
                  <span className="inline-block w-4">{w.active ? "✓" : w.min ? "◇" : ""}</span>
                  {w.title}
                </span>
              </button>
            ))}
            {wins.length === 0 && <p className="os-menu-label">no windows open</p>}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-0.5">
        <div className="relative">
          <button
            type="button"
            className="os-mb-item gap-3"
            aria-haspopup="menu"
            aria-expanded={menu === "vitals"}
            aria-label="site vitals"
            onClick={(e) => toggle("vitals", e)}
            onMouseEnter={(e) => hover("vitals", e)}
          >
            {ago ? <Stat k="site" v={ago} /> : null}
            {v.open !== null ? <Stat k="prs" v={String(v.open)} /> : null}
            {v.mood ? <Stat k="tofu" v={v.mood} /> : null}
          </button>
          {menu === "vitals" && (
            <div className="os-menu w-[290px]" role="menu" data-menu="vitals" data-align="right" style={{ right: 0 }} onKeyDown={onMenuKey}>
              <p className="os-menu-label">vitals</p>
              {v.deployed ? item("site", () => {}, v.deployed) : null}
              {v.short
                ? item("commit", () => window.open(`https://github.com/${SITE.handle}/site/commit/${v.sha}`, "_blank", "noopener"), `${v.short} ↗`)
                : null}
              {v.open !== null
                ? item("tofu's prs", () => window.open(`https://github.com/${SITE.handle}/site/pulls`, "_blank", "noopener"), `${v.open} open ↗`)
                : null}
              {v.mood ? item("tofu", () => openApp("tofu"), v.mood) : null}
              <div className="os-menu-sep" />
              <p className="px-[9px] pb-1 pt-1 font-mono text-[11px] leading-snug text-muted">
                a hertz-style readout of this site. hertz itself watches your mac from the menu bar:
              </p>
              <div className="px-[9px] pb-1.5">
                <CopyCommand inline cmd={HERTZ_INSTALL} />
              </div>
            </div>
          )}
        </div>
        {seasonLabel ? (
          <span className="os-mb-item os-mb-quiet" title={season ? "it's a festival. tofu is dressed for it." : "the season, in india"}>
            {seasonLabel}
          </span>
        ) : null}
        <span className="os-mb-item" title="pranshu's time (ist)" suppressHydrationWarning>
          {clock}
        </span>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[9.5px] uppercase tracking-[0.1em] text-muted">{k}</span>
      <span>{v}</span>
    </span>
  );
}
