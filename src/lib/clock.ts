// The viewer's "now", with a ?now=<local ISO time> override for previewing dated moments
// (e.g. ?season=winter&now=2026-12-31T23:59:50). The override sets a start point; time
// still ticks forward from it. Client-only.
let offset: number | null = null;

export function now(): Date {
  if (offset === null) {
    offset = 0;
    try {
      const q = new URLSearchParams(location.search).get("now");
      const t = q ? Date.parse(q) : NaN;
      if (!Number.isNaN(t)) offset = t - Date.now();
    } catch {
      /* no location (server) — real time */
    }
  }
  return new Date(Date.now() + offset);
}
