import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countdownText, newYearState, newYearTarget, pickSeason, seasonCommands, SEASONS } from "./seasons.ts";

const yearly = [{ id: "span", start: "06-10", end: "06-20" }];
const wrapping = [{ id: "nye", start: "12-30", end: "01-02" }];
const oneOff = [{ id: "once", start: "2026-03-14", end: "2026-03-16" }];

const MD = /^(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const YMD = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
// Feb 29 is allowed on a repeating MM-DD window. 30/31 stay month-specific.
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function validBound(value: string): boolean {
  const match = YMD.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }
  if (!MD.test(value)) return false;
  const month = Number(value.slice(0, 2));
  const day = Number(value.slice(3));
  return day <= MONTH_DAYS[month - 1];
}

describe("pickSeason MM-DD window", () => {
  it("matches inside the window and on both inclusive boundaries", () => {
    assert.equal(pickSeason(new Date(2026, 5, 10, 0), yearly, null), "span");
    assert.equal(pickSeason(new Date(2026, 5, 15, 12), yearly, null), "span");
    assert.equal(pickSeason(new Date(2026, 5, 20, 23), yearly, null), "span");
  });

  it("misses the local days just outside the window", () => {
    assert.equal(pickSeason(new Date(2026, 5, 9, 23), yearly, null), null);
    assert.equal(pickSeason(new Date(2026, 5, 21, 0), yearly, null), null);
  });
});

describe("pickSeason year-wrapping window", () => {
  it("matches from 12-30 through 01-02, including both boundaries", () => {
    assert.equal(pickSeason(new Date(2026, 11, 30, 0), wrapping, null), "nye");
    assert.equal(pickSeason(new Date(2026, 11, 31, 15), wrapping, null), "nye");
    assert.equal(pickSeason(new Date(2027, 0, 1, 12), wrapping, null), "nye");
    assert.equal(pickSeason(new Date(2027, 0, 2, 23), wrapping, null), "nye");
  });

  it("misses the days outside the wrap and a mid-year date", () => {
    assert.equal(pickSeason(new Date(2026, 11, 29, 23), wrapping, null), null);
    assert.equal(pickSeason(new Date(2027, 0, 3, 0), wrapping, null), null);
    assert.equal(pickSeason(new Date(2026, 6, 1, 12), wrapping, null), null);
  });
});

describe("pickSeason one-off YYYY-MM-DD window", () => {
  it("matches only that calendar year, on and inside the inclusive bounds", () => {
    assert.equal(pickSeason(new Date(2026, 2, 13, 23), oneOff, null), null);
    assert.equal(pickSeason(new Date(2026, 2, 14, 0), oneOff, null), "once");
    assert.equal(pickSeason(new Date(2026, 2, 15, 12), oneOff, null), "once");
    assert.equal(pickSeason(new Date(2026, 2, 16, 23), oneOff, null), "once");
    assert.equal(pickSeason(new Date(2026, 2, 17, 0), oneOff, null), null);
  });

  it("does not match the same MM-DD in another year", () => {
    assert.equal(pickSeason(new Date(2025, 2, 15, 12), oneOff, null), null);
    assert.equal(pickSeason(new Date(2027, 2, 15, 12), oneOff, null), null);
  });
});

describe("pickSeason override", () => {
  it("forces a known id even outside its window", () => {
    assert.equal(pickSeason(new Date(2026, 0, 1, 12), yearly, "span"), "span");
  });

  it("returns null for off even inside a window", () => {
    assert.equal(pickSeason(new Date(2026, 5, 15, 12), yearly, "off"), null);
  });

  it("ignores an unknown id and falls back to the calendar", () => {
    assert.equal(pickSeason(new Date(2026, 5, 15, 12), yearly, "nope"), "span");
    assert.equal(pickSeason(new Date(2026, 0, 1, 12), yearly, "nope"), null);
  });

  it("treats null as the calendar", () => {
    assert.equal(pickSeason(new Date(2026, 5, 15, 12), yearly, null), "span");
    assert.equal(pickSeason(new Date(2026, 0, 1, 12), yearly, null), null);
  });
});

describe("SEASONS", () => {
  it("has unique ids and valid start/end bounds", () => {
    const ids = SEASONS.map((season) => season.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const season of SEASONS) {
      assert.ok(season.id.length > 0);
      assert.equal(validBound(season.start), true, season.start);
      assert.equal(validBound(season.end), true, season.end);
      assert.equal(season.start.length > 5, season.end.length > 5);
    }
  });

  it("activates halloween on 2026-10-31 local and not on 2026-11-01", () => {
    assert.equal(pickSeason(new Date(2026, 9, 31, 12), SEASONS, null), "halloween");
    assert.equal(pickSeason(new Date(2026, 10, 1, 12), SEASONS, null), null);
  });

  it("activates diwali 2026-11-06 → 11-10 local, only in 2026", () => {
    assert.equal(pickSeason(new Date(2026, 10, 5, 23), SEASONS, null), null);
    assert.equal(pickSeason(new Date(2026, 10, 6, 0), SEASONS, null), "diwali");
    assert.equal(pickSeason(new Date(2026, 10, 10, 23), SEASONS, null), "diwali");
    assert.equal(pickSeason(new Date(2026, 10, 11, 0), SEASONS, null), null);
    assert.equal(pickSeason(new Date(2027, 10, 8, 12), SEASONS, null), null);
  });

  it("activates winter 12-15 → 01-01 local, every year, across new year", () => {
    assert.equal(pickSeason(new Date(2026, 11, 14, 23), SEASONS, null), null);
    assert.equal(pickSeason(new Date(2026, 11, 15, 0), SEASONS, null), "winter");
    assert.equal(pickSeason(new Date(2026, 11, 31, 23, 59), SEASONS, null), "winter");
    assert.equal(pickSeason(new Date(2027, 0, 1, 23), SEASONS, null), "winter");
    assert.equal(pickSeason(new Date(2027, 0, 2, 0), SEASONS, null), null);
    assert.equal(pickSeason(new Date(2027, 11, 20, 12), SEASONS, null), "winter");
  });

  it("never has two seasons claiming the same day", () => {
    const day = new Date(2026, 0, 1, 12);
    for (let i = 0; i < 366 * 2; i++, day.setDate(day.getDate() + 1)) {
      const hits = SEASONS.filter((s) => pickSeason(day, [s], null) === s.id).map((s) => s.id);
      assert.ok(hits.length <= 1, `${day.toDateString()}: ${hits.join(", ")}`);
    }
  });
});

describe("new year (local time)", () => {
  it("targets next year, or this year on jan 1", () => {
    assert.equal(newYearTarget(new Date(2026, 11, 15, 9)), 2027);
    assert.equal(newYearTarget(new Date(2026, 11, 31, 23, 59)), 2027);
    assert.equal(newYearTarget(new Date(2027, 0, 1, 0, 0, 1)), 2027);
    assert.equal(newYearTarget(new Date(2027, 0, 2, 12)), 2028);
  });

  it("shows no bar state outside dec 31 / jan 1", () => {
    assert.equal(newYearState(new Date(2026, 11, 30, 23, 59, 59)), null);
    assert.equal(newYearState(new Date(2027, 0, 2, 0, 0, 0)), null);
  });

  it("counts down on dec 31 as hh:mm:ss, rounding partial seconds up", () => {
    assert.deepEqual(newYearState(new Date(2026, 11, 31, 0, 0, 0)), { label: "2027 in 24:00:00", msLeft: 86_400_000 });
    assert.equal(newYearState(new Date(2026, 11, 31, 21, 47, 2))?.label, "2027 in 02:12:58");
    assert.equal(newYearState(new Date(2026, 11, 31, 23, 59, 59, 500))?.label, "2027 in 00:00:01");
  });

  it("greets on jan 1 with nothing left to count", () => {
    assert.deepEqual(newYearState(new Date(2027, 0, 1, 0, 0, 0)), { label: "happy 2027", msLeft: 0 });
    assert.deepEqual(newYearState(new Date(2027, 0, 1, 23, 59, 59)), { label: "happy 2027", msLeft: 0 });
  });

  it("phrases the year egg by distance", () => {
    assert.equal(countdownText(new Date(2026, 11, 15, 0, 0, 0)), "2027 in 17 days. pacing myself.");
    assert.equal(countdownText(new Date(2026, 11, 30, 0, 0, 0)), "2027 in 2 days. pacing myself.");
    assert.equal(countdownText(new Date(2026, 11, 30, 12, 0, 0)), "2027 in 1 day. pacing myself.");
    assert.equal(countdownText(new Date(2026, 11, 31, 17, 48, 0)), "6h 12m to 2027. chai in hand.");
    assert.equal(countdownText(new Date(2027, 0, 1, 0, 5)), "happy new year. it's 2027. tofu made it.");
  });

  it("registers the year egg under the target year of the clock it's asked with", () => {
    const winter = SEASONS.find((s) => s.id === "winter");
    assert.deepEqual(Object.keys(seasonCommands(winter, new Date(2026, 11, 20))), ["2027", "chai"]);
    assert.deepEqual(Object.keys(seasonCommands(winter, new Date(2027, 11, 31, 23, 59))), ["2028", "chai"]);
    assert.deepEqual(Object.keys(seasonCommands(winter, new Date(2028, 0, 1, 0, 1))), ["2028", "chai"]);
  });
});
