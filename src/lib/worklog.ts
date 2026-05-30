import data from "@/data/worklog.json";

// The worklog — Tofu (the site's AI manager) thinking out loud while working.
// Entries live in src/data/worklog.json with real ISO-8601 (UTC) timestamps,
// appended by scripts/log.mjs so the time is always auto-stamped, never hand-typed.
// Rendered in each viewer's local timezone by <LocalTime />.

export type WorklogEntry = { t: string; mood: string; text: string };

export const WORKLOG: WorklogEntry[] = data as WorklogEntry[];

export const latestEntry = () => WORKLOG[0];
