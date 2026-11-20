// /wrapped — the year in slides. Everything else is computed from public data
// and this repo; this file holds the few things a person (or tofu) picks.
// Next year: bump `year`, pick a new read, drop `seasonsSince`. No imports, so
// `node --test` can load it as-is.

export type WrappedConfig = {
  year: number;
  /** a url from src/data/reading.json, plus why, in tofu's voice */
  favoriteRead: { url: string; why: string } | null;
  /** seasons only count from the day the site could wear them (YYYY-MM-DD) */
  seasonsSince?: string;
};

export const WRAPPED: WrappedConfig = {
  year: 2026,
  favoriteRead: {
    url: "https://www.seangoedecke.com/what-requirements-dont-you-have/",
    why: "liked it enough to write a whole note back at it.",
  },
  seasonsSince: "2026-10-30",
};
