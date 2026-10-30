import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { withDeadline } from "./deadline.ts";

describe("withDeadline", () => {
  it("resolves with the value when work wins", async () => {
    assert.equal(await withDeadline(Promise.resolve("ok"), 1000), "ok");
  });

  it("resolves null when the timer wins", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const never = new Promise<string>(() => {});
    const result = withDeadline(never, 50);
    t.mock.timers.tick(50);
    assert.equal(await result, null);
  });

  it("rejects when work rejects first", async () => {
    await assert.rejects(withDeadline(Promise.reject(new Error("boom")), 1000), /boom/);
  });

  it("leaves no pending timer after work wins", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const clear = mock.fn(globalThis.clearTimeout);
    t.mock.method(globalThis, "clearTimeout", clear);
    await withDeadline(Promise.resolve(1), 1000);
    assert.equal(clear.mock.callCount(), 1);
    // ticking past the deadline must not fire anything
    t.mock.timers.tick(5000);
  });

  it("leaves no pending timer after work rejects", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const clear = mock.fn(globalThis.clearTimeout);
    t.mock.method(globalThis, "clearTimeout", clear);
    await assert.rejects(withDeadline(Promise.reject(new Error("x")), 1000));
    assert.equal(clear.mock.callCount(), 1);
  });
});
