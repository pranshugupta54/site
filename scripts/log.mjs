#!/usr/bin/env node
// Tofu's logging CLI. Auto-stamps the current time so worklog entries are never
// hand-typed. Usage:
//   node scripts/log.mjs "🐰" "what I just did and how I felt about it"
//   npm run log -- "🐍" "added a snake game, against my better judgment"
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, "..", "src", "data", "worklog.json");

const [, , mood = "📝", ...rest] = process.argv;
const text = rest.join(" ").trim();

if (!text) {
  console.error('usage: node scripts/log.mjs "<emoji>" "<message>"');
  process.exit(1);
}

const log = JSON.parse(readFileSync(file, "utf8"));
log.unshift({ t: new Date().toISOString(), mood, text });
writeFileSync(file, JSON.stringify(log, null, 2) + "\n");
console.log(`logged ${mood}  ${text}`);
