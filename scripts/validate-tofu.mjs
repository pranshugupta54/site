#!/usr/bin/env node
// Guarantees Tofu's ascii frames are perfectly aligned: every frame is exactly
// width x height, every glyph printable ASCII (32-126). Run: node scripts/validate-tofu.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "..", "src", "data", "tofu-frames.json"), "utf8"));
const { width, height, frames, hop } = data;

const errs = [];
const check = (name, f) => {
  if (!Array.isArray(f)) return errs.push(`${name}: not an array`);
  if (f.length !== height) errs.push(`${name}: ${f.length} lines (want ${height})`);
  f.forEach((ln, i) => {
    if (ln.length !== width) errs.push(`${name} line ${i}: len ${ln.length} (want ${width}) -> "${ln}"`);
    for (const ch of ln) {
      const c = ch.codePointAt(0);
      if (c < 32 || c > 126) errs.push(`${name} line ${i}: non-ascii code ${c} ("${ch}")`);
    }
  });
};

Object.entries(frames).forEach(([k, f]) => check(k, f));
hop.forEach((f, i) => check(`hop[${i}]`, f));

if (errs.length) {
  console.error("FAIL — frame alignment errors:\n" + errs.join("\n"));
  process.exit(1);
}
console.log(`OK — ${Object.keys(frames).length} states + ${hop.length} hop frames, all ${width}x${height}, ascii-only.`);
