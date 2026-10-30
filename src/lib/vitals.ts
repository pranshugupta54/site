// Formatting for the site vitals readout in the footer bar. Pure — `node --test`
// loads it directly (the type import below is erased).
import type { Mood } from "@/lib/tofu-mood";

export const MOOD_WORD: Record<Mood, string> = {
  night: "asleep",
  morning: "on coffee",
  day: "awake",
  evening: "yawning",
};

export const prsLabel = (n: number) => (n === 0 ? "no PRs open" : `${n} PR${n === 1 ? "" : "s"} open`);

// /api/pulls body → open count; anything unexpected → null (hide)
export function parseOpen(body: unknown): number | null {
  const open = (body as { open?: unknown } | null)?.open;
  return typeof open === "number" && Number.isInteger(open) && open >= 0 ? open : null;
}

// The open PR count refreshes this often while the tab is visible — /api/pulls
// is itself cached for 5 min, so polling faster buys nothing.
export const PULLS_REFRESH_MS = 5 * 60_000;
// floor between requests, so flipping tabs back and forth doesn't refetch each time
export const PULLS_MIN_GAP_MS = 30_000;

// Whether to refetch the count now: only while the tab is visible, and not
// within PULLS_MIN_GAP_MS of the last request (`last`/`now` on one monotonic clock).
export const refreshDue = (visible: boolean, last: number | null, now: number) =>
  visible && (last === null || now - last >= PULLS_MIN_GAP_MS);

// The count one /api/pulls response leaves on screen: the new count on a 200,
// else none — any other status (204 included) or a bad body clears the old
// count, so the segment hides.
export const countAfter = (status: number, body: unknown): number | null =>
  status === 200 ? parseOpen(body) : null;

// a full or short git sha → its 7-char form; anything else → null
export const shortSha = (sha: string): string | null => (/^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null);

export function builtAt(iso: string): Date | null {
  const t = Date.parse(iso);
  return iso && !Number.isNaN(t) ? new Date(t) : null;
}
