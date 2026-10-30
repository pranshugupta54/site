import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import {
  GAUGES,
  GAUGE_OFF,
  GAUGE_ON,
  GAUGE_WIDTH,
  HERTZ_INSTALL,
  SKILLS_INSTALL,
  eggRunner,
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

describe("eggRunner", () => {
  afterEach(() => mock.timers.reset());

  function run(runner: ReturnType<typeof eggRunner>) {
    const ticks: number[] = [];
    let dones = 0;
    runner.animate(10, 80, (i) => ticks.push(i), () => dones++);
    return { ticks, done: () => dones };
  }

  it("runs a full animation, finishing at exactly 800ms", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const a = run(eggRunner());
    mock.timers.tick(720);
    assert.deepEqual(a.ticks, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.equal(a.done(), 0);
    mock.timers.tick(80);
    assert.equal(a.done(), 1);
    mock.timers.tick(2000);
    assert.equal(a.ticks.length, 9);
    assert.equal(a.done(), 1);
  });

  it("cancel() mid-run stops ticks and never calls done", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const runner = eggRunner();
    const a = run(runner);
    mock.timers.tick(400);
    assert.equal(a.ticks.length, 5);
    runner.cancel();
    mock.timers.tick(2000);
    assert.equal(a.ticks.length, 5);
    assert.equal(a.done(), 0);
  });

  it("a rerun settles the previous run once and leaves one timer", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const runner = eggRunner();
    const a = run(runner);
    mock.timers.tick(240);
    assert.equal(a.ticks.length, 3);
    const b = run(runner);
    assert.equal(a.done(), 1);
    mock.timers.tick(2000);
    assert.equal(a.ticks.length, 3);
    assert.equal(a.done(), 1);
    assert.equal(b.ticks.length, 9);
    assert.equal(b.done(), 1);
  });

  it("cancel(true) with nothing running is a no-op", () => {
    mock.timers.enable({ apis: ["setInterval"] });
    const runner = eggRunner();
    assert.doesNotThrow(() => runner.cancel(true));
    const a = run(runner);
    mock.timers.tick(800);
    runner.cancel(true);
    assert.equal(a.done(), 1);
  });

  describe("guard", () => {
    function deferred<T>() {
      let resolve!: (v: T) => void;
      const p = new Promise<T>((r) => (resolve = r));
      return { p, resolve };
    }

    it("drops a callback if cancelled before it runs", async () => {
      const runner = eggRunner();
      const d = deferred<string[]>();
      const calls: string[][] = [];
      d.p.then(runner.guard((v: string[]) => calls.push(v)));
      runner.cancel();
      d.resolve(["walkthrough-pr"]);
      await d.p;
      await Promise.resolve();
      assert.equal(calls.length, 0);
    });

    it("runs the callback once when nothing cancels", async () => {
      const runner = eggRunner();
      const d = deferred<string[]>();
      const calls: string[][] = [];
      d.p.then(runner.guard((v: string[]) => calls.push(v)));
      d.resolve(["walkthrough-pr"]);
      await d.p;
      await Promise.resolve();
      assert.deepEqual(calls, [["walkthrough-pr"]]);
    });

    it("a guard created after a cancel still fires", async () => {
      const runner = eggRunner();
      runner.cancel();
      const calls: number[] = [];
      runner.guard((n: number) => calls.push(n))(1);
      assert.deepEqual(calls, [1]);
    });

    it("a guard created before animate() is voided", () => {
      mock.timers.enable({ apis: ["setInterval"] });
      const runner = eggRunner();
      const calls: number[] = [];
      const g = runner.guard((n: number) => calls.push(n));
      run(runner);
      g(1);
      assert.equal(calls.length, 0);
    });

    it("is not voided by another runner's cancel", () => {
      const a = eggRunner();
      const b = eggRunner();
      const calls: number[] = [];
      const g = a.guard((n: number) => calls.push(n));
      b.cancel(true);
      g(1);
      assert.deepEqual(calls, [1]);
    });
  });
});
