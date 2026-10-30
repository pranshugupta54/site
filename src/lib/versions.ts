import data from "@/data/versions.json";

// Site versions: big revamps, not features. The source of truth is
// src/data/versions.json, kept as JSON so next.config.mjs can read it too
// (it wires the /v/<n> archive routes). See docs/versions.md.

export type Version = {
  version: string;
  /** launch day, YYYY-MM-DD */
  date: string;
  name: string;
  /** one line in tofu's voice */
  tofu: string;
  highlights: string[];
  /** "static" once snapshotted under public/v/<version>/; null otherwise */
  archive: "static" | null;
};

/** a revamp in progress, previewed on its own domain */
export type Renovation = { version: string; href: string };

export type Versions = {
  current: string;
  renovation: Renovation | null;
  versions: Version[];
};

export const VERSIONS = data as Versions;

/** every version, newest first */
export const VERSION_LIST: Version[] = [...VERSIONS.versions].sort((a, b) =>
  b.date.localeCompare(a.date)
);

export const CURRENT: Version =
  VERSIONS.versions.find((v) => v.version === VERSIONS.current) ?? VERSION_LIST[0];

export const RENOVATION: Renovation | null = VERSIONS.renovation;

/** where a past version can still be visited, or null if it wasn't kept */
export const archiveHref = (v: Version): string | null =>
  v.archive === "static" ? `/v/${v.version}` : null;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "2026-05-30" → "may 30, 2026". Plain string work, so no timezone can shift the day. */
export function formatVersionDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
