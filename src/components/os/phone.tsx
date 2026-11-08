"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "framer-motion";
import framesData from "@/data/tofu-frames.json";
import { useAppearance } from "@/components/providers";
import { useSiteVitals } from "@/components/vitals";
import { HATS, dress } from "@/components/tofu";
import { LocalTime } from "@/components/local-time";
import { prsLabel } from "@/lib/vitals";
import { SITE } from "@/lib/site";
import { APPS, AppView } from "./apps";
import { ProjectDetail } from "./apps/projects";
import type { OsData } from "./data";
import { AppIcon } from "./icons";
import { APP_IDS, type AppId } from "./wm";

const FRAMES = framesData.frames as Record<string, string[]>;
const F = (k: string) => (FRAMES[k] ?? FRAMES.idle).join("\n");
const PHONE_KEY = "p54os:phone:v1";

const GRID: AppId[] = ["notes", "reading", "tofu", "about"];
const DOCK: AppId[] = ["projects", "terminal"];

let timeFmt: Intl.DateTimeFormat | null = null;
const timeNow = () => {
  timeFmt ??= new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return timeFmt.format(new Date());
};
const tick = (f: () => void) => {
  const id = setInterval(f, 5000);
  return () => clearInterval(id);
};
const none = () => "";

function readOpen(): AppId | null {
  try {
    const v = sessionStorage.getItem(PHONE_KEY);
    return v && (APP_IDS as readonly string[]).includes(v) ? (v as AppId) : null;
  } catch {
    return null;
  }
}

// a small tofu that blinks now and then (still under reduced motion)
function WidgetTofu({ still, asleep }: { still: boolean; asleep: boolean }) {
  const { season } = useAppearance();
  const [awakeFrame, setFrame] = useState(F("idle"));
  const frame = asleep ? F("sleep") : awakeFrame;
  useEffect(() => {
    if (still || asleep) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        const r = Math.random();
        setFrame(F(r < 0.3 ? "blink" : r < 0.45 ? "twitch" : r < 0.75 ? "breathe" : "idle"));
        t = setTimeout(() => {
          setFrame(F("idle"));
          loop();
        }, r < 0.3 ? 140 : 600);
      }, 900 + Math.random() * 1400);
    };
    loop();
    return () => clearTimeout(t);
  }, [still, asleep]);
  return (
    <pre aria-hidden className="m-0 font-mono text-[13px] leading-[1.15] text-fg [font-variant-ligatures:none]">
      {dress(frame, season ? HATS[season.id] : undefined)}
    </pre>
  );
}

/** Phones get a home screen: widgets, a grid, a dock. Each app opens full-screen. */
export function Phone({ data }: { data: OsData }) {
  const still = useReducedMotion() ?? false;
  const [open, setOpen] = useState<AppId | null>(readOpen);
  const [leaving, setLeaving] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [snake, setSnake] = useState(false); // the terminal's snake owns Esc while it runs
  const opener = useRef<HTMLElement | null>(null);
  const home = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);
  const back = useRef<HTMLButtonElement>(null);
  const time = useSyncExternalStore(tick, timeNow, none);
  const v = useSiteVitals();
  const { season } = useAppearance();

  useEffect(() => {
    try {
      if (open) sessionStorage.setItem(PHONE_KEY, open);
      else sessionStorage.removeItem(PHONE_KEY);
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    if (open) back.current?.focus({ preventScroll: true });
    else if (refocus.current) {
      // after the close commits: the home screen is no longer inert, so focus can land.
      // A sheet restored from the session has no opener; fall back to its icon.
      refocus.current = false;
      const el = opener.current?.isConnected ? opener.current : home.current?.querySelector<HTMLElement>("button, a");
      el?.focus({ preventScroll: true });
    }
  }, [open]);

  const launch = (id: AppId, e: React.MouseEvent<HTMLElement>) => {
    opener.current = e.currentTarget;
    setDetail(null);
    setLeaving(false);
    setOpen(id);
  };
  const goHome = useCallback(() => {
    const done = () => {
      setOpen(null);
      setLeaving(false);
      setDetail(null);
      refocus.current = true;
    };
    if (still) return done();
    setLeaving(true);
    setTimeout(done, 210);
  }, [still]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || snake) return;
      if (detail) setDetail(null);
      else goHome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, detail, goHome, snake]);

  const appBtn = (id: AppId) => (
    <button key={id} type="button" className="os-app-btn" onClick={(e) => launch(id, e)} aria-label={APPS[id].name}>
      <AppIcon id={id} size={60} />
      <span className="os-app-label">{APPS[id].name}</span>
    </button>
  );

  const mood = v.mood ? `tofu is ${v.mood}` : "tofu";
  const note = data.notes[0];
  const pick = data.reading[0];

  return (
    <>
    <div ref={home} className="os-phone" inert={!!open}>
      <div className="os-status" aria-hidden>
        <span suppressHydrationWarning>{time}</span>
        <span className="font-normal text-muted">{season ? `${season.ambient ?? ""} ${season.name}` : "p54 os"}</span>
      </div>

      {/* sections share the height evenly, so no band of the screen sits empty */}
      <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-4 pb-3 pt-2">
      <div className="grid grid-cols-2 gap-4 px-5">
        <button type="button" onClick={(e) => launch("about", e)} className="os-widget p-4" aria-label="about pranshu">
          <Image src="/me.jpeg" alt="" width={88} height={88} className="h-11 w-11 rounded-full object-cover" priority />
          <span className="mt-auto block pt-5 font-display text-[16px] font-semibold leading-tight tracking-tight">{SITE.name}</span>
          <span className="mt-1 block font-mono text-[10.5px] text-muted">{SITE.role}</span>
        </button>
        <button type="button" onClick={(e) => launch("tofu", e)} className="os-widget p-4" aria-label="tofu's room">
          <WidgetTofu still={still} asleep={v.mood === "asleep"} />
          <span className="mt-auto block pt-4 font-mono text-[12px] leading-tight">{mood}</span>
          <span className="mt-1 block font-mono text-[10.5px] text-muted">
            {v.open !== null ? prsLabel(v.open) : "runs this site"}
          </span>
        </button>
      </div>

      {data.latestLog ? (
        <div className="px-5">
          <button type="button" onClick={(e) => launch("tofu", e)} className="os-widget w-full p-4" aria-label="tofu's latest worklog entry">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">tofu&apos;s log · latest</span>
            <span className="mt-2 line-clamp-3 text-[14px] leading-snug">
              <span aria-hidden>{data.latestLog.mood} </span>
              {data.latestLog.text}
            </span>
            <LocalTime iso={data.latestLog.t} className="mt-2 font-mono text-[10.5px] text-muted" />
          </button>
        </div>
      ) : null}

      <div className="os-home-grid">{GRID.map(appBtn)}</div>

      {note || pick ? (
        // only where the screen has room for a second row of widgets
        <div className="grid grid-cols-2 gap-4 px-5 [@media(max-height:740px)]:hidden">
          {note ? (
            <button type="button" onClick={(e) => launch("notes", e)} className="os-widget p-4" aria-label={`latest note: ${note.title}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">latest note</span>
              <span className="mt-2 line-clamp-3 font-display text-[15px] font-semibold leading-snug tracking-tight">{note.title}</span>
              <span className="mt-auto block pt-3 font-mono text-[10.5px] text-muted">
                {note.date} · {note.minutes} min
              </span>
            </button>
          ) : null}
          {pick ? (
            <button type="button" onClick={(e) => launch("reading", e)} className="os-widget p-4" aria-label={`latest reading pick: ${pick.title}`}>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">reading · latest</span>
              <span className="mt-2 line-clamp-3 text-[14px] leading-snug">{pick.title}</span>
              <span className="mt-auto block truncate pt-3 font-mono text-[10.5px] text-muted">{pick.source}</span>
            </button>
          ) : null}
        </div>
      ) : null}
      </div>

      <div>
        <div className="mb-3 flex justify-center gap-1.5" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-fg/70" />
        </div>
        <nav aria-label="dock" className="os-phone-dock">
          {DOCK.map(appBtn)}
          <Link href="/" className="os-app-btn" aria-label="back to p54.dev">
            <AppIcon id="home" size={60} />
            <span className="os-app-label">p54.dev</span>
          </Link>
        </nav>
      </div>
    </div>

      {open ? (
        <div className="os-sheet" data-leaving={leaving || undefined} role="dialog" aria-label={APPS[open].title}>
          <div className="os-sheet-bar">
            <button
              ref={back}
              type="button"
              onClick={() => (detail ? setDetail(null) : goHome())}
              className="-ml-1 rounded-md px-2 py-2 text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              ‹ {detail ? "projects" : "home"}
            </button>
            <span className="absolute left-1/2 -translate-x-1/2 truncate text-fg">{detail ?? APPS[open].title}</span>
          </div>
          <div className={`os-sheet-body ${open === "terminal" ? "flex flex-col" : ""}`} style={open === "terminal" ? { background: "rgb(15,18,17)" } : undefined}>
            {open === "projects" && detail ? (
              <ProjectDetail name={detail} repos={data.repos} featured={data.featured} />
            ) : (
              <AppView
                kind={open}
                ctx={{
                  data,
                  compact: true,
                  openApp: (id) => {
                    setDetail(null);
                    setOpen(id);
                  },
                  openProject: setDetail,
                  close: goHome,
                  onSnake: setSnake,
                  active: true,
                }}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
