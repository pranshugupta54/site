// Hidden footer-shell eggs: real install lines for pranshu's tools. Not listed in `help`.
// No imports, so `node --test` can load it as-is.

export const HERTZ_REPO = "github.com/pranshugupta54/hertz";
export const HERTZ_INSTALL = "brew install --cask pranshugupta54/tap/hertz";
export const SKILLS_REPO = "pranshugupta54/skills";
export const SKILLS_INSTALL = `npx skills add ${SKILLS_REPO}`;

export type Egg = "hertz" | "skills" | "skills-bare";

const HERTZ_TARGETS = ["hertz", "pranshugupta54/tap/hertz"];

/** The egg a typed line asks for, or null so it falls through to "command not found". */
export function matchEgg(line: string): Egg | null {
  const [cmd, sub, ...rest] = line.trim().toLowerCase().split(/\s+/);
  if (cmd === "brew" && sub === "install") {
    // `--cask` is optional and may sit on either side, like real brew
    const targets = rest.filter((a) => a !== "--cask");
    const casks = rest.length - targets.length;
    return casks <= 1 && targets.length === 1 && HERTZ_TARGETS.includes(targets[0]) ? "hertz" : null;
  }
  if (cmd === "npx" && sub === "skills" && rest[0] === "add") {
    if (rest.length === 1) return "skills-bare";
    if (rest.length === 2 && rest[1] === SKILLS_REPO) return "skills";
  }
  return null;
}

// ── hertz, tofu build: toy gauges. words, never numbers — nothing here is measured ──

export const GAUGES: { label: string; level: number; word: string }[] = [
  { label: "carrots", level: 7, word: "plenty" },
  { label: "naps", level: 10, word: "overbooked" },
  { label: "ear angle", level: 4, word: "jaunty" },
];
export const GAUGE_WIDTH = 10;
// both glyphs are in the fonts' latin subset, so the bars stay true monospace
export const GAUGE_ON = "=";
export const GAUGE_OFF = "·";

/** The toy readout. `levels` overrides each bar while it settles; words show once settled. */
export function hertzReadout(levels?: number[]): string {
  const rows = GAUGES.map((g, i) => {
    const n = Math.max(0, Math.min(GAUGE_WIDTH, Math.round(levels?.[i] ?? g.level)));
    const bar = GAUGE_ON.repeat(n) + GAUGE_OFF.repeat(GAUGE_WIDTH - n);
    return `  ${g.label.padEnd(10)} ${bar}  ${levels ? "…" : g.word}`;
  });
  return ["tofu's build · toy gauges, nothing measured", ...rows].join("\n");
}

/**
 * Owns an egg's async leftovers (the gauge timer, a pending fetch) so a rerun, `clear`
 * or unmount can cut them off. One run at a time.
 */
export function eggRunner() {
  let gen = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let settle: (() => void) | undefined;

  /** Stops the gauge (snapping it to its end state if `settleIt`) and voids every pending `guard`. */
  const cancel = (settleIt = false) => {
    gen++;
    clearInterval(timer);
    timer = undefined;
    const done = settle;
    settle = undefined;
    if (settleIt) done?.();
  };

  return {
    cancel,
    /** Settles whatever ran before, then `tick(i)` for i = 1…ticks-1 every `ms`, then `done()`. */
    animate(ticks: number, ms: number, tick: (i: number) => void, done: () => void) {
      cancel(true);
      settle = done;
      let i = 0;
      timer = setInterval(() => {
        if (++i < ticks) return tick(i);
        clearInterval(timer);
        timer = undefined;
        settle = undefined;
        done();
      }, ms);
    },
    /** Wraps a callback so it's dropped if anything cancels before it runs. */
    guard<A extends unknown[]>(fn: (...args: A) => void) {
      const mine = gen;
      return (...args: A) => {
        if (mine === gen) fn(...args);
      };
    },
  };
}

/** One-skill install hint. Only a plausible skill dir name makes it in; otherwise a usage placeholder. */
export function oneSkillLine(name?: string): string {
  const skill = name && /^[a-z0-9-]+$/.test(name) ? name : "<name>";
  return `  just one: --skill ${skill}`;
}
