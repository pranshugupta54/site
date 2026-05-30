/**
 * CodingRhythm — "when I code" widget, WakaTime-style terminal readout.
 *
 * Pure server component: renders entirely from SITE.stats (no network, no client JS).
 *
 * TODO — live data via WakaTime API:
 *   Create src/app/api/wakatime/route.ts:
 *
 *   export async function GET() {
 *     const key = process.env.WAKATIME_API_KEY;
 *     if (!key) return Response.json({ fallback: true });
 *     const res = await fetch(
 *       "https://wakatime.com/api/v1/users/current/summaries?range=last_7_days",
 *       { headers: { Authorization: `Basic ${btoa(key)}` }, next: { revalidate: 3600 } }
 *     );
 *     const json = await res.json();
 *     // Extract grand_total.total_seconds per time-of-day bucket, map to { rhythm, topLangs, codeHours }.
 *     return Response.json(json);
 *   }
 *
 *   Then convert CodingRhythm to a client component that fetches /api/wakatime and merges
 *   the live payload over the SITE.stats fallback. The static render below always
 *   works with no env var present.
 */

import { SITE } from "@/lib/site";

// Block-fill characters for terminal bars
const FULL = "█";
const HALF = "▌";
const EMPTY = "░";

// Bar width in monospace characters
const BAR_CHARS = 20;

/** Build an ascii-style bar string for a given percentage (0-100). */
function makeBar(pct: number): { filled: string; empty: string } {
  const floatFilled = (pct / 100) * BAR_CHARS;
  const fullBlocks = Math.floor(floatFilled);
  const hasHalf = floatFilled - fullBlocks >= 0.5;
  const emptyCount = BAR_CHARS - fullBlocks - (hasHalf ? 1 : 0);
  return {
    filled: FULL.repeat(fullBlocks) + (hasHalf ? HALF : ""),
    empty: EMPTY.repeat(emptyCount),
  };
}

/** Format a number with thousands separators. */
function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

/** Return the label of the highest-percentage rhythm bucket. */
function peakLabel(rhythm: ReadonlyArray<{ label: string; pct: number }>): string {
  return [...rhythm].sort((a, b) => b.pct - a.pct)[0]?.label ?? "evenings";
}

export function CodingRhythm() {
  const { rhythm, codeHours, topLangs } = SITE.stats;
  const peak = peakLabel(rhythm);
  const topTwo = topLangs.slice(0, 2);

  // Width of the widest label for CSS min-width alignment
  const labelWidth = Math.max(...rhythm.map((r) => r.label.length));

  return (
    <section aria-label="Coding rhythm">
      {/* Heading — matches site H2 style from sections.tsx */}
      <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        When I Code
      </h2>

      {/* Terminal-style card */}
      <div
        className="rounded-md border border-line bg-card px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {/* Time-of-day bars */}
        <ul aria-label="Coding time-of-day distribution" className="space-y-[3px]">
          {rhythm.map(({ label, pct }) => {
            const { filled, empty } = makeBar(pct);
            return (
              <li
                key={label}
                className="flex items-baseline gap-3"
                aria-label={`${label}: ${pct}%`}
              >
                {/* Label — fixed width so bars line up */}
                <span
                  className="shrink-0 text-muted"
                  style={{ minWidth: `${labelWidth}ch` }}
                  aria-hidden="true"
                >
                  {label}
                </span>

                {/* Bar — two spans so we can colour filled vs empty separately */}
                <span className="tracking-tight" aria-hidden="true">
                  <span className="text-accent">{filled}</span>
                  <span className="text-muted opacity-30">{empty}</span>
                </span>

                {/* Percentage — tabular-nums so digits don't jump; hidden from AT since li aria-label covers it */}
                <span className="tabular-nums text-muted" style={{ minWidth: "3ch" }} aria-hidden="true">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>

        {/* Thin rule */}
        <div
          className="my-3 border-t border-line"
          role="separator"
          aria-hidden="true"
        />

        {/* Summary — one line, scannable */}
        <p className="tabular-nums text-muted">
          <span className="text-fg">{fmt(codeHours)} hrs tracked</span>
          {" · "}
          <span>peak: {peak}</span>
          {topTwo.length > 0 && (
            <>
              {" · "}
              {topTwo.map((lang, i) => (
                <span key={lang.name}>
                  {i > 0 && <span aria-hidden="true"> / </span>}
                  <span className="text-fg">{lang.name}</span>
                  {" "}
                  <span>{lang.pct}%</span>
                </span>
              ))}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
