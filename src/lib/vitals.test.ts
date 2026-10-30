import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  builtAt,
  countAfter,
  MOOD_WORD,
  parseOpen,
  prsLabel,
  PULLS_MIN_GAP_MS,
  PULLS_REFRESH_MS,
  refreshDue,
  shortSha,
} from "./vitals.ts";

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

describe("pulls timing", () => {
  it("refreshes every 5 min, with a smaller min gap", () => {
    assert.equal(PULLS_REFRESH_MS, 5 * 60_000);
    assert.ok(PULLS_MIN_GAP_MS < PULLS_REFRESH_MS);
  });
});

describe("refreshDue", () => {
  it("is false while the tab is hidden", () => {
    assert.equal(refreshDue(false, null, 0), false);
    assert.equal(refreshDue(false, 0, PULLS_REFRESH_MS * 10), false);
  });

  it("is true on the first call", () => {
    assert.equal(refreshDue(true, null, 0), true);
    assert.equal(refreshDue(true, null, 123_456), true);
  });

  it("holds until the min gap has passed", () => {
    const last = 10_000;
    assert.equal(refreshDue(true, last, last + PULLS_MIN_GAP_MS - 1), false);
    assert.equal(refreshDue(true, last, last + PULLS_MIN_GAP_MS), true);
  });

  it("is false when no time has passed", () => {
    assert.equal(refreshDue(true, 5_000, 5_000), false);
  });

  it("is true well past the refresh interval", () => {
    assert.equal(refreshDue(true, 0, PULLS_REFRESH_MS), true);
    assert.equal(refreshDue(true, 0, PULLS_REFRESH_MS * 3), true);
  });
});

describe("countAfter", () => {
  it("returns the count on a 200 with a valid body", () => {
    for (const open of [0, 4, 300]) assert.equal(countAfter(200, { open }), open);
  });

  it("returns null on a 200 with a bad body", () => {
    const bad: unknown[] = [null, {}, { open: -1 }, { open: 1.5 }, { open: "4" }];
    for (const body of bad) assert.equal(countAfter(200, body), null, JSON.stringify(body));
  });

  it("returns null on any other status, even with a valid body", () => {
    for (const status of [204, 304, 500]) assert.equal(countAfter(status, { open: 4 }), null, String(status));
  });
});
