import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leavesSince, monthGrid, phaseAt } from "./room.ts";

const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);

describe("phaseAt", () => {
  it("follows the local clock through the day", () => {
    assert.equal(phaseAt(at(4, 59)), "night");
    assert.equal(phaseAt(at(5)), "dawn");
    assert.equal(phaseAt(at(7)), "day");
    assert.equal(phaseAt(at(17, 29)), "day");
    assert.equal(phaseAt(at(17, 30)), "dusk");
    assert.equal(phaseAt(at(19, 30)), "night");
    assert.equal(phaseAt(at(0)), "night");
  });
});

describe("leavesSince", () => {
  it("grows one leaf per month, counting the first", () => {
    assert.equal(leavesSince("2026-05-30", new Date(2026, 4, 30)), 1);
    assert.equal(leavesSince("2026-05-30", new Date(2026, 5, 29)), 1);
    assert.equal(leavesSince("2026-05-30", new Date(2026, 5, 30)), 2);
    assert.equal(leavesSince("2026-05-30", new Date(2026, 10, 9)), 6);
    assert.equal(leavesSince("2026-05-30", new Date(2027, 4, 30)), 13);
  });
  it("never goes below one, even for bad or future dates", () => {
    assert.equal(leavesSince("nope", new Date(2026, 10, 9)), 1);
    assert.equal(leavesSince("2027-01-01", new Date(2026, 10, 9)), 1);
  });
});

describe("monthGrid", () => {
  it("starts weeks on monday and marks logged days and today", () => {
    // nov 2026 starts on a sunday → six blanks
    const g = monthGrid(new Date(2026, 10, 9, 12), [
      new Date(2026, 10, 3, 10).toISOString(),
      new Date(2026, 10, 9, 1).toISOString(),
      new Date(2026, 9, 31, 10).toISOString(), // october: ignored
      "garbage",
    ]);
    assert.equal(g.slice(0, 6).every((c) => c === null), true);
    assert.equal(g.length, 6 + 30);
    const day = (n: number) => g.find((c) => c?.day === n);
    assert.equal(day(3)?.logged, true);
    assert.equal(day(9)?.logged, true);
    assert.equal(day(9)?.today, true);
    assert.equal(day(4)?.logged, false);
  });
});
