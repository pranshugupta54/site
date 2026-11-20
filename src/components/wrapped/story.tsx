"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Scramble } from "@/components/scramble";
import { useReducedMotionLive } from "@/lib/reduced-motion";
import { slidePath, type Slide, type Viz } from "@/lib/wrapped";
import framesData from "@/data/tofu-frames.json";
import "./wrapped.css";

// The story: full-screen slides, a progress bar that fills and moves on by
// itself, tap the right of the screen (or →) for next and the left (or ←) for
// back, hold to pause. The url follows the slide, so a copied link opens there.

const DWELL_MS = 7000;
const HOLD_MS = 220; // a press longer than this pauses instead of tapping
const FRAMES = framesData.frames as Record<string, string[]>;
const LOOP = ["idle", "idle", "breathe", "idle", "blink", "idle", "twitch"];

const fmt = (v: number) => v.toLocaleString("en-US");
const dwell = (s: Slide) => (s.id === "read" ? DWELL_MS * 2 : s.id === "outro" ? 0 : DWELL_MS);

// counts 0 → target once per mount; null (between runs, or with reduced motion) shows the target
function useCountUp(target: number | undefined, still: boolean) {
  const [v, setV] = useState<number | null>(null);
  useEffect(() => {
    if (target === undefined || still) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100);
      setV(p < 1 ? Math.round(target * (1 - Math.pow(1 - p, 3))) : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, still]);
  return v ?? target ?? 0;
}

function Value({ slide, still }: { slide: Slide; still: boolean }) {
  const v = useCountUp(slide.num, still);
  const text = slide.num === undefined ? slide.value : slide.value.replace(fmt(slide.num), fmt(v));
  const len = [...slide.value].length;
  const size = len <= 5 ? "xl" : len <= 9 ? "lg" : len <= 16 ? "md" : "sm";
  return (
    <h2 className="wr-value" data-size={size} data-prose={slide.id === "read" || undefined} aria-label={slide.value}>
      {text}
    </h2>
  );
}

function VizView({ viz }: { viz: Viz }) {
  switch (viz.kind) {
    case "heatmap": {
      const cells = [...Array<number>(viz.pad).fill(-1), ...viz.levels];
      return (
        <div className="wr-heat" aria-hidden>
          {cells.map((l, i) => (
            <i key={i} data-l={l < 0 ? undefined : l} style={{ "--c": Math.floor(i / 7) } as CSSProperties} />
          ))}
        </div>
      );
    }
    case "bars": {
      const max = Math.max(1, ...viz.values);
      return (
        <div className="wr-bars-viz" aria-hidden>
          {viz.values.map((v, i) => (
            <span key={i} data-hi={i === viz.hi || undefined} style={{ "--h": `${Math.max(3, (v / max) * 100)}%`, "--i": i } as CSSProperties}>
              {viz.show.includes(i) ? <small>{fmt(v)}</small> : null}
              <b />
              <em>{viz.labels[i]}</em>
            </span>
          ))}
        </div>
      );
    }
    case "streak": {
      const shown = Math.min(viz.days, 60);
      return (
        <div className="wr-streak" aria-hidden>
          {Array.from({ length: shown }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
          {viz.days > shown ? <span>+{viz.days - shown}</span> : null}
        </div>
      );
    }
    case "grid":
      return (
        <dl className="wr-grid">
          {viz.cells.map((c) => (
            <div key={c.label}>
              <dt>{c.value}</dt>
              <dd>{c.label}</dd>
            </div>
          ))}
        </dl>
      );
    case "read":
      return (
        <a className="wr-read" href={viz.url} target="_blank" rel="noreferrer">
          <span className="wr-read-take">&ldquo;{viz.take}&rdquo;</span>
          <span className="wr-read-go">read it on {viz.source} →</span>
        </a>
      );
  }
}

export function WrappedStory({ slides, start, title, year }: { slides: Slide[]; start: number; title: string; year: number }) {
  const router = useRouter();
  const still = useReducedMotionLive();
  const [idx, setIdx] = useState(start);
  const [held, setHeld] = useState(false); // a long press
  const [hidden, setHidden] = useState(false); // the tab is in the background
  const paused = held || hidden;
  const [toast, setToast] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const press = useRef<{ t: number; held: boolean; timer?: ReturnType<typeof setTimeout> } | null>(null);
  const slide = slides[idx];
  const last = slides.length - 1;

  const go = useCallback((to: number) => setIdx(Math.max(0, Math.min(last, to))), [last]);

  // the address bar follows the story, so a copied url opens on this slide
  useEffect(() => {
    const path = slidePath(slide.id);
    if (window.location.pathname !== path) window.history.replaceState(window.history.state, "", path);
    document.title = `${slide.id === "intro" ? title : `${title} · ${slide.kicker.replace(/^#\s*/, "")}`} · Pranshu Gupta`;
  }, [slide, title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const onButton = (e.target as HTMLElement | null)?.closest("a, button");
      if (e.key === "ArrowRight" || e.key === "l" || (e.key === " " && !onButton)) go(idx + 1);
      else if (e.key === "ArrowLeft" || e.key === "h") go(idx - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(last);
      else if (e.key === "Escape") router.push("/");
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, idx, last, router]);

  // a hidden tab doesn't keep advancing
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // tofu breathes and blinks while it talks
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % LOOP.length), 650);
    return () => clearInterval(t);
  }, [still]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const share = useCallback(async () => {
    const url = `${window.location.origin}${slidePath(slide.id)}`;
    const text = slide.id === "intro" || slide.id === "outro" ? title : `${title}: ${slide.value} ${slide.unit ?? ""}`.trim();
    // phones get the system share sheet; everyone else gets the link copied
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("link copied · it opens on this slide");
    } catch {
      setToast(url);
    }
  }, [slide, title]);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !e.isPrimary || (e.target as HTMLElement).closest("a, button")) return;
    const p: NonNullable<typeof press.current> = { t: Date.now(), held: false };
    p.timer = setTimeout(() => {
      p.held = true;
      setHeld(true);
    }, HOLD_MS);
    press.current = p;
  };
  const onUp = (e: React.PointerEvent) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    if (p.held) {
      setHeld(false);
      return;
    }
    const box = e.currentTarget.getBoundingClientRect();
    go(e.clientX - box.left < box.width * 0.3 ? idx - 1 : idx + 1);
  };
  const onCancel = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    setHeld(false);
  };

  const auto = !still && dwell(slide) > 0;
  const face = FRAMES[slide.id === "outro" ? "happy" : still ? "idle" : LOOP[frame]] ?? FRAMES.idle;

  return (
    <div className="wr" data-slide={slide.id} data-paused={paused || undefined}>
      <header className="wr-top">
        <div className="wr-progress" role="tablist" aria-label="slides">
          {slides.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === idx}
              aria-label={`slide ${i + 1}: ${s.kicker.replace(/^#\s*/, "")}`}
              className="wr-seg"
              data-state={i < idx ? "done" : i === idx ? "now" : undefined}
              onClick={(e) => {
                go(i);
                e.currentTarget.blur(); // so space goes back to advancing the story
              }}
            >
              <i
                key={i === idx ? `now-${idx}` : undefined}
                style={i === idx && auto ? { animationDuration: `${dwell(slide)}ms` } : undefined}
                data-auto={i === idx && auto ? "" : undefined}
                onAnimationEnd={i === idx ? () => go(idx + 1) : undefined}
              />
            </button>
          ))}
        </div>
        <div className="wr-bar">
          <span className="wr-path">
            <span className="wr-dim">~</span>
            <span className="wr-acc">{slidePath(slide.id)}</span>
            <span className="wr-dim">
              {" "}
              {idx + 1}/{slides.length}
            </span>
          </span>
          <span className="wr-actions">
            <button type="button" onClick={share}>
              share
            </button>
            <Link href="/" aria-label="close, back to the terminal">
              esc ✕
            </Link>
          </span>
        </div>
      </header>

      <main className="wr-stage" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onCancel} onPointerLeave={onCancel}>
        <section key={slide.id} className="wr-slide" aria-live={auto && !paused ? "off" : "polite"} aria-roledescription="slide">
          <p className="wr-kicker">{slide.kicker}</p>
          <Value slide={slide} still={still} />
          {slide.unit ? (
            <p className="wr-unit">
              <span className="mark">{slide.unit}</span>
            </p>
          ) : null}
          {slide.viz ? <VizView viz={slide.viz} /> : null}
          {slide.line ? <p className="wr-line">{slide.line}</p> : null}
          {slide.id === "outro" ? (
            <div className="wr-end">
              <button type="button" className="wr-cta" onClick={share}>
                share {year} →
              </button>
              <button type="button" onClick={() => go(0)}>
                replay
              </button>
              <Link href="/">back to the terminal</Link>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="wr-tofu">
        <pre aria-hidden>{face.join("\n")}</pre>
        <p>
          <span>
            <span className="wr-acc">tofu:</span> <Scramble key={slide.id} text={slide.tofu} speedMs={22} reveal={1.4} />
          </span>
        </p>
        <span className="wr-hint" aria-hidden>
          {paused ? "paused" : "tap → · ← back · hold to pause"}
        </span>
      </footer>

      {toast ? (
        <div className="wr-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
