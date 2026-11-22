import { ImageResponse } from "next/og";
import { C, loadFonts } from "@/lib/og/card";
import { OG_SIZE } from "@/lib/og/image";
import { DOORS, doorDate, opensIn, type LockedView } from "@/lib/advent";
import type { OpenDoor } from "@/lib/advent-server";
import framesData from "@/data/tofu-frames.json";
import { dress } from "@/lib/tofu-dress";

// /advent share cards: the calendar, an open door, or a locked door's teaser.
// A locked card is drawn from a LockedView only, so it has nothing to spoil.
// Rendered by src/app/advent/og/route.tsx.

export type AdventCard = { kind: "calendar"; open: number } | { kind: "door"; door: OpenDoor | LockedView; open: number; now: Date };

const tofuRows = (frame: keyof typeof framesData.frames) => dress(framesData.frames[frame].join("\n"), framesData.hats.winter).split("\n");

function Tofu({ frame }: { frame: keyof typeof framesData.frames }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: -14, fontSize: 30, lineHeight: 1.15, color: C.fg }}>
      {tofuRows(frame).map((row, i) => (
        <div key={i} style={{ display: "flex", whiteSpace: "pre" }}>
          {row}
        </div>
      ))}
    </div>
  );
}

/** 24 little doors, filled up to `open` */
function Doors({ open, hi }: { open: number; hi?: number }) {
  return (
    <div style={{ display: "flex", gap: 5 }}>
      {Array.from({ length: DOORS }, (_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 18,
            borderRadius: 2,
            border: `2px solid ${i + 1 === hi ? C.accent : i < open ? C.accent : C.line}`,
            background: i < open ? C.accent : "transparent",
            opacity: i < open && i + 1 !== hi ? 0.55 : 1,
          }}
        />
      ))}
    </div>
  );
}

const titleSize = (s: string) => {
  const len = [...s].length;
  return len <= 10 ? 104 : len <= 16 ? 84 : len <= 24 ? 68 : 56;
};

export async function adventOg(card: AdventCard) {
  const [fraunces, newsreader, mono] = await loadFonts();
  const n = card.kind === "door" ? card.door.n : null;
  const path = n ? `/advent/${n}` : "/advent";
  const locked = card.kind === "door" && card.door.state === "locked";

  let body: React.ReactNode;
  let foot: string;
  if (card.kind === "calendar") {
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 28, color: C.muted }}># 24 doors · dec 1 – 24 · one a day</span>
        <div style={{ display: "flex", marginTop: 8, fontSize: 92, lineHeight: 1, letterSpacing: -4 }}>tofu&apos;s advent</div>
        <div style={{ display: "flex", fontSize: 92, lineHeight: 1.05, letterSpacing: -4 }}>
          <span style={{ background: C.mark, padding: "0 12px" }}>calendar</span>
        </div>
      </div>
    );
    foot = card.open === 0 ? `tofu: "nothing open yet. i'm still wrapping."` : card.open >= DOORS ? `tofu: "all 24 open. go find them."` : `tofu: "${card.open} of 24 open. one more tomorrow."`;
  } else if (card.door.state === "locked") {
    const d = card.door;
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 28, color: C.muted }}>{`# door ${d.n} · ${doorDate(d.n)}`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 30, lineHeight: 1.1, color: C.muted, whiteSpace: "pre" }}>
            <span>{".---------."}</span>
            <span>{`|   ${String(d.n).padStart(2, " ")}    |`}</span>
            <span>{"|    o    |"}</span>
            <span>{"|  [===]  |"}</span>
            <span>{"'---------'"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
            <div style={{ display: "flex", fontSize: 92, lineHeight: 1, letterSpacing: -4 }}>locked.</div>
            <span style={{ display: "flex", marginTop: 14, fontFamily: "Newsreader", fontSize: 36, color: C.fg }}>{`“${d.hint}”`}</span>
            <span style={{ display: "flex", marginTop: 18, fontSize: 24 }}>
              <span style={{ background: C.mark, padding: "0 8px" }}>{`${opensIn(d.n, card.now, new Date(d.opensAt).getUTCFullYear())} · ${doorDate(d.n)}, 00:00 ist`}</span>
            </span>
          </div>
        </div>
      </div>
    );
    foot = `tofu: "no peeking. i'm not peeking either."`;
  } else {
    const d = card.door;
    body = (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 28, color: C.muted }}>{`# door ${d.n} · ${doorDate(d.n)} · ${d.kind === "finale" ? "the big one" : d.kind}`}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 36, marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 150,
              height: 150,
              flexShrink: 0,
              border: `3px solid ${C.accent}`,
              borderRadius: 8,
              background: C.mark,
              color: C.accent,
              fontSize: [...d.glyph].length > 2 ? 48 : 64,
            }}
          >
            {d.glyph}
          </div>
          <div style={{ display: "flex", fontSize: titleSize(d.title), lineHeight: 1.02, letterSpacing: -titleSize(d.title) * 0.04, maxWidth: 680 }}>{d.title}</div>
        </div>
        <span style={{ display: "flex", marginTop: 26, fontFamily: "Newsreader", fontSize: 32, lineHeight: 1.3, color: C.muted, maxWidth: 860 }}>{`“${d.tofu}”`}</span>
      </div>
    );
    foot = `open now · p54.dev${path}`;
  }

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, color: C.fg, padding: "52px 72px 44px", fontFamily: "JetBrains Mono" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: C.muted }}>~</span>
            <span style={{ color: C.accent }}>{path}</span>
            <div style={{ width: 13, height: 28, marginLeft: 10, background: C.accent, opacity: 0.85 }} />
          </div>
          <Doors open={card.open} hi={n ?? undefined} />
        </div>

        <div style={{ display: "flex", flexGrow: 1, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 880, paddingBottom: 26 }}>{body}</div>
          <Tofu frame={locked ? "blink" : card.kind === "calendar" ? "idle" : "happy"} />
        </div>

        <div style={{ display: "flex", height: 2, background: C.line }} />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 20, fontSize: 22, color: C.muted }}>
          <span style={{ flexShrink: 1, minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{foot}</span>
          <span style={{ flexShrink: 0 }}>tofu&apos;s advent · p54.dev</span>
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
