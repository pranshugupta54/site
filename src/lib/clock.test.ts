import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { previewOffset } from "./clock.ts";
import { pickSeason, SEASONS } from "../data/seasons.ts";

const real = new Date(2026, 10, 9, 12).getTime();

describe("previewOffset", () => {
  it("is null without ?now= or with junk", () => {
    assert.equal(previewOffset("", real), null);
    assert.equal(previewOffset("?season=winter", real), null);
    assert.equal(previewOffset("?now=", real), null);
    assert.equal(previewOffset("?now=nope", real), null);
  });
  it("offsets the real clock to the requested local time", () => {
    const o = previewOffset("?now=2026-12-20T12:00:00", real);
    assert.equal(real + (o as number), new Date(2026, 11, 20, 12).getTime());
  });
  it("finds now= among other params", () => {
    assert.notEqual(previewOffset("?season=winter&now=2026-12-20T12:00:00", real), null);
    assert.notEqual(previewOffset("?a=1&now=2026-12-20T12:00:00&b=2", real), null);
  });
  it("selects the season for that date, and an explicit pin still wins", () => {
    const at = (s: string, pin: string | null) =>
      pickSeason(new Date(real + (previewOffset(s, real) as number)), SEASONS, pin);
    assert.equal(at("?now=2026-12-20T12:00:00", null), "winter");
    assert.equal(at("?now=2026-11-11T00:00:00", null), null);
    assert.equal(at("?now=2026-12-20T12:00:00", "diwali"), "diwali");
    assert.equal(at("?now=2026-12-20T12:00:00", "off"), null);
  });
});
