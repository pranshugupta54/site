// Tofu's notes — short posts written and signed by the site's AI, stored as
// markdown in content/notes/<slug>.md (server-only; read from disk at build).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

const DIR = join(process.cwd(), "content", "notes");

export type Note = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD, publication
  updated: string; // YYYY-MM-DD, last significant edit (frontmatter `updated`, defaults to date)
  summary: string;
  body: string;
  minutes: number;
};

// gray-matter parses bare YAML dates into Date objects
const day = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

function read(file: string): Note | null {
  const { data, content } = matter(readFileSync(join(DIR, file), "utf8"));
  if (!data.title || !data.date || !data.summary) return null;
  const words = content.trim().split(/\s+/).length;
  const date = day(data.date);
  return {
    slug: file.replace(/\.md$/, ""),
    title: String(data.title),
    date,
    updated: data.updated ? day(data.updated) : date,
    summary: String(data.summary),
    body: content,
    minutes: Math.max(1, Math.round(words / 220)),
  };
}

export function getNotes(): Note[] {
  let files: string[] = [];
  try {
    files = readdirSync(DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map(read)
    .filter((n): n is Note => n !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getNote(slug: string): Note | null {
  return getNotes().find((n) => n.slug === slug) ?? null;
}
