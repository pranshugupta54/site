import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TABS, homeKey, pickRepos, twelveHour } from "./tty.ts";

const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  ...mods,
});
const idle = { snakeOn: false, typingElsewhere: false, promptFocused: false, promptEmpty: true };

describe("TABS", () => {
  it("numbers 1–7 in order, home first", () => {
    assert.deepEqual(TABS.map((t) => t.key), ["1", "2", "3", "4", "5", "6", "7"]);
    assert.equal(TABS[0].href, "/");
    assert.deepEqual(TABS.map((t) => t.label), ["~", "projects", "log", "notes", "os", "room", "tofu"]);
  });
});

describe("homeKey", () => {
  it("switches tabs on 1–7 while the prompt is empty", () => {
    assert.deepEqual(homeKey(key("3"), idle), { kind: "tab", href: "/log" });
    assert.deepEqual(homeKey(key("2"), idle), { kind: "tab", href: "/#projects" });
  });
  it("types digits instead once something is typed", () => {
    assert.deepEqual(homeKey(key("3"), { ...idle, promptEmpty: false }), { kind: "type", text: "3" });
  });
  it("8, 9 and 0 just type", () => {
    assert.deepEqual(homeKey(key("9"), idle), { kind: "type", text: "9" });
  });
  it("slash focuses, letters type", () => {
    assert.deepEqual(homeKey(key("/"), idle), { kind: "focus" });
    assert.deepEqual(homeKey(key("h"), idle), { kind: "type", text: "h" });
  });
  it("leaves ?, space, named and modified keys alone", () => {
    for (const k of ["?", " ", "Enter", "ArrowDown", "Tab", "Escape"]) assert.equal(homeKey(key(k), idle), null, k);
    assert.equal(homeKey(key("k", { metaKey: true }), idle), null);
    assert.equal(homeKey(key("1", { ctrlKey: true }), idle), null);
    assert.equal(homeKey(key("a", { isComposing: true }), idle), null);
  });
  it("stays out of the way of the snake, other fields and the focused prompt", () => {
    assert.equal(homeKey(key("a"), { ...idle, snakeOn: true }), null);
    assert.equal(homeKey(key("1"), { ...idle, typingElsewhere: true }), null);
    assert.equal(homeKey(key("a"), { ...idle, promptFocused: true }), null);
  });
});

describe("twelveHour", () => {
  it("formats the visitor's clock", () => {
    assert.equal(twelveHour(new Date(2026, 10, 10, 0, 5)), "12:05 am");
    assert.equal(twelveHour(new Date(2026, 10, 10, 12, 0)), "12:00 pm");
    assert.equal(twelveHour(new Date(2026, 10, 10, 21, 30)), "9:30 pm");
  });
});

describe("pickRepos", () => {
  const r = (name: string, stars: number, pushedAt: string) => ({ name, stars, pushedAt });
  it("skips named repos (any case), sorts by stars then recency, caps", () => {
    const got = pickRepos(
      [r("hertz", 50, "2026-10-01"), r("a", 2, "2026-01-01"), r("b", 2, "2026-09-01"), r("c", 9, "2025-01-01"), r("Site", 99, "2026-11-01")],
      ["Hertz", "site"],
      2
    );
    assert.deepEqual(got.map((x) => x.name), ["c", "b"]);
  });
});
