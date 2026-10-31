import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOARD_SNAKE, SHELL_OPEN, closesKeymap, opensKeymap, type DocLike, type KeyLike } from "./keymap.ts";

const ev = (o: Partial<KeyLike> = {}): KeyLike => ({
  key: "?",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  isComposing: false,
  ...o,
});

function doc({ active = null, present = [] }: { active?: DocLike["activeElement"]; present?: string[] } = {}): DocLike {
  return { activeElement: active, querySelector: (sel) => (present.includes(sel) ? {} : null) };
}

describe("opensKeymap", () => {
  it("opens on a plain ? with no, body or button focus", () => {
    assert.equal(opensKeymap(ev(), doc()), true);
    assert.equal(opensKeymap(ev(), doc({ active: { tagName: "BODY" } })), true);
    assert.equal(opensKeymap(ev(), doc({ active: { tagName: "BUTTON" } })), true);
  });

  it("is blocked by text fields", () => {
    for (const active of [
      { tagName: "INPUT" },
      { tagName: "TEXTAREA" },
      { tagName: "SELECT" },
      { tagName: "DIV", isContentEditable: true },
    ]) {
      assert.equal(opensKeymap(ev(), doc({ active })), false, active.tagName);
    }
  });

  it("is blocked by modifiers, repeat and composition", () => {
    for (const o of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }]) {
      assert.equal(opensKeymap(ev(o), doc()), false, JSON.stringify(o));
    }
  });

  it("ignores other keys", () => {
    for (const key of ["/", "a", "Escape"]) assert.equal(opensKeymap(ev({ key }), doc()), false, key);
  });

  it("is blocked while a heatmap snake game is present, whatever has focus", () => {
    const present = [BOARD_SNAKE];
    assert.equal(opensKeymap(ev(), doc({ present })), false);
    assert.equal(opensKeymap(ev(), doc({ present, active: { tagName: "BODY" } })), false);
    assert.equal(opensKeymap(ev(), doc({ present, active: { tagName: "BUTTON" } })), false);
  });

  it("targets both snake game labels", () => {
    assert.ok(BOARD_SNAKE.includes('[aria-label="Snake game"]'));
    assert.ok(BOARD_SNAKE.includes('[aria-label="Quit snake and return to the heatmap"]'));
  });

  it("is blocked while the shell is open", () => {
    assert.equal(opensKeymap(ev(), doc({ present: [SHELL_OPEN] })), false);
  });

  it("targets only the open shell panel", () => {
    assert.ok(SHELL_OPEN.includes('[aria-label="Terminal shell"]'));
    assert.ok(SHELL_OPEN.includes('[data-open="true"]'));
  });

  it("still opens when only a closed shell is on the page", () => {
    const closedShell = '[aria-label="Terminal shell"]';
    assert.notEqual(closedShell, SHELL_OPEN);
    assert.equal(opensKeymap(ev(), doc({ present: [closedShell] })), true);
  });
});

describe("closesKeymap", () => {
  it("closes on Escape, even repeating", () => {
    assert.equal(closesKeymap(ev({ key: "Escape" })), true);
    assert.equal(closesKeymap(ev({ key: "Escape", repeat: true })), true);
  });
  it("closes on a plain ?", () => assert.equal(closesKeymap(ev()), true));
  it("does not close on a held ?", () => assert.equal(closesKeymap(ev({ repeat: true })), false));
  it("does not close on modified ?", () => {
    for (const o of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      assert.equal(closesKeymap(ev(o)), false, JSON.stringify(o));
    }
  });
  it("does not close on other keys", () => {
    for (const key of ["Tab", "a", "/"]) assert.equal(closesKeymap(ev({ key })), false, key);
  });
});
