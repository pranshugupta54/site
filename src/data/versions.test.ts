import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const data = JSON.parse(readFileSync(join(root, "src/data/versions.json"), "utf8"));

type VersionEntry = {
  version: string;
  date: string;
  name: string;
  tofu: string;
  highlights: string[];
  archive: "static" | null;
};

type VersionsFile = {
  current: string;
  renovation: { version: string; href: string } | null;
  versions: VersionEntry[];
};

const versions = data as VersionsFile;

// Local calendar fields. `new Date("YYYY-MM-DD")` is UTC and can land on the previous day.
function validDate(value: string): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

describe("versions.json", () => {
  it("points current at an entry in the list", () => {
    assert.ok(versions.versions.some((version) => version.version === versions.current));
  });

  it("uses each version id once", () => {
    const ids = versions.versions.map((version) => version.version);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) {
      assert.equal(typeof id, "string");
      assert.ok(id.length > 0);
    }
  });

  it("uses real YYYY-MM-DD launch dates", () => {
    for (const version of versions.versions) {
      assert.equal(validDate(version.date), true, version.date);
    }
  });

  it("lists versions newest first", () => {
    for (let i = 1; i < versions.versions.length; i++) {
      const newer = versions.versions[i - 1].date;
      const older = versions.versions[i].date;
      assert.ok(newer >= older, `${newer} should be on or after ${older}`);
    }
  });

  it("gives every version a name, a tofu line, and 1-6 highlights", () => {
    for (const version of versions.versions) {
      assert.equal(typeof version.name, "string");
      assert.ok(version.name.length > 0, version.version);
      assert.equal(typeof version.tofu, "string");
      assert.ok(version.tofu.length > 0, version.version);
      assert.ok(Array.isArray(version.highlights), version.version);
      assert.ok(version.highlights.length >= 1 && version.highlights.length <= 6, version.version);
      for (const line of version.highlights) {
        assert.equal(typeof line, "string");
        assert.ok(line.length > 0);
      }
    }
  });

  it("only uses null or static for archive", () => {
    for (const version of versions.versions) {
      assert.ok(version.archive === null || version.archive === "static", version.version);
    }
  });

  it("keeps public/v/<n>/index.html for every static archive", () => {
    for (const version of versions.versions) {
      if (version.archive !== "static") continue;
      const index = join(root, "public/v", version.version, "index.html");
      assert.equal(existsSync(index), true, index);
    }
  });

  it("does not archive the current version", () => {
    const current = versions.versions.find((version) => version.version === versions.current);
    assert.ok(current);
    assert.equal(current.archive, null);
  });

  it("keeps renovation null or an https preview", () => {
    const renovation = versions.renovation as { version?: unknown; href?: unknown } | null;
    if (renovation === null) {
      assert.equal(renovation, null);
      return;
    }
    assert.equal(typeof renovation.version, "string");
    assert.ok((renovation.version as string).length > 0);
    assert.match(renovation.href as string, /^https:\/\//);
  });
});
