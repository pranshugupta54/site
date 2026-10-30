"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SITE } from "@/lib/site";
import { moodNow } from "@/lib/tofu-mood";
import { relative } from "@/components/local-time";
import { MOOD_WORD, builtAt, parseOpen, prsLabel, shortSha } from "@/lib/vitals";

// The site's own vitals for the footer shell bar, menu-bar style:
//   site: deployed 2h ago · 316023e    tofu: 4 PRs open · awake
// Every item is live or hidden. Deploy time + sha are inlined at build, on
// Vercel only (next.config.mjs `env`); the PR count comes from /api/pulls;
// relative time + mood (IST, like tofu's frames) are client-only, after mount.
// Colors inherit from the bar: labels dimmed, values at the bar's text color.
const BUILT = builtAt(process.env.SITE_BUILT_AT ?? "");
const SHA = process.env.SITE_COMMIT_SHA ?? "";
const SHORT = shortSha(SHA);

// a clock that ticks once a minute on the client and is null on the server
const everyMinute = (tick: () => void) => {
  const id = setInterval(tick, 60_000);
  return () => clearInterval(id);
};
const thisMinute = () => Math.floor(Date.now() / 60_000) * 60_000;
const onServer = () => null;

export function Vitals() {
  const now = useSyncExternalStore(everyMinute, thisMinute, onServer);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/pulls")
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((body) => live && setOpen(parseOpen(body)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const deployed = BUILT && now !== null ? `deployed ${relative(BUILT)}` : null;
  const mood = now !== null ? MOOD_WORD[moodNow(new Date(now))] : null;
  const tofu = [open !== null ? prsLabel(open) : null, mood].filter((v) => v !== null);
  if (!deployed && !SHORT && !tofu.length) return null;

  const dot = <span className="select-none opacity-40">·</span>;

  return (
    <div
      aria-label="site vitals"
      className="flex items-baseline gap-x-4 font-mono text-[11px] leading-none"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {(deployed || SHORT) && (
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="opacity-60">site:</span>
          {deployed}
          {deployed && SHORT && dot}
          {SHORT && (
            <a
              href={`https://github.com/${SITE.handle}/site/commit/${SHA}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="underline-offset-2 hover:underline"
            >
              {SHORT}
            </a>
          )}
        </span>
      )}
      {tofu.length > 0 && (
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="opacity-60">tofu:</span>
          {tofu.map((v, i) => (
            <span key={v} className="inline-flex items-baseline gap-1.5">
              {i > 0 && dot}
              {v}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
