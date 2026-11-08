// Monthly roll-ups — tofu's summary of what changed on the site each month,
// stored as markdown in content/months/<YYYY-MM>.md (server-only; read from disk).
// A new month is just a new file; /log pins the latest and /log/feed.xml carries all.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(process.cwd(), "content", "months");

export type MonthRollup = {
  month: string; // YYYY-MM, from the filename
  title: string;
  summary: string;
  published: string; // ISO-8601 timestamp
  updated: string; // ISO-8601; bump it in frontmatter after a real correction so feed readers refetch
  body: string;
};

const toDate = (v: unknown) => (v instanceof Date ? v : new Date(String(v)));

function read(file: string): MonthRollup | null {
  const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
  const published = toDate(data.published);
  const updated = data.updated ? toDate(data.updated) : published;
  if (!data.title || !data.summary || Number.isNaN(published.getTime()) || Number.isNaN(updated.getTime())) return null;
  return {
    month: file.replace(/\.md$/, ""),
    title: String(data.title),
    summary: String(data.summary),
    published: published.toISOString(),
    updated: updated.toISOString(),
    body: content,
  };
}

// Newest first. Empty if the folder is missing (no roll-ups yet).
export function getMonths(): MonthRollup[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => /^\d{4}-\d{2}\.md$/.test(f));
  } catch {
    return [];
  }
  return files
    .map(read)
    .filter((m): m is MonthRollup => m !== null)
    .sort((a, b) => b.month.localeCompare(a.month));
}

export const monthAnchor = (month: string) => `month-${month}`;
