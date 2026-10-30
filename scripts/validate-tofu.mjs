#!/usr/bin/env node
// Guarantees Tofu's ascii frames are perfectly aligned: every frame is exactly
// width x height, every glyph printable ASCII (32-126). Run: node scripts/validate-tofu.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(here, "..", "src", "data", "tofu-frames.json"), "utf8"));
const { width, height, frames, hop, hats = {} } = data;

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

// seasonal hats: 3 printable chars that replace the gap between the ears.
// Must match dress() in src/components/tofu.tsx, and land on every frame.
const EARS = /([n~.|])   ([n.|])/;
const all = [...Object.entries(frames), ...hop.map((f, i) => [`hop[${i}]`, f])];
Object.entries(hats).forEach(([id, hat]) => {
  if (typeof hat !== "string" || hat.length !== 3) return errs.push(`hat ${id}: must be exactly 3 chars`);
  all.forEach(([name, f]) => {
    const at = f.slice(0, 2).findIndex((ln) => EARS.test(ln));
    if (at === -1) return errs.push(`hat ${id}: no ears to sit between in ${name}`);
    check(`${name}+${id}`, f.map((ln, i) => (i === at ? ln.replace(EARS, `$1${hat}$2`) : ln)));
  });
});

if (errs.length) {
  console.error("FAIL — frame alignment errors:\n" + errs.join("\n"));
  process.exit(1);
}
console.log(`OK — ${Object.keys(frames).length} states + ${hop.length} hop frames + ${Object.keys(hats).length} hats, all ${width}x${height}, ascii-only.`);
