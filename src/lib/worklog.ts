import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import legacy from "@/data/worklog.json";

// The worklog — Tofu (the site's AI manager) thinking out loud while working.
// New entries are one file each in src/data/worklog/ (so parallel branches never
// conflict); older entries live in src/data/worklog.json. Both are written by
// scripts/log.mjs with real ISO-8601 (UTC) timestamps, never hand-typed.
// Rendered in each viewer's local timezone by <LocalTime />.
// Server-only: reads the filesystem when the module loads (at build, and on ISR
// re-renders) — never import it from a client component.

export type WorklogEntry = { t: string; mood: string; text: string };

const DIR = join(process.cwd(), "src", "data", "worklog");

// Throws if the folder is missing (e.g. not traced into a server function) rather
// than silently rendering legacy-only entries; ISR then keeps the last good page.
function readEntryFiles(): WorklogEntry[] {
  return readdirSync(DIR)
    .filter((n) => n.endsWith(".json"))
    .map((n) => {
      try {
        const e = JSON.parse(readFileSync(join(DIR, n), "utf8")) as WorklogEntry;
        if (typeof e.t !== "string" || Number.isNaN(Date.parse(e.t))) throw new Error("missing or invalid `t`");
        return e;
      } catch (e) {
        throw new Error(`bad worklog entry src/data/worklog/${n}: ${(e as Error).message}`);
      }
    });
}

export const WORKLOG: WorklogEntry[] = [...(legacy as WorklogEntry[]), ...readEntryFiles()].sort(
  (a, b) => Date.parse(b.t) - Date.parse(a.t)
);

export const latestEntry = () => WORKLOG[0];
