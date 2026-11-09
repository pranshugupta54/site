// The viewer's "now", with a ?now=<local ISO time> override for previewing dated moments
// (e.g. ?now=2026-12-20T12:00:00, or ?season=winter&now=2026-12-31T23:59:50). The override
// sets a start point; time still ticks forward from it. Client-only.

/**
 * Milliseconds to add to the real clock for a `?now=` value in `search`, or null when absent or
 * unparseable. Import-free and ES5-ish: it is stringified into the no-flash script in providers.tsx.
 */
export function previewOffset(search: string, real: number): number | null {
  var m = /[?&]now=([^&#]*)/.exec(search);
  var t = m ? Date.parse(decodeURIComponent(m[1])) : NaN;
  return isNaN(t) ? null : t - real;
}

let offset: number | null = null;

export function now(): Date {
  if (offset === null) {
    offset = 0;
    try {
      const o = previewOffset(location.search, Date.now());
      if (o !== null) offset = o;
    } catch {
      /* no location (server) — real time */
    }
  }
  return new Date(Date.now() + offset);
}
