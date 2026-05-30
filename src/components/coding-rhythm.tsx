import { getWakatime } from "@/lib/wakatime";

const BAR = 16;
function bar(pct: number) {
  const filled = Math.max(0, Math.min(BAR, Math.round((pct / 100) * BAR)));
  return { filled: "█".repeat(filled), empty: "░".repeat(BAR - filled) };
}

// Async server component. Hidden entirely if live WakaTime data is unavailable
// (no key / API failure) — never shows fake data.
export async function CodingRhythm() {
  const w = await getWakatime();
  if (!w) return null;

  const labelWidth = Math.max(8, ...w.languages.map((l) => l.name.length));

  return (
    <section aria-label="Coding activity">
      <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        When I Code
      </h2>

      <div className="rounded-md border border-line bg-card px-4 py-3 font-mono text-[13px] leading-relaxed">
        {w.languages.length > 0 && (
          <ul className="space-y-[3px]">
            {w.languages.map((l) => {
              const { filled, empty } = bar(l.percent);
              return (
                <li key={l.name} className="flex items-baseline gap-3">
                  <span className="shrink-0 text-muted" style={{ minWidth: `${labelWidth}ch` }}>
                    {l.name}
                  </span>
                  <span className="tracking-tight">
                    <span className="text-accent">{filled}</span>
                    <span className="text-muted opacity-30">{empty}</span>
                  </span>
                  <span className="tabular-nums text-muted" style={{ minWidth: "3ch" }}>
                    {Math.round(l.percent)}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {w.languages.length > 0 && (
          <div className="my-3 border-t border-line" role="separator" aria-hidden="true" />
        )}

        <p className="tabular-nums text-muted">
          {w.weekText && (
            <>
              <span className="text-fg">{w.weekText}</span> this week
            </>
          )}
          {w.dailyAvg && <> · {w.dailyAvg}/day</>}
          {w.allTime && (
            <>
              {" · "}
              <span className="text-fg">{w.allTime}</span> all-time
            </>
          )}
        </p>
      </div>
    </section>
  );
}
