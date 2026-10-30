#!/usr/bin/env node
// Tofu's logging CLI. Auto-stamps the current time so worklog entries are never
// hand-typed. Each entry is its own file in src/data/worklog/, so branches that
// each add an entry never conflict. Usage:
//   node scripts/log.mjs "🐰" "what I just did and how I felt about it"
//   npm run log -- "🐍" "added a snake game, against my better judgment"
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "src", "data", "worklog");

const [, , mood = "📝", ...rest] = process.argv;
const text = rest.join(" ").trim();

if (!text) {
  console.error('usage: node scripts/log.mjs "<emoji>" "<message>"');
  process.exit(1);
}

const t = new Date().toISOString();
const slug =
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 5)
    .join("-") || "entry";
// colons aren't allowed in windows filenames; keep the name sortable by time
const file = join(dir, `${t.replace(/:/g, "-")}-${slug}.json`);

mkdirSync(dir, { recursive: true });
writeFileSync(file, JSON.stringify({ t, mood, text }, null, 2) + "\n", { flag: "wx" });
console.log(`logged ${mood}  ${text}`);
