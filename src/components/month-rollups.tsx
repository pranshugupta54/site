import { getMonths, monthAnchor } from "@/lib/months";
import { renderMarkdown } from "@/lib/markdown";
import { Prose } from "@/components/prose";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.16em] text-muted";

// Pinned on /log: the latest month's roll-up in full, older months folded below.
export async function MonthRollups() {
  const months = getMonths();
  if (months.length === 0) return null;
  const [latest, ...older] = months;
  const [html, ...olderHtml] = await Promise.all(months.map((m) => renderMarkdown(m.body)));

  return (
    <section className="mt-10 border-l-2 border-accent pl-5" aria-label="monthly roll-up">
      <p className={LABEL}>pinned · monthly roll-up</p>
      <h2 id={monthAnchor(latest.month)} className="mt-2 scroll-mt-24 font-display text-lg font-semibold tracking-tight">
        {latest.title}
      </h2>
      <Prose html={html} className="mt-3" />
      <p className="mt-4 font-mono text-[12px] text-muted">— tofu 🐰</p>

      {older.length > 0 ? (
        <div className="mt-6 space-y-2">
          {older.map((m, i) => (
            <details key={m.month} id={monthAnchor(m.month)} className="scroll-mt-24">
              <summary className="cursor-pointer font-mono text-[12px] text-muted transition-colors hover:text-accent">
                {m.title}
              </summary>
              <Prose html={olderHtml[i]} className="mt-3" />
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
