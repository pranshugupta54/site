import { ImageResponse } from "next/og";
import { C, Tofu, loadFonts } from "@/lib/og/card";
import { OG_SIZE } from "@/lib/og/image";
import type { Slide } from "@/lib/wrapped";

// /wrapped share cards, one per slide: the slide's big number in mono, its viz
// when one fits, tofu on the rule. Rendered by src/app/wrapped/og/route.tsx.

const LEVEL = [C.line, "#f5c99a", "#eb9a5c", "#d86a2a", C.accent];

function valueSize(v: string) {
  const len = [...v].length;
  return len <= 5 ? 220 : len <= 8 ? 170 : len <= 12 ? 124 : len <= 18 ? 88 : len <= 32 ? 64 : 52;
}

function Heatmap({ levels, pad }: { levels: number[]; pad: number }) {
  const cells = [...Array<number>(pad).fill(-1), ...levels];
  const weeks: number[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const size = Math.min(12, Math.floor(820 / weeks.length) - 3);
  return (
    <div style={{ display: "flex", gap: 3, marginTop: 24 }}>
      {weeks.map((w, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {w.map((l, j) => (
            <div key={j} style={{ width: size, height: size, borderRadius: 2, background: l < 0 ? "transparent" : LEVEL[l] }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Bars({ labels, values, hi }: { labels: string[]; values: number[]; hi: number }) {
  const max = Math.max(1, ...values);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 24, height: 120 }}>
      {values.map((v, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ width: 40, height: Math.max(4, Math.round((v / max) * 92)), borderRadius: 3, background: i === hi ? C.accent : C.line }} />
          <span style={{ fontSize: 18, color: i === hi ? C.accent : C.muted }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export async function wrappedOg({ slide, index, count, title }: { slide: Slide; index: number; count: number; title: string }) {
  const [fraunces, newsreader, mono] = await loadFonts();
  const viz = slide.viz?.kind;
  // a chart under the number takes room from it
  const big = Math.min(valueSize(slide.value), viz === "heatmap" || viz === "bars" ? 132 : viz === "grid" ? 150 : 999);
  const prose = slide.id === "read"; // a title, not a number: set it like a headline
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: "52px 72px 44px", fontFamily: "JetBrains Mono" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: C.muted }}>~</span>
            <span style={{ color: C.accent }}>{slide.id === "intro" ? "/wrapped" : `/wrapped/${slide.id}`}</span>
            <div style={{ width: 13, height: 28, marginLeft: 10, background: C.accent, opacity: 0.85 }} />
          </div>
          {/* the story's progress bar, frozen at this slide */}
          <div style={{ display: "flex", gap: 6 }}>
            {Array.from({ length: count }, (_, i) => (
              <div key={i} style={{ width: 26, height: 6, borderRadius: 3, background: i <= index ? C.accent : C.line }} />
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexGrow: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 860, paddingBottom: 26 }}>
            <span style={{ fontSize: 28, color: C.muted }}>{slide.kicker}</span>
            <div
              style={{
                display: "flex",
                marginTop: 6,
                fontFamily: prose ? "Fraunces" : "JetBrains Mono",
                fontSize: big,
                lineHeight: prose ? 1.05 : 0.98,
                letterSpacing: prose ? -big * 0.02 : -big * 0.04,
              }}
            >
              {slide.value}
            </div>
            {slide.unit ? (
              <span style={{ display: "flex", marginTop: 14, fontSize: 32, color: C.fg }}>
                <span style={{ background: C.mark, padding: "0 8px" }}>{slide.unit}</span>
              </span>
            ) : null}
            {slide.viz?.kind === "heatmap" ? <Heatmap levels={slide.viz.levels} pad={slide.viz.pad} /> : null}
            {slide.viz?.kind === "bars" ? <Bars {...slide.viz} /> : null}
            {slide.viz?.kind === "grid" ? (
              <div style={{ display: "flex", gap: 36, marginTop: 26 }}>
                {slide.viz.cells.slice(0, 4).map((c) => (
                  <div key={c.label} style={{ display: "flex", flexDirection: "column", borderTop: `2px solid ${C.line}`, paddingTop: 8 }}>
                    <span style={{ fontSize: 40, lineHeight: 1.1 }}>{c.value}</span>
                    <span style={{ fontSize: 18, color: C.muted }}>{c.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {slide.viz?.kind === "read" ? (
              <span style={{ display: "flex", marginTop: 22, fontFamily: "Newsreader", fontSize: 28, lineHeight: 1.35, color: C.muted }}>
                {`“${slide.viz.take.length > 150 ? `${slide.viz.take.slice(0, slide.viz.take.lastIndexOf(" ", 150))}…` : slide.viz.take}”`}
              </span>
            ) : null}
          </div>
          <Tofu />
        </div>

        <div style={{ display: "flex", height: 2, background: C.line }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 20, fontSize: 22, color: C.muted }}>
          <span style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{`tofu: "${slide.tofu}"`}</span>
          <span style={{ flexShrink: 0 }}>{`${title} · p54.dev`}</span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "Newsreader", data: newsreader, weight: 400, style: "normal" },
        { name: "JetBrains Mono", data: mono, weight: 500, style: "normal" },
      ],
    }
  );
}
