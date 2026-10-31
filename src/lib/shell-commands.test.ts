import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEASONS } from "../data/seasons.ts";
import { SHELL_COMMANDS, SHORTCUTS, helpText, shellCommands } from "./shell-commands.ts";

const BASE_HELP = `commands:
  about · projects · writing · gh
  resume     cv · --pdf to save one
  snake      play snake on my commits
  theme      toggle light / dark
  skin       cycle editorial → mono → serif
  funfact    a fun fact
  season     what's on, or season <name|off|auto>
  versions   this site's past lives
  goto <x>   github · x · email
  clock · clear · cowsay <msg> · sudo`;

describe("help text", () => {
  it("matches the pre-refactor output with no season", () => {
    assert.equal(helpText(shellCommands(null)), BASE_HELP);
    assert.equal(helpText(shellCommands(undefined)), BASE_HELP);
  });

  for (const season of SEASONS.filter((s) => Object.keys(s.commands ?? {}).length)) {
    it(`adds the ${season.id} row`, () => {
      const eggs = Object.keys(season.commands!).join(" · ");
      assert.equal(helpText(shellCommands(season)), `${BASE_HELP}\n  ${eggs}   it's ${season.name}`);
    });
  }

  it("covers the real seasons", () => {
    const keys = (id: string) => Object.keys(SEASONS.find((s) => s.id === id)!.commands!).join(" · ");
    assert.equal(keys("halloween"), "trick · treat");
    assert.equal(keys("diwali"), "diya · mithai");
  });
});

describe("shellCommands", () => {
  it("returns SHELL_COMMANDS itself without egg commands", () => {
    assert.equal(shellCommands(), SHELL_COMMANDS);
    assert.equal(shellCommands(null), SHELL_COMMANDS);
    assert.equal(shellCommands({ name: "x" }), SHELL_COMMANDS);
    assert.equal(shellCommands({ name: "x", commands: {} }), SHELL_COMMANDS);
  });

  it("appends one row for egg commands without mutating the base list", () => {
    const before = SHELL_COMMANDS.length;
    const rows = shellCommands({ name: "spring", commands: { a: "1", b: "2" } });
    assert.notEqual(rows, SHELL_COMMANDS);
    assert.equal(rows.length, before + 1);
    assert.deepEqual(rows.at(-1), { usage: "a · b", desc: "it's spring" });
    assert.equal(SHELL_COMMANDS.length, before);
  });
});

describe("helpText formatting", () => {
  it("starts with commands:", () => {
    assert.equal(helpText([]).split("\n")[0], "commands:");
  });
  it("pads usage under 10 chars to a 10-wide column plus one space", () => {
    assert.equal(helpText([{ usage: "snake", desc: "d" }]).split("\n")[1], "  snake      d");
    assert.equal(helpText([{ usage: "ninechars", desc: "d" }]).split("\n")[1], "  ninechars  d");
  });
  it("uses exactly 3 spaces for usage of 10+ chars", () => {
    assert.equal(helpText([{ usage: "tenletters", desc: "d" }]).split("\n")[1], "  tenletters   d");
    assert.equal(helpText([{ usage: "a much longer one", desc: "d" }]).split("\n")[1], "  a much longer one   d");
  });
  it("prints no-desc rows as indent + usage", () => {
    assert.equal(helpText([{ usage: "a · b" }]).split("\n")[1], "  a · b");
  });
});

describe("hidden eggs", () => {
  const leak = /brew|npx|hertz|skills/i;
  it("never appear in the command lists", () => {
    const lists = [SHELL_COMMANDS, ...SEASONS.map((s) => shellCommands(s))];
    for (const rows of lists) for (const r of rows) assert.doesNotMatch(r.usage, leak);
  });
});

describe("SHORTCUTS", () => {
  const allKeys = SHORTCUTS.flatMap((s) => s.keys);
  it("includes the core keys", () => {
    for (const k of ["/", "?", "esc", "a–z"]) {
      assert.ok(allKeys.some((key) => key.includes(k)), `missing ${k}`);
    }
  });
  it("has a desc and at least one non-empty key per row", () => {
    for (const s of SHORTCUTS) {
      assert.ok(s.desc.trim());
      assert.ok(s.keys.length > 0 && s.keys.every((k) => k.trim()));
    }
  });
  it("has unique descs", () => {
    const descs = SHORTCUTS.map((s) => s.desc);
    assert.equal(new Set(descs).size, descs.length);
  });
  it("is all lowercase", () => {
    for (const s of SHORTCUTS) {
      assert.doesNotMatch(s.desc, /[A-Z]/);
      for (const k of s.keys) assert.doesNotMatch(k, /[A-Z]/);
    }
  });
});

describe("SHELL_COMMANDS", () => {
  it("has unique usages", () => {
    const usages = SHELL_COMMANDS.map((r) => r.usage);
    assert.equal(new Set(usages).size, usages.length);
  });
});
