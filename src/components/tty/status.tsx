"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useAppearance } from "@/components/providers";
import { useSiteVitals } from "@/components/vitals";
import { NewYearBurst } from "@/components/new-year-burst";
import { newYearState, newYearTarget } from "@/data/seasons";
import { now } from "@/lib/clock";
import { twelveHour } from "@/lib/tty";
import { CURRENT } from "@/lib/versions";
import { prsLabel } from "@/lib/vitals";
import { SITE } from "@/lib/site";

// the visitor's clock (honoring ?now=), once a minute on the client, null on the server
const everyMinute = (tick: () => void) => {
  const id = setInterval(tick, 60_000);
  return () => clearInterval(id);
};
const clockKey = () => twelveHour(now());
const onServer = () => null;

/**
 * tmux's status line, for the home page:
 *   ● main · deployed 2h ago · 316023e │ 9:30 pm · ❄ winter │ paper·light · v2 · versions →
 * Every reading is live or hidden (the vitals). On dec 31 the season slot
 * becomes the new-year countdown, and the year turning sets off the burst.
 */
export function TtyStatus() {
  const { season, skin, theme, cycleSkin, toggleTheme } = useAppearance();
  const { deployed, short, sha, open } = useSiteVitals();
  const time = useSyncExternalStore(everyMinute, clockKey, onServer);
  const [newYear, setNewYear] = useState<{ label: string; msLeft: number } | null>(null);
  const [burst, setBurst] = useState<number | null>(null);

  const newYearOn = !!season?.newYear;
  useEffect(() => {
    if (!newYearOn) return;
    let prev: number | null = null;
    const tick = () => {
      const t = now();
      const st = newYearState(t);
      setNewYear(st);
      if (st && prev && st.msLeft === 0) setBurst(newYearTarget(t));
      prev = st ? st.msLeft : null;
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      setNewYear(null);
    };
  }, [newYearOn]);

  const glyph = season?.snow ? "❄" : season?.ambient;
  const seasonText = newYearOn && newYear ? newYear.label : season ? `${glyph ? `${glyph} ` : ""}${season.name}` : null;

  return (
    <>
      {burst ? <NewYearBurst year={burst} onDone={() => setBurst(null)} /> : null}
      <footer className="tty-status" aria-label="status line">
        <span className="tty-seg">
          <span className="tty-ok">●</span> main
          {deployed ? <span className="tty-seg-x"> · {deployed}</span> : null}
          {short ? (
            <>
              <span className="tty-seg-x"> · </span>
              <a className="tty-seg-x" href={`https://github.com/${SITE.handle}/site/commit/${sha}`} target="_blank" rel="noreferrer">
                {short}
              </a>
            </>
          ) : null}
          {open !== null ? <span className="tty-seg-x tty-wide"> · tofu: {prsLabel(open)}</span> : null}
        </span>
        <span className="tty-seg tty-mid">
          {time ? <span>{time}</span> : null}
          {seasonText ? (
            <span className={newYear?.msLeft === 0 ? "tty-ok" : undefined}>
              {time ? " · " : ""}
              {seasonText}
            </span>
          ) : null}
        </span>
        <span className="tty-seg tty-right">
          <button type="button" onClick={cycleSkin} title="cycle the terminal theme" className="tty-wide">
            {skin}
          </button>
          <span className="tty-wide">·</span>
          <button type="button" onClick={toggleTheme} title="light / dark">
            {theme}
          </button>
          <span>·</span>
          <Link href="/versions">v{CURRENT.version} · versions →</Link>
        </span>
      </footer>
    </>
  );
}
