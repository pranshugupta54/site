import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { execFileSync } from "node:child_process";
import { DOORS, countdown, doorView, homeEntryVisible, isOpen, openCount, opensIn, parseDoor, previewNow, unlockAt } from "./advent.ts";
import { ADVENT, ADVENT_YEAR } from "../data/advent.ts";

const Y = 2026;
const z = (s: string) => new Date(s);
const open = (v: { state: string }) => v.state === "open";

describe("date gating", () => {
  it("unlockAt is dec n 00:00 IST (dec n-1 18:30Z)", () => {
    assert.equal(unlockAt(5, Y).toISOString(), "2026-12-04T18:30:00.000Z");
    assert.equal(unlockAt(1, Y).toISOString(), "2026-11-30T18:30:00.000Z");
    assert.equal(unlockAt(24, Y).toISOString(), "2026-12-23T18:30:00.000Z");
  });
  it("every door is locked 1ms before its IST midnight and open at it", () => {
    for (let n = 1; n <= DOORS; n++) {
      const t = unlockAt(n, Y).getTime();
      assert.equal(isOpen(n, new Date(t - 1), Y), false, `door ${n} early`);
      assert.equal(isOpen(n, new Date(t), Y), true, `door ${n} on time`);
      assert.equal(isOpen(n, new Date(t + 1), Y), true);
    }
  });
  it("openCount: 0 on nov 30, 24 from dec 24", () => {
    assert.equal(openCount(z("2026-11-30T00:00:00Z"), Y), 0);
    assert.equal(openCount(z("2026-11-30T18:29:59.999Z"), Y), 0);
    assert.equal(openCount(z("2026-11-30T18:30:00Z"), Y), 1);
    assert.equal(openCount(z("2026-12-23T18:30:00Z"), Y), 24);
    assert.equal(openCount(z("2026-12-31T00:00:00Z"), Y), 24);
    assert.equal(openCount(z("2027-06-01T00:00:00Z"), Y), 24);
  });
  it("openCount is monotonic and steps by one per door", () => {
    for (let n = 1; n <= DOORS; n++) assert.equal(openCount(unlockAt(n, Y), Y), n);
  });
  it("a different year does not open this year's doors", () => {
    assert.equal(openCount(z("2026-12-10T00:00:00Z"), 2025), 24);
    assert.equal(openCount(z("2026-12-10T00:00:00Z"), 2027), 0);
  });
  it("non-integer or out-of-range n is never open", () => {
    const late = z("2030-01-01T00:00:00Z");
    for (const n of [0, -1, 25, 100, 1.5, 3.0001, NaN, Infinity, -Infinity]) assert.equal(isOpen(n, late, Y), false, String(n));
    assert.equal(isOpen(24, late, Y), true);
    assert.equal(isOpen(1, late, Y), true);
  });
});

describe("IST boundaries", () => {
  it("dec 4 18:29:59.999Z keeps door 5 locked, 18:30Z opens it", () => {
    assert.equal(isOpen(5, z("2026-12-04T18:29:59.999Z"), Y), false);
    assert.equal(isOpen(5, z("2026-12-04T18:30:00.000Z"), Y), true);
  });
  it("is independent of the process timezone", () => {
    const code = `
      import { isOpen, openCount, homeEntryVisible } from "./src/lib/advent.ts";
      const a = [isOpen(5, new Date("2026-12-04T18:29:59.999Z"), 2026), isOpen(5, new Date("2026-12-04T18:30:00Z"), 2026), openCount(new Date("2026-12-10T12:00:00Z"), 2026), homeEntryVisible(new Date("2026-11-29T18:30:00Z"), 2026)];
      console.log(JSON.stringify(a));`;
    const outs = new Set<string>();
    for (const TZ of ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      outs.add(execFileSync(process.execPath, ["--input-type=module", "-e", code], { env: { ...process.env, TZ }, cwd: process.cwd() }).toString().trim());
    }
    assert.deepEqual([...outs], ["[false,true,10,true]"]);
  });
});

describe("previewNow", () => {
  const real = z("2026-12-10T00:00:00Z");
  it("falls back to real on missing/garbage", () => {
    for (const raw of [undefined, null, "", "   ", "garbage", "2026-13-45", "tomorrow", "NaN"]) assert.equal(previewNow(raw, real, true), real, String(raw));
  });
  it("reads a zoneless value as IST", () => {
    assert.equal(previewNow("2026-12-05T09:00", real, true).toISOString(), "2026-12-05T03:30:00.000Z");
    assert.equal(previewNow("2026-12-05T09:00:30", real, true).toISOString(), "2026-12-05T03:30:30.000Z");
    assert.equal(previewNow("2026-12-05T09:00:30.250", real, true).toISOString(), "2026-12-05T03:30:30.250Z");
  });
  it("date-only means 00:00 IST", () => {
    assert.equal(previewNow("2026-12-05", real, true).toISOString(), "2026-12-04T18:30:00.000Z");
  });
  it("honours explicit zones", () => {
    assert.equal(previewNow("2026-12-05T09:00:00Z", real, true).toISOString(), "2026-12-05T09:00:00.000Z");
    assert.equal(previewNow("2026-12-05T09:00:00+05:30", real, true).toISOString(), "2026-12-05T03:30:00.000Z");
    assert.equal(previewNow("2026-12-05T09:00:00-08:00", real, true).toISOString(), "2026-12-05T17:00:00.000Z");
  });
  it("trims whitespace", () => {
    assert.equal(previewNow("  2026-12-05  ", real, true).toISOString(), "2026-12-04T18:30:00.000Z");
  });
  it("date-only preview lands exactly on the door boundary", () => {
    assert.equal(isOpen(5, previewNow("2026-12-05", real, true), Y), true);
    assert.equal(isOpen(6, previewNow("2026-12-05", real, true), Y), false);
  });
  it("production clamp: a future value never exceeds real", () => {
    for (const raw of ["2026-12-24", "2026-12-24T00:00", "2030-01-01T00:00:00Z", "2026-12-10T05:30:00.001+05:30", "2026-12-10T00:00:01Z"]) {
      assert.equal(previewNow(raw, real, false).getTime(), real.getTime(), raw);
    }
    assert.equal(openCount(previewNow("2026-12-24", z("2026-12-02T00:00:00Z"), false), Y), 2);
  });
  it("production still allows looking back, and exactly now", () => {
    assert.equal(previewNow("2026-12-05", real, false).toISOString(), "2026-12-04T18:30:00.000Z");
    assert.equal(previewNow("2026-12-10T00:00:00Z", real, false).getTime(), real.getTime());
  });
  it("array-ish and odd inputs never throw or open early", () => {
    for (const raw of [["2026-12-24"], ["2026-12-24", "x"], {}, 5, true] as unknown[]) {
      let got: Date | undefined;
      try { got = previewNow(raw as string, real, false); } catch { got = undefined; }
      if (got) assert.ok(got.getTime() <= real.getTime(), String(raw));
    }
  });
});

describe("homeEntryVisible", () => {
  it("nov 30 00:00 IST inclusive through dec 25 00:00 IST exclusive", () => {
    assert.equal(homeEntryVisible(z("2026-11-29T18:29:59.999Z"), Y), false);
    assert.equal(homeEntryVisible(z("2026-11-29T18:30:00Z"), Y), true);
    assert.equal(homeEntryVisible(z("2026-12-12T00:00:00Z"), Y), true);
    assert.equal(homeEntryVisible(z("2026-12-24T18:29:59.999Z"), Y), true);
    assert.equal(homeEntryVisible(z("2026-12-24T18:30:00Z"), Y), false);
    assert.equal(homeEntryVisible(z("2027-01-10T00:00:00Z"), Y), false);
    assert.equal(homeEntryVisible(z("2026-06-01T00:00:00Z"), Y), false);
  });
});

describe("parseDoor", () => {
  it("accepts 1..24", () => {
    for (let n = 1; n <= 24; n++) assert.equal(parseDoor(String(n)), n);
  });
  it("rejects junk", () => {
    for (const r of ["0", "25", "05", "1.0", "abc", "", null, undefined, "-1", " 5", "5 ", "+5", "1e1", "99", "100", "007", "٣"]) assert.equal(parseDoor(r), null, String(r));
  });
});

describe("countdown / opensIn", () => {
  it("formats", () => {
    assert.equal(countdown(0), "00:00:00");
    assert.equal(countdown(-5000), "00:00:00");
    assert.equal(countdown(1), "00:00:01");
    assert.equal(countdown(3661_000), "01:01:01");
    assert.equal(countdown((3 * 86400 + 4 * 3600 + 12 * 60 + 9) * 1000), "3d 04:12:09");
  });
  it("opensIn is coarse and 'open' once open", () => {
    const t = unlockAt(5, Y).getTime();
    assert.equal(opensIn(5, new Date(t), Y), "open");
    assert.equal(opensIn(5, new Date(t + 1), Y), "open");
    assert.equal(opensIn(5, new Date(t - 1), Y), "opens in 1m");
    assert.equal(opensIn(5, new Date(t - 30 * 60_000), Y), "opens in 30m");
    assert.equal(opensIn(5, new Date(t - 3600_000), Y), "opens in 1h");
    assert.equal(opensIn(5, new Date(t - 4 * 3600_000 + 1), Y), "opens in 4h");
    assert.equal(opensIn(5, new Date(t - 3 * 86400_000), Y), "opens in 3 days");
  });
});

describe("doorView (spoiler guard)", () => {
  const before = (n: number) => new Date(unlockAt(n, ADVENT_YEAR).getTime() - 1);
  it("a locked door returns exactly {n,state,hint,opensAt}", () => {
    for (const d of ADVENT) {
      const v = doorView(d, before(d.n), ADVENT_YEAR);
      assert.deepEqual(Object.keys(v).sort(), ["hint", "n", "opensAt", "state"], `door ${d.n}`);
      assert.deepEqual(v, { n: d.n, state: "locked", hint: d.hint, opensAt: unlockAt(d.n, ADVENT_YEAR).toISOString() });
    }
  });
  it("no locked field leaks: title/tofu/body/link/glyph/toy/kind", () => {
    for (const d of ADVENT) {
      const v = doorView(d, before(d.n), ADVENT_YEAR) as Record<string, unknown>;
      for (const k of ["title", "tofu", "body", "link", "glyph", "toy", "kind"]) assert.equal(k in v, false, `door ${d.n} leaks ${k}`);
      const json = JSON.stringify(v);
      for (const s of [d.title, d.tofu, ...(d.body ?? [])]) assert.equal(json.includes(s), false, `door ${d.n} json leaks "${s}"`);
    }
  });
  it("open at the boundary returns the whole door", () => {
    for (const d of ADVENT) {
      const v = doorView(d, unlockAt(d.n, ADVENT_YEAR), ADVENT_YEAR);
      assert.ok(open(v));
      assert.deepEqual(v, { ...d, state: "open" });
    }
  });
  it("a production-clamped future preview cannot open doors early", () => {
    const real = z("2026-12-02T10:00:00Z");
    const now = previewNow("2026-12-24T00:00", real, false);
    ADVENT.forEach((d) => assert.equal(open(doorView(d, now, ADVENT_YEAR)), d.n <= 2));
  });
});

describe("advent data", () => {
  const strip = (s: string) => s.replace(/`[^`]*`/g, "");
  const texts = (d: (typeof ADVENT)[number]) => [d.hint, d.title, d.tofu, ...(d.body ?? []), d.link?.label ?? ""];
  it("24 doors numbered 1..24 in order", () => {
    assert.equal(ADVENT.length, 24);
    ADVENT.forEach((d, i) => assert.equal(d.n, i + 1));
    assert.equal(ADVENT_YEAR, 2026);
  });
  it("every door has a hint, title, tofu line", () => {
    for (const d of ADVENT) for (const k of ["hint", "title", "tofu"] as const) assert.ok(d[k].trim().length > 0, `door ${d.n} ${k}`);
  });
  it("glyph is 1-3 printable ascii chars", () => {
    for (const d of ADVENT) assert.match(d.glyph, /^[\x20-\x7e]{1,3}$/, `door ${d.n}`);
  });
  it("copy is lowercase: no capitalised sentence starts outside backticks", () => {
    for (const d of ADVENT) for (const t of texts(d)) {
      const s = strip(t);
      assert.doesNotMatch(s, /^\s*[A-Z]/, `door ${d.n}: "${t}"`);
      assert.doesNotMatch(s, /[.!?]\s+[A-Z]/, `door ${d.n}: "${t}"`);
    }
  });
  it("never mentions traycer", () => {
    assert.doesNotMatch(readFileSync(new URL("../data/advent.ts", import.meta.url), "utf8"), /traycer/i);
    assert.doesNotMatch(JSON.stringify(ADVENT), /traycer/i);
  });
  it("toy ids are known and each has a file under components/advent/toys", () => {
    const src = readFileSync(new URL("../data/advent.ts", import.meta.url), "utf8");
    const m = /export type ToyId =([^;]+);/.exec(src);
    assert.ok(m);
    const ids = [...m[1].matchAll(/"([a-z]+)"/g)].map((x) => x[1]);
    assert.ok(ids.length > 0);
    for (const d of ADVENT) if (d.toy) assert.ok(ids.includes(d.toy), `door ${d.n} toy ${d.toy}`);
    for (const id of ids) assert.ok(existsSync(new URL(`../components/advent/toys/${id}.tsx`, import.meta.url)), `toys/${id}.tsx`);
  });
  it("toy doors have a toy id; internal links start with /; external ones are https", () => {
    for (const d of ADVENT) {
      if (d.kind === "toy" || d.kind === "finale") assert.ok(d.toy, `door ${d.n} needs a toy`);
      if (d.link) assert.match(d.link.href, d.link.ext ? /^https:\/\// : /^\//, `door ${d.n}`);
    }
  });
});
