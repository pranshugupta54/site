import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SLIDE_IDS, buildSlides, calendarStats, seasonsWorn, slidePath, topLanguage, yearLabel, type Day, type WrappedInput } from "./wrapped.ts";
import { WRAPPED } from "../data/wrapped.ts";
import reading from "../data/reading.json" with { type: "json" };

const days = (start: string, counts: number[]): Day[] =>
  counts.map((count, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), count };
  });

describe("calendarStats", () => {
  it("totals, peaks and the longest streak", () => {
    const s = calendarStats(days("2026-01-30", [1, 2, 0, 5, 5, 3, 0, 9, 0]));
    assert.equal(s.total, 25);
    assert.deepEqual(s.busiestDay, { date: "2026-02-06", count: 9 });
    assert.deepEqual(s.streak, { days: 3, start: "2026-02-02", end: "2026-02-04" });
    assert.equal(s.months[0], 3);
    assert.equal(s.months[1], 22);
    assert.equal(s.busiestMonth, 1);
    assert.equal(s.pad, 5); // jan 30, 2026 is a friday
    assert.deepEqual(s.levels, [1, 1, 0, 3, 3, 2, 0, 4, 0]);
  });

  it("ties go to the earlier day; order of input doesn't matter", () => {
    const s = calendarStats(days("2026-03-01", [4, 1, 4]).reverse());
    assert.equal(s.busiestDay?.date, "2026-03-01");
  });

  it("an empty year has no peaks", () => {
    const s = calendarStats(days("2026-01-01", [0, 0, 0]));
    assert.equal(s.total, 0);
    assert.equal(s.busiestDay, null);
    assert.equal(s.streak, null);
    assert.equal(s.busiestMonth, -1);
  });
});

describe("yearLabel", () => {
  const tz = "Asia/Kolkata";
  it("says 'so far' until dec 1 in pranshu's timezone", () => {
    assert.equal(yearLabel(2026, new Date("2026-11-30T18:00:00Z"), tz).label, "2026 so far");
    // 18:30Z on nov 30 is midnight dec 1 in india
    assert.equal(yearLabel(2026, new Date("2026-11-30T18:30:00Z"), tz).label, "2026, wrapped");
    assert.equal(yearLabel(2026, new Date("2027-02-01T00:00:00Z"), tz).title, "pranshu's 2026, wrapped");
    assert.equal(yearLabel(2027, new Date("2026-12-20T00:00:00Z"), tz).soFar, true);
  });
});

describe("topLanguage", () => {
  const r = (language: string | null, pushedAt = "2026-05-01") => ({ language, pushedAt });
  it("needs a clear winner across repos pushed that year", () => {
    assert.equal(topLanguage([r("Swift"), r("Ruby"), r("HTML")], 2026), null);
    assert.equal(topLanguage([r("Go"), r("Go"), r("Rust"), r("Rust")], 2026), null);
    assert.equal(topLanguage([r("Go"), r("Go", "2025-01-01"), r("Rust")], 2026), null);
    assert.deepEqual(topLanguage([r("Go"), r("Go"), r("Rust"), r(null)], 2026), {
      name: "go",
      repos: 2,
      of: 4,
      rows: [
        { label: "go", value: 2 },
        { label: "rust", value: 1 },
      ],
    });
  });
});

describe("seasonsWorn", () => {
  const seasons = [
    { name: "halloween", start: "10-26", end: "10-31" },
    { name: "winter", start: "12-15", end: "01-01" },
    { name: "diwali", start: "2026-11-06", end: "2026-11-10" },
    { name: "holi", start: "03-03", end: "03-04" },
  ];
  const tz = "Asia/Kolkata";
  it("counts what the site wore that year, from the day it could", () => {
    assert.deepEqual(seasonsWorn(seasons, 2026, new Date("2026-11-20T00:00:00Z"), tz, "2026-10-30"), ["halloween", "diwali"]);
    assert.deepEqual(seasonsWorn(seasons, 2026, new Date("2026-12-20T00:00:00Z"), tz, "2026-10-30"), ["halloween", "winter", "diwali"]);
    // last winter (dec 2025 → jan 1) belongs to 2025; one-offs only count in their year
    assert.deepEqual(seasonsWorn(seasons, 2027, new Date("2027-03-10T00:00:00Z"), tz), ["holi"]);
  });
  it("starts a season on its first day in pranshu's timezone, not utc's", () => {
    // 20:00Z on dec 14 is already dec 15 in india
    assert.deepEqual(seasonsWorn(seasons, 2026, new Date("2026-12-14T20:00:00Z"), tz, "2026-10-30"), ["halloween", "winter", "diwali"]);
  });
});

const input = (over: Partial<WrappedInput> = {}): WrappedInput => ({
  year: 2026,
  title: "pranshu's 2026 so far",
  label: "2026 so far",
  soFar: true,
  calendar: days("2026-01-01", [3, 4, 0, 9]),
  repos: [],
  stars: { name: "digitomize", stars: 598, blurb: "contests" },
  hertz: { releases: 16, latest: "v0.1.16" },
  site: { prs: 44, versions: [{ version: "2", name: "the terminal" }], seasons: ["halloween"], worklog: 30, reads: 20, notes: 2 },
  read: { title: "A Read", source: "example.com", url: "https://example.com", take: "good.", why: "liked it." },
  ...over,
});

describe("buildSlides", () => {
  it("keeps slide ids known, ordered and unique", () => {
    const ids = buildSlides(input()).map((s) => s.id);
    assert.deepEqual(ids, ["intro", "contributions", "busiest-day", "busiest-month", "streak", "stars", "hertz", "site", "read", "outro"]);
    for (const id of ids) assert.ok((SLIDE_IDS as readonly string[]).includes(id), id);
    const order = ids.map((id) => SLIDE_IDS.indexOf(id as never));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
  });

  it("hides what it can't count, never fakes it", () => {
    const ids = buildSlides(input({ calendar: null, stars: null, hertz: null, read: null, site: { prs: null, versions: [], seasons: [], worklog: 0, reads: 0, notes: 0 } })).map((s) => s.id);
    assert.deepEqual(ids, ["intro", "outro"]);
  });

  it("counts up only real numbers, formatted like the value", () => {
    for (const s of buildSlides(input())) if (s.num !== undefined) assert.ok(s.value.includes(s.num.toLocaleString("en-US")), s.id);
  });

  it("says 'so far' before december and 'wrapped' after", () => {
    assert.equal(buildSlides(input())[0].unit, "so far");
    const after = buildSlides(input({ soFar: false, title: "pranshu's 2026, wrapped", label: "2026, wrapped" }));
    assert.equal(after[0].unit, "wrapped");
    assert.match(after.at(-1)!.line!, /2027/);
  });

  it("shows the busiest day as a short date with its weekday", () => {
    const day = buildSlides(input()).find((s) => s.id === "busiest-day")!;
    assert.equal(day.value, "jan 4");
    assert.match(day.line!, /sunday/);
  });
});

describe("busiest month", () => {
  const month = (y: Partial<WrappedInput>) => buildSlides(input(y)).find((s) => s.id === "busiest-month")!;
  const sepOct = [...days("2026-09-01", [407, ...Array(29).fill(0)]), ...days("2026-10-01", [398])];
  it("names a close race and prints both counts", () => {
    const s = month({ calendar: sepOct });
    assert.equal(s.value, "september");
    assert.match(s.line!, /october came within 9\./);
    assert.deepEqual(s.viz?.kind === "bars" && s.viz.show, [8, 9]);
  });
  it("calls a tie and keeps the earlier month", () => {
    const s = month({ calendar: [...days("2026-03-01", [5]), ...days("2026-04-01", [5])] });
    assert.equal(s.value, "march");
    assert.match(s.line!, /tied with april/);
  });
  it("keeps it short when one month runs away with it", () => {
    const s = month({ calendar: [...days("2026-03-01", [50]), ...days("2026-04-01", [5])] });
    assert.equal(s.line, "91% of the year so far, in one month.");
    assert.deepEqual(s.viz?.kind === "bars" && s.viz.show, [2]);
  });
});

describe("slidePath", () => {
  it("puts the intro at /wrapped", () => {
    assert.equal(slidePath("intro"), "/wrapped");
    assert.equal(slidePath("streak"), "/wrapped/streak");
  });
});

describe("config", () => {
  it("the favorite read is on the reading list", () => {
    if (!WRAPPED.favoriteRead) return;
    assert.ok((reading as { url: string }[]).some((r) => r.url === WRAPPED.favoriteRead!.url));
  });
});
