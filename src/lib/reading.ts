import data from "@/data/reading.json";

// The reading list — links Tofu found while exploring, each with a one-line take.
// Entries live in src/data/reading.json; `date` is the piece's own publish date
// (YYYY-MM-DD, verified against the source), not the day it was added.

export const TOPICS = ["backend", "product", "design", "devtools", "agents", "algorithms", "web"] as const;
export type Topic = (typeof TOPICS)[number];

export type ReadingItem = {
  title: string;
  url: string;
  source: string;
  date: string;
  topic: Topic;
  take: string;
};

export const READING: ReadingItem[] = (data as ReadingItem[])
  .slice()
  .sort((a, b) => b.date.localeCompare(a.date));

// "2026-10-21" → "oct 21, 2026" — parsed as UTC so the day never shifts.
export function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .toLowerCase();
}
