import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { doorView, unlockAt } from "./advent.ts";
import { ADVENT, ADVENT_YEAR } from "../data/advent.ts";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// modules a client bundle must never pull in at runtime (extension and /index stripped)
const GUARDED = ["data/advent", "lib/advent-server", "components/advent/toys"];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?|mjs)$/.test(f) ? [p] : [];
  });
}

/** first statement is a "use client" directive (comments and blank lines may precede it) */
export function isClientFile(src: string): boolean {
  const s = src.replace(/^\uFEFF/, "").replace(/^(\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/)*/, "");
  return /^(["'])use client\1\s*;?/.test(s);
}

const norm = (p: string) => p.replace(/\.(tsx?|jsx?|mjs)$/, "").replace(/\/index$/, "");

function resolveSpec(spec: string, file: string): string | null {
  if (spec.startsWith("@/")) return norm(spec.slice(2));
  if (spec.startsWith(".")) return norm(relative(SRC, resolve(dirname(file), spec)).split("\\").join("/"));
  return null;
}

/** runtime (non-type) imports of guarded modules in `code`, as the specifiers used */
export function guardedImports(code: string, file: string): string[] {
  const hits: string[] = [];
  const check = (spec: string) => {
    const r = resolveSpec(spec, file);
    if (r && GUARDED.includes(r)) hits.push(spec);
  };
  const body = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const m of body.matchAll(/\b(?:import|export)\s+(type\s+)?([^'"();]*?)\s*from\s*['"]([^'"]+)['"]/g)) {
    if (m[1]) continue; // import type { … } / export type { … }
    const clause = m[2];
    const braces = /^\{([\s\S]*)\}$/.exec(clause.trim());
    if (braces) {
      const names = braces[1].split(",").map((x) => x.trim()).filter(Boolean);
      if (names.length && names.every((x) => /^type\s/.test(x))) continue; // { type X } only
    }
    check(m[3]);
  }
  for (const m of body.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) check(m[1]); // side-effect
  for (const m of body.matchAll(/\b(?:import|require)\s*\(\s*(?:`([^`]+)`|['"]([^'"]+)['"])\s*\)/g)) check(m[1] ?? m[2]);
  return hits;
}

describe("client files never import server-only advent modules", () => {
  it("scanner: catches runtime imports, allows type-only ones", () => {
    const f = join(SRC, "components/advent/x.tsx");
    const bad = [
      `import { ADVENT } from "@/data/advent";`,
      `import ADVENT from "../../data/advent.ts";`,
      `import * as a from "@/lib/advent-server";`,
      `import { toyFor } from "./toys";`,
      `import { toyFor } from "./toys/index";`,
      `import {\n  a,\n  type B,\n} from "@/data/advent";`,
      `import "@/data/advent";`,
      `export { ADVENT } from "@/data/advent";`,
      `const m = await import("@/lib/advent-server");`,
      `const m = require("../../lib/advent-server");`,
      `import A, { type B } from "@/data/advent";`,
    ];
    for (const c of bad) assert.equal(guardedImports(c, f).length, 1, c);
    const ok = [
      `import type { Door } from "@/data/advent";`,
      `import type Door from "@/data/advent";`,
      `import { type Door } from "@/data/advent";`,
      `import { type Door, type ToyId } from "../../data/advent";`,
      `export type { Door } from "@/data/advent";`,
      `import { doorView } from "@/lib/advent";`,
      `import Pet from "./toys/pet";`,
      `// import { ADVENT } from "@/data/advent";`,
      `/* import { ADVENT } from "@/data/advent"; */`,
    ];
    for (const c of ok) assert.deepEqual(guardedImports(c, f), [], c);
  });

  it("scanner: recognises the 'use client' directive", () => {
    for (const s of [`"use client";\nimport x from "y";`, `'use client'\n`, `// hi\n/* c */\n"use client";`]) assert.equal(isClientFile(s), true, s);
    for (const s of [`import x from "y";\n"use client";`, `const a = "use client";`, `"use server";`, ``]) assert.equal(isClientFile(s), false, s);
  });

  it("no 'use client' file under src/ imports them (alias, relative, dynamic or require)", () => {
    const files = walk(SRC);
    const clients = files.filter((f) => isClientFile(readFileSync(f, "utf8")));
    assert.ok(clients.length > 5, "found client files");
    assert.ok(clients.some((f) => f.includes("components/advent/")), "found advent client files");
    const offenders: string[] = [];
    for (const f of clients) {
      for (const spec of guardedImports(readFileSync(f, "utf8"), f)) offenders.push(`${relative(SRC, f)} → ${spec}`);
    }
    assert.deepEqual(offenders, []);
  });

  it("toys/index.tsx stays a server module", () => {
    assert.equal(isClientFile(readFileSync(join(SRC, "components/advent/toys/index.tsx"), "utf8")), false);
  });
});

describe("toy copy stays on the server", () => {
  const COPY_DOORS = [1, 5, 17, 24];
  const doors = COPY_DOORS.map((n) => ADVENT[n - 1]);
  const before = (n: number) => new Date(unlockAt(n, ADVENT_YEAR).getTime() - 1);

  it("doors 1, 5, 17, 24 carry non-empty copy", () => {
    assert.deepEqual(doors.map((d) => d.n), COPY_DOORS);
    for (const d of doors) {
      assert.ok(Array.isArray(d.copy) && d.copy.length > 0, `door ${d.n}`);
      for (const c of d.copy!) assert.ok(typeof c === "string" && c.trim().length > 0, `door ${d.n} copy line`);
    }
    assert.deepEqual(doors.map((d) => d.toy), ["pet", "catch", "fortune", "finale"]);
  });

  it("a locked view has no copy key and its JSON has none of the strings", () => {
    for (const d of doors) {
      const v = doorView(d, before(d.n), ADVENT_YEAR) as Record<string, unknown>;
      assert.equal("copy" in v, false, `door ${d.n}`);
      const json = JSON.stringify(v);
      for (const c of d.copy!) assert.equal(json.includes(c), false, `door ${d.n} leaks "${c}"`);
    }
  });

  it("an open view keeps the copy", () => {
    for (const d of doors) assert.deepEqual((doorView(d, unlockAt(d.n, ADVENT_YEAR), ADVENT_YEAR) as { copy?: string[] }).copy, d.copy);
  });

  it("client toy files never contain the copy verbatim", () => {
    const dir = join(SRC, "components/advent/toys");
    const files = readdirSync(dir).filter((f) => f.endsWith(".tsx") && f !== "index.tsx");
    assert.ok(files.length >= 8);
    for (const f of files) {
      const src = readFileSync(join(dir, f), "utf8");
      for (const d of doors) for (const c of d.copy!) assert.equal(src.includes(c), false, `${f} embeds door ${d.n} copy "${c}"`);
    }
  });

  it("copy is lowercase and never mentions traycer", () => {
    for (const d of doors) for (const c of d.copy!) {
      const s = c.replace(/`[^`]*`/g, "");
      assert.doesNotMatch(s, /^\s*[A-Z]/, c);
      assert.doesNotMatch(c, /traycer/i);
    }
  });
});
