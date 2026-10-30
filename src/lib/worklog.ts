import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import legacy from "@/data/worklog.json";

// The worklog — Tofu (the site's AI manager) thinking out loud while working.
// New entries are one file each in src/data/worklog/ (so parallel branches never
// conflict); older entries live in src/data/worklog.json. Both are written by
// scripts/log.mjs with real ISO-8601 (UTC) timestamps, never hand-typed.
// Rendered in each viewer's local timezone by <LocalTime />.
// Server-only: reads the filesystem at build time.

export type WorklogEntry = { t: string; mood: string; text: string };

const DIR = join(process.cwd(), "src", "data", "worklog");

function readEntryFiles(): WorklogEntry[] {
  let names: string[];
  try {
    names = readdirSync(DIR).filter((n) => n.endsWith(".json"));
  } catch {
    return [];
  }
  return names.map((n) => JSON.parse(readFileSync(join(DIR, n), "utf8")) as WorklogEntry);
}

export const WORKLOG: WorklogEntry[] = [...(legacy as WorklogEntry[]), ...readEntryFiles()].sort(
  (a, b) => b.t.localeCompare(a.t)
);

export const latestEntry = () => WORKLOG[0];
