import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GAUGES,
  GAUGE_OFF,
  GAUGE_ON,
  GAUGE_WIDTH,
  HERTZ_INSTALL,
  SKILLS_INSTALL,
  hertzReadout,
  matchEgg,
  oneSkillLine,
} from "./shell-eggs.ts";

function bars(text: string): string[] {
  return text.split("\n").slice(1).map((row) => row.match(new RegExp(`[${GAUGE_ON}${GAUGE_OFF}]+`))![0]);
}

describe("matchEgg: hertz", () => {
  for (const line of [
    "brew install hertz",
    "brew install --cask hertz",
    "brew install pranshugupta54/tap/hertz",
    "brew install --cask pranshugupta54/tap/hertz",
    "brew install hertz --cask",
    "  BREW  Install   HERTZ  ",
  ]) {
    it(`matches ${JSON.stringify(line)}`, () => assert.equal(matchEgg(line), "hertz"));
  }

  for (const line of [
    "brew install",
    "brew install foo",
    "brew install hertz extra",
    "brew install --cask --cask hertz",
    "brew install --cask",
    "brew hertz",
    "brew uninstall hertz",
    "brew install someone/tap/hertz",
    "brew",
    "",
  ]) {
    it(`rejects ${JSON.stringify(line)}`, () => assert.equal(matchEgg(line), null));
  }
});

describe("matchEgg: skills", () => {
  it("bare add", () => assert.equal(matchEgg("npx skills add"), "skills-bare"));
  it("repo", () => assert.equal(matchEgg("npx skills add pranshugupta54/skills"), "skills"));
  it("repo, uppercase", () => assert.equal(matchEgg("npx skills add PranshuGupta54/Skills"), "skills"));
  for (const line of [
    "npx skills add other/repo",
    "npx skills add pranshugupta54/skills extra",
    "npx skills",
    "npx skills list",
    "npx skill add pranshugupta54/skills",
  ]) {
    it(`rejects ${JSON.stringify(line)}`, () => assert.equal(matchEgg(line), null));
  }
});

describe("matchEgg: non-eggs", () => {
  for (const line of ["help", "season", "trick"]) {
    it(`ignores ${line}`, () => assert.equal(matchEgg(line), null));
  }
});

describe("hertzReadout", () => {
  it("opens with the toy header", () => {
    const first = hertzReadout().split("\n")[0];
    assert.ok(first.includes("toy"));
  });

  it("has one row per gauge, with exact-width bars and level fill", () => {
    const out = hertzReadout();
    assert.equal(out.split("\n").length, GAUGES.length + 1);
    bars(out).forEach((bar, i) => {
      assert.equal([...bar].length, GAUGE_WIDTH);
      assert.equal([...bar].filter((c) => c === GAUGE_ON).length, GAUGES[i].level);
      assert.equal([...bar].filter((c) => c === GAUGE_OFF).length, GAUGE_WIDTH - GAUGES[i].level);
    });
  });

  it("settled rows end with the gauge word", () => {
    hertzReadout().split("\n").slice(1).forEach((row, i) => {
      assert.ok(row.endsWith(GAUGES[i].word));
    });
  });

  it("contains no digits, settled or settling", () => {
    assert.doesNotMatch(hertzReadout(), /\d/);
    assert.doesNotMatch(hertzReadout([0, 5, 10]), /\d/);
    assert.doesNotMatch(hertzReadout([-3, 99, 2.5]), /\d/);
  });

  it("clamps out-of-range and fractional levels", () => {
    const [neg, big, frac] = bars(hertzReadout([-5, GAUGE_WIDTH + 40, 3.6]));
    assert.equal(neg, GAUGE_OFF.repeat(GAUGE_WIDTH));
    assert.equal(big, GAUGE_ON.repeat(GAUGE_WIDTH));
    assert.equal(frac, GAUGE_ON.repeat(4) + GAUGE_OFF.repeat(GAUGE_WIDTH - 4));
  });

  it("shows … instead of words while settling", () => {
    const out = hertzReadout([1, 2, 3]);
    for (const g of GAUGES) assert.ok(!out.includes(g.word));
    out.split("\n").slice(1).forEach((row) => assert.ok(row.endsWith("…")));
  });

  it("keeps rows the same length while settling", () => {
    for (const levels of [[0, 0, 0], [10, 10, 10], [-1, 4.4, 99]]) {
      const lens = hertzReadout(levels).split("\n").slice(1).map((r) => r.length);
      assert.equal(new Set(lens).size, 1);
    }
  });
});

describe("oneSkillLine", () => {
  it("uses a real slug", () => {
    assert.ok(oneSkillLine("walkthrough-pr").includes("--skill walkthrough-pr"));
  });
  for (const bad of [undefined, "", "../x", "a b", "<script>", "Foo"]) {
    it(`falls back to placeholder for ${JSON.stringify(bad)}`, () => {
      assert.ok(oneSkillLine(bad).includes("--skill <name>"));
    });
  }
});

describe("constants", () => {
  it("install lines", () => {
    assert.equal(HERTZ_INSTALL, "brew install --cask pranshugupta54/tap/hertz");
    assert.equal(SKILLS_INSTALL, "npx skills add pranshugupta54/skills");
  });
});
