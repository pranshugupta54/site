import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";
import framesData from "@/data/tofu-frames.json";

// Social-share cards, rendered with next/og (Satori). One card family: the
// root opengraph-image (home) and /og?title=…&path=…&v=… (every other page).

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = `${SITE.name} — ${SITE.role}`;

// /og responses are cached as immutable for a year, keyed by URL. Bump this
// whenever anything the card draws changes (layout, fonts, colors, the SITE
// fields it shows, tofu's idle frame) so scrapers and CDNs fetch a fresh one.
export const OG_VERSION = "1";

// editorial / light tokens — mirror globals.css (Satori can't read CSS vars)
const C = {
  bg: "#faf6ee",
  fg: "#211c16",
  muted: "#6f675b",
  line: "#e6ddcd",
  accent: "#c2410c",
  mark: "#fbe3c0",
};

// static TTF instances of the site's fonts (Satori can't read woff2 or
// variable fonts); OFL licenses sit next to them. Literal paths so build
// tracing ships them; read on first render, not at import (pages import
// opengraph-image just for its alt/size exports).
let fonts: Promise<Buffer[]> | undefined;
const loadFonts = () =>
  (fonts ??= Promise.all([
    readFile(join(process.cwd(), "src/lib/og/fonts/fraunces-600.ttf")),
    readFile(join(process.cwd(), "src/lib/og/fonts/newsreader-400.ttf")),
    readFile(join(process.cwd(), "src/lib/og/fonts/jetbrains-mono-500.ttf")),
  ]).catch((err) => {
    fonts = undefined; // retry on the next render instead of caching the failure
    throw err;
  }));

const PAD_X = 80;
const TOFU_PX = 30; // mono size of the ascii face
const TITLE_MAX = 90; // graphemes, before clamping with an ellipsis
const PATH_MAX = 48;
const TITLE_WIDTH = 820; // leaves room for tofu at the right
const TITLE_MIN_PX = 48;
// Fraunces 600 glyph widths in em: typical lowercase, and a worst case (w, m, emoji)
const EM_AVG = 0.56;
const EM_WIDE = 1;

// user-perceived characters, so clamping never splits an emoji or surrogate pair
const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const graphemes = (s: string) => Array.from(segmenter.segment(s), (g) => g.segment);

const clamp = (s: string, max: number) => {
  const chars = graphemes(s);
  if (chars.length <= max) return s;
  const cut = chars.slice(0, max).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > cut.length * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

// Words split into wrap points: spaces, and after hyphens (kebab-case slugs).
const segments = (word: string) => word.split(/(?<=-)/);

// Pick a size that fits the title in ~3 lines. Shrink so the longest word
// stays on one line; only words too long for that fall back to breaking
// after their hyphens, and below TITLE_MIN_PX, anywhere (see Words).
function titleSize(title: string) {
  const n = graphemes(title).length;
  const byLength = n <= 10 ? 140 : n <= 18 ? 112 : n <= 30 ? 92 : n <= 48 ? 76 : n <= 72 ? 64 : 54;
  const fit = (runs: string[]) =>
    Math.floor(TITLE_WIDTH / (Math.max(...runs.map((r) => graphemes(r).length)) * EM_AVG));
  const words = title.split(" ");
  const whole = fit(words);
  return Math.max(TITLE_MIN_PX, Math.min(byLength, whole >= 64 ? whole : fit(words.flatMap(segments))));
}

// Runs wider than the column: possibly (worst-case glyphs), or likely (typical).
const width = (run: string, size: number, em: number) => graphemes(run).length * em * size;
const mayOverflow = (run: string, size: number) => width(run, size, EM_WIDE) > TITLE_WIDTH;
const likelyWraps = (run: string, size: number) => width(run, size, EM_AVG) > TITLE_WIDTH;

// Words as wrapping flex items, so one of them can carry the marker
// highlight the hero's lead line uses.
function Words({ text, size, mark }: { text: string; size: number; mark: (i: number, w: string) => boolean }) {
  const words = text.split(" ").filter(Boolean);
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {words.flatMap((w, i) =>
        segments(w).map((s, j, all) => (
          <div
            key={`${i}-${j}`}
            style={{
              display: "flex",
              position: "relative",
              maxWidth: TITLE_WIDTH,
              marginRight: j === all.length - 1 ? size * 0.24 : 0,
              // break runs that could escape the title box between any glyphs
              wordBreak: mayOverflow(s, size) ? "break-all" : "normal",
            }}
          >
            {/* no marker on words that wrap mid-run: it would span the whole box */}
            {mark(i, w) && !segments(w).some((r) => likelyWraps(r, size)) && (
              <div
                style={{
                  position: "absolute",
                  left: j === 0 ? -size * 0.03 : 0,
                  right: j === all.length - 1 ? -size * 0.03 : 0,
                  bottom: size * 0.1,
                  height: size * 0.42,
                  background: C.mark,
                  borderRadius: 4,
                }}
              />
            )}
            <span>{s}</span>
          </div>
        ))
      )}
    </div>
  );
}

function Tofu() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        marginBottom: -14, // loaf's bottom edge rests on the rule
        fontFamily: "JetBrains Mono",
        fontSize: TOFU_PX,
        lineHeight: 1.15,
        color: C.fg,
      }}
    >
      {framesData.frames.idle.map((row, i) => (
        <div key={i} style={{ display: "flex", whiteSpace: "pre" }}>
          {row}
        </div>
      ))}
    </div>
  );
}

function Card({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: C.bg,
        color: C.fg,
        padding: `64px ${PAD_X}px 52px`,
        fontFamily: "JetBrains Mono",
      }}
    >
      {/* prompt-style location, like the footer shell */}
      <div style={{ display: "flex", alignItems: "center", fontSize: 28 }}>
        <span style={{ color: C.muted }}>~</span>
        <span
          style={{ color: C.accent, maxWidth: 980, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
        >
          {path}
        </span>
        <div style={{ width: 14, height: 30, marginLeft: 10, background: C.accent, opacity: 0.85 }} />
      </div>

      <div style={{ display: "flex", flexGrow: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", width: TITLE_WIDTH, paddingBottom: 30 }}>
          {children}
        </div>
        {/* tofu sits on the rule */}
        <Tofu />
      </div>

      <div style={{ display: "flex", height: 2, background: C.line }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 22, color: C.muted }}>
        <span>{`${SITE.name} · ${SITE.role}`.toLowerCase()}</span>
        <span>p54.dev</span>
      </div>
    </div>
  );
}

function HomeCard() {
  // SITE.lead marks its highlighted word as {word}
  const lead = SITE.lead.replace(/^I /, "i ");
  const marked = lead.match(/\{(.+?)\}/)?.[1];
  return (
    <Card path="">
      <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 150, lineHeight: 1, letterSpacing: -4 }}>
        {SITE.first}
      </div>
      <div style={{ display: "flex", marginTop: 28, fontFamily: "Newsreader", fontSize: 40, lineHeight: 1.3, color: C.fg }}>
        <Words text={lead.replace(/[{}]/g, "")} size={40} mark={(_, w) => w === marked} />
      </div>
    </Card>
  );
}

function PageCard({ title, path }: { title: string; path: string }) {
  const size = titleSize(title);
  // marker on the last word, unless clamping already cut the title short
  const last = title.endsWith("…") ? -1 : title.split(" ").filter(Boolean).length - 1;
  return (
    <Card path={path}>
      <div
        style={{
          display: "flex",
          fontFamily: "Fraunces",
          fontSize: size,
          lineHeight: 1.04,
          letterSpacing: -size * 0.025,
        }}
      >
        <Words text={title} size={size} mark={(i) => i === last} />
      </div>
    </Card>
  );
}

// No title → the home card. Titles and paths are lowercased and clamped.
export async function ogImage({ title, path }: { title?: string | null; path?: string | null } = {}) {
  const [fraunces, newsreader, mono] = await loadFonts();
  const t = clamp((title ?? "").trim().replace(/\s+/g, " ").toLowerCase(), TITLE_MAX);
  const p = clamp((path ?? "").trim().toLowerCase(), PATH_MAX).replace(/^\/?/, "/");
  return new ImageResponse(t ? <PageCard title={t} path={p === "/" ? "" : p} /> : <HomeCard />, {
    ...OG_SIZE,
    fonts: [
      { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
      { name: "Newsreader", data: newsreader, weight: 400, style: "normal" },
      { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
    ],
  });
}
