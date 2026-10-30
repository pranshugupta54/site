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

// a full or short git sha → its 7-char form; anything else → null
export const shortSha = (sha: string): string | null => (/^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null);

export function builtAt(iso: string): Date | null {
  const t = Date.parse(iso);
  return iso && !Number.isNaN(t) ? new Date(t) : null;
}
