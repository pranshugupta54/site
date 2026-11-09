// The room at /room: the parts that are plain rules (no React, no DOM),
// so `node --test` can check them as-is.

export type Phase = "dawn" | "day" | "dusk" | "night";

/** what the window shows, from the visitor's local clock */
export function phaseAt(d: Date): Phase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17.5) return "day";
  if (h >= 17.5 && h < 19.5) return "dusk";
  return "night";
}

/** one leaf per month the site has existed: "YYYY-MM-DD" → whole months to `now`, at least 1 */
export function leavesSince(start: string, now: Date): number {
  const [y, m, d] = start.split("-").map(Number);
  if (!y || !m || !d) return 1;
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months--;
  return Math.max(1, months + 1);
}

export type CalDay = { day: number; logged: boolean; today: boolean } | null;

/**
 * This month as a calendar grid (weeks start monday, leading blanks are null),
 * with the days tofu logged something on, in the visitor's local time.
 */
export function monthGrid(now: Date, logged: string[]): CalDay[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const hit = new Set<number>();
  for (const iso of logged) {
    const t = new Date(iso);
    if (!Number.isNaN(t.getTime()) && t.getFullYear() === y && t.getMonth() === m) hit.add(t.getDate());
  }
  const cells: CalDay[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) cells.push({ day, logged: hit.has(day), today: day === now.getDate() });
  return cells;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
export const monthName = (d: Date) => MONTHS[d.getMonth()];
