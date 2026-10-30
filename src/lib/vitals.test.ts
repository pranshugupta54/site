import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { builtAt, MOOD_WORD, parseOpen, prsLabel, shortSha } from "./vitals.ts";

describe("MOOD_WORD", () => {
  it("maps exactly the four moods", () => {
    assert.deepEqual(MOOD_WORD, { night: "asleep", morning: "on coffee", day: "awake", evening: "yawning" });
  });
});

describe("prsLabel", () => {
  it("handles zero, one, many", () => {
    assert.equal(prsLabel(0), "no PRs open");
    assert.equal(prsLabel(1), "1 PR open");
    assert.equal(prsLabel(2), "2 PRs open");
    assert.equal(prsLabel(1234), "1234 PRs open");
  });
});

describe("parseOpen", () => {
  it("reads a non-negative integer open count", () => {
    assert.equal(parseOpen({ open: 3 }), 3);
    assert.equal(parseOpen({ open: 0 }), 0);
  });

  it("ignores extra keys", () => {
    assert.equal(parseOpen({ open: 2, title: "x" }), 2);
  });

  it("returns null for anything unexpected", () => {
    const bad: unknown[] = [null, undefined, {}, { open: "3" }, { open: -1 }, { open: 1.5 }, { open: NaN }, { open: Infinity }, [], [3], "open"];
    for (const body of bad) assert.equal(parseOpen(body), null, JSON.stringify(body) ?? String(body));
  });
});

describe("shortSha", () => {
  const full = "0123456789abcdef0123456789abcdef01234567";

  it("shortens a full sha to 7 chars", () => {
    assert.equal(full.length, 40);
    assert.equal(shortSha(full), "0123456");
  });

  it("keeps a 7-char sha and accepts uppercase", () => {
    assert.equal(shortSha("abc1234"), "abc1234");
    assert.equal(shortSha("ABCDEF1"), "ABCDEF1");
  });

  it("returns null for anything else", () => {
    const bad = ["", "abc123", "zzzzzzz", "abc/1234", "abc 1234", " abc1234", "abc1234\n", `${full}0`, "../../etc"];
    for (const s of bad) assert.equal(shortSha(s), null, JSON.stringify(s));
  });
});

describe("builtAt", () => {
  it("parses a valid iso string", () => {
    const iso = "2026-10-30T12:00:00Z";
    const d = builtAt(iso);
    assert.ok(d instanceof Date);
    assert.equal(d.getTime(), Date.parse(iso));
  });

  it("returns null for empty or garbage", () => {
    assert.equal(builtAt(""), null);
    assert.equal(builtAt("garbage"), null);
  });
});
