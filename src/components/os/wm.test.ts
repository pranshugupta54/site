import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCK_SPACE, activeWin, appOf, clampRect, parseWm, winId, wmReducer, type WmState } from "./wm.ts";

const desk = { w: 1440, h: 872 };
const empty: WmState = { wins: [], order: [] };
const open = (s: WmState, kind: Parameters<typeof winId>[0], arg?: string) => wmReducer(s, { t: "open", kind, arg, desk });

describe("wmReducer", () => {
  it("opens one window per app, and a second open just raises it", () => {
    let s = open(open(empty, "about"), "projects");
    assert.deepEqual(s.order, ["about", "projects"]);
    s = open(s, "about");
    assert.equal(s.wins.length, 2);
    assert.deepEqual(s.order, ["projects", "about"]);
  });

  it("gives each project its own window, cascaded off the projects window", () => {
    let s = open(empty, "projects");
    s = wmReducer(s, { t: "open", kind: "project", arg: "hertz", desk, near: "projects" });
    const p = s.wins.find((w) => w.id === "projects")!;
    const h = s.wins.find((w) => w.id === "project:hertz")!;
    assert.equal(h.kind, "project");
    assert.ok(h.x > p.x && h.y > p.y);
  });

  it("opening a minimized window restores it", () => {
    let s = wmReducer(open(empty, "notes"), { t: "min", id: "notes" });
    assert.equal(activeWin(s), null);
    s = open(s, "notes");
    assert.equal(activeWin(s)?.id, "notes");
  });

  it("the active window is the topmost one that isn't minimized", () => {
    let s = open(open(empty, "about"), "terminal");
    s = wmReducer(s, { t: "min", id: "terminal" });
    assert.equal(activeWin(s)?.id, "about");
  });

  it("zoom fills the desk above the dock and toggles back to where it was", () => {
    let s = open(empty, "reading");
    const before = s.wins[0];
    s = wmReducer(s, { t: "zoom", id: "reading", desk });
    assert.deepEqual([s.wins[0].x, s.wins[0].y, s.wins[0].w, s.wins[0].h], [0, 0, desk.w, desk.h - DOCK_SPACE + 8]);
    s = wmReducer(s, { t: "zoom", id: "reading", desk });
    assert.deepEqual([s.wins[0].x, s.wins[0].y, s.wins[0].w, s.wins[0].h], [before.x, before.y, before.w, before.h]);
    assert.equal(s.wins[0].max, false);
  });

  it("closing drops the window from both lists", () => {
    const s = wmReducer(open(open(empty, "about"), "tofu"), { t: "close", id: "about" });
    assert.deepEqual(s.wins.map((w) => w.id), ["tofu"]);
    assert.deepEqual(s.order, ["tofu"]);
  });

  it("fits windows into a smaller browser", () => {
    let s = wmReducer(open(empty, "notes"), { t: "rect", id: "notes", rect: { x: 1300, y: 800 } });
    s = wmReducer(s, { t: "fit", desk: { w: 900, h: 600 } });
    const w = s.wins[0];
    assert.ok(w.x <= 900 - 80 && w.y <= 600 - 40);
  });
});

describe("clampRect", () => {
  it("keeps the title bar on the desk and part of the window in view", () => {
    assert.deepEqual(clampRect({ x: -2000, y: -50, w: 400, h: 300 }, desk), { x: 80 - 400, y: 0, w: 400, h: 300 });
    assert.deepEqual(clampRect({ x: 5000, y: 5000, w: 400, h: 300 }, desk), { x: desk.w - 80, y: desk.h - 40, w: 400, h: 300 });
  });
});

describe("parseWm", () => {
  it("round-trips a state", () => {
    const s = wmReducer(open(open(empty, "about"), "projects"), { t: "open", kind: "project", arg: "site", desk, near: "projects" });
    const back = parseWm(JSON.stringify(s), desk);
    assert.deepEqual(back?.order, s.order);
    assert.deepEqual(back?.wins.map((w) => w.id), s.wins.map((w) => w.id));
  });

  it("drops junk: unknown kinds, ids that don't match, duplicates, bad numbers", () => {
    const raw = JSON.stringify({
      wins: [
        { id: "about", kind: "about", x: 1, y: 1, w: 400, h: 500 },
        { id: "about", kind: "about", x: 1, y: 1, w: 400, h: 500 },
        { id: "evil", kind: "evil", x: 1, y: 1, w: 1, h: 1 },
        { id: "notes", kind: "terminal", x: 1, y: 1, w: 400, h: 400 },
        { id: "project:", kind: "project", x: 1, y: 1, w: 400, h: 400 },
        { id: "tofu", kind: "tofu", x: "1", y: 1, w: 400, h: 400 },
      ],
      order: ["evil", "about", 7],
    });
    const s = parseWm(raw, desk);
    assert.deepEqual(s?.wins.map((w) => w.id), ["about"]);
    assert.deepEqual(s?.order, ["about"]);
  });

  it("returns null for missing or broken storage", () => {
    assert.equal(parseWm(null, desk), null);
    assert.equal(parseWm("{nope", desk), null);
    assert.equal(parseWm('{"wins":1}', desk), null);
  });
});

it("appOf files project windows under projects", () => {
  assert.equal(appOf("project"), "projects");
  assert.equal(appOf("tofu"), "tofu");
});
