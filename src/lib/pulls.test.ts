import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GROUP_CAP, groupPulls, isEmpty, MERGED_WINDOW_MS, type RawPull } from "./pulls.ts";

const repo = "pranshugupta54/site";
const owner = "pranshugupta54";
const now = Date.parse("2026-10-30T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
// an open, non-draft PR by the owner unless overridden
const pr = (over: RawPull = {}): RawPull => ({
  number: ++seq,
  title: `change ${seq}`,
  state: "open",
  draft: false,
  updated_at: iso(now - DAY),
  user: { login: owner },
  ...over,
});
const merged = (over: RawPull = {}) => pr({ state: "closed", merged_at: iso(now - DAY), ...over });
const run = (raw: RawPull[]) => groupPulls(raw, { repo, owner, now });

describe("groupPulls state", () => {
  it("splits open PRs into drafting and in review", () => {
    const out = run([pr({ number: 1, draft: true }), pr({ number: 2 })]);
    assert.deepEqual(out.drafting.map((p) => [p.number, p.state]), [[1, "drafting"]]);
    assert.deepEqual(out.review.map((p) => [p.number, p.state]), [[2, "in review"]]);
    assert.equal(out.open, 2);
  });

  it("keeps PRs merged inside the window", () => {
    const out = run([merged({ number: 1 }), merged({ number: 2, merged_at: iso(now - MERGED_WINDOW_MS) })]);
    assert.deepEqual(out.merged.map((p) => p.state), ["merged", "merged"]);
    assert.equal(out.open, 0);
  });

  it("drops closed-unmerged, stale-merged and future-merged PRs", () => {
    const out = run([
      pr({ state: "closed", merged_at: null }),
      pr({ state: "closed" }),
      merged({ merged_at: iso(now - MERGED_WINDOW_MS - 1) }),
      merged({ merged_at: iso(now + 1000) }),
      merged({ merged_at: "garbage" }),
    ]);
    assert.ok(isEmpty(out));
  });
});

describe("groupPulls filtering", () => {
  it("drops PRs from anyone but the owner", () => {
    const out = run([
      pr({ user: { login: "stranger" } }),
      pr({ user: null }),
      pr({ user: undefined }),
      merged({ user: { login: "stranger" } }),
    ]);
    assert.ok(isEmpty(out));
    assert.equal(out.open, 0);
  });

  it("drops titles mentioning traycer in any case and excludes them from open", () => {
    const out = run([
      pr({ title: "Traycer" }),
      pr({ title: "TRAYCER", draft: true }),
      pr({ title: "shipped via traycer bot" }),
      merged({ title: "tRaYcEr thing" }),
      pr({ number: 99, title: "keep me" }),
    ]);
    assert.deepEqual(out.review.map((p) => p.number), [99]);
    assert.equal(out.drafting.length, 0);
    assert.equal(out.merged.length, 0);
    assert.equal(out.open, 1);
  });

  it("trims titles and skips empty or malformed rows", () => {
    const out = run([
      pr({ number: 1, title: "  padded  " }),
      pr({ title: "   " }),
      pr({ title: "" }),
      pr({ number: "7" as unknown as number }),
      pr({ number: undefined }),
      pr({ title: 42 as unknown as string }),
      pr({ title: undefined }),
    ]);
    assert.deepEqual(out.review.map((p) => p.title), ["padded"]);
    assert.equal(out.open, 1);
  });
});

describe("groupPulls output", () => {
  it("builds the url from the repo, never from the api", () => {
    const out = run([pr({ number: 12, html_url: "https://evil.example/x", url: "https://evil.example/y" } as RawPull)]);
    assert.equal(out.review[0].url, "https://github.com/pranshugupta54/site/pull/12");
  });

  it("carries exactly number, title, url and state", () => {
    const out = run([
      pr({ number: 1, body: "secret", merged_at: iso(now) } as RawPull),
      pr({ number: 2, draft: true }),
      merged({ number: 3 }),
    ]);
    for (const p of [...out.review, ...out.drafting, ...out.merged]) {
      assert.deepEqual(Object.keys(p).sort(), ["number", "state", "title", "url"]);
    }
  });
});

describe("groupPulls ordering", () => {
  it("sorts open groups by updated_at desc", () => {
    const out = run([
      pr({ number: 1, updated_at: iso(now - 3 * DAY) }),
      pr({ number: 2, updated_at: iso(now - 1 * DAY) }),
      pr({ number: 3, updated_at: iso(now - 2 * DAY) }),
      pr({ number: 4, draft: true, updated_at: iso(now - 5 * DAY) }),
      pr({ number: 5, draft: true, updated_at: iso(now - 4 * DAY) }),
    ]);
    assert.deepEqual(out.review.map((p) => p.number), [2, 3, 1]);
    assert.deepEqual(out.drafting.map((p) => p.number), [5, 4]);
  });

  it("sorts merged by merged_at desc, ignoring updated_at", () => {
    const out = run([
      merged({ number: 1, merged_at: iso(now - 3 * DAY), updated_at: iso(now) }),
      merged({ number: 2, merged_at: iso(now - 1 * DAY), updated_at: iso(now - 9 * DAY) }),
      merged({ number: 3, merged_at: iso(now - 2 * DAY) }),
    ]);
    assert.deepEqual(out.merged.map((p) => p.number), [2, 3, 1]);
  });

  it("breaks ties by number desc", () => {
    const same = iso(now - DAY);
    const out = run([
      pr({ number: 3, updated_at: same }),
      pr({ number: 9, updated_at: same }),
      pr({ number: 5, updated_at: same }),
      merged({ number: 1, merged_at: same }),
      merged({ number: 8, merged_at: same }),
    ]);
    assert.deepEqual(out.review.map((p) => p.number), [9, 5, 3]);
    assert.deepEqual(out.merged.map((p) => p.number), [8, 1]);
  });

  it("sorts open PRs with a missing updated_at last", () => {
    const out = run([pr({ number: 1, updated_at: undefined }), pr({ number: 2 })]);
    assert.deepEqual(out.review.map((p) => p.number), [2, 1]);
  });
});

describe("groupPulls cap", () => {
  it("caps each group but counts open before the cap", () => {
    const raw = [
      ...Array.from({ length: 8 }, (_, i) => pr({ number: 100 + i, updated_at: iso(now - (i + 1) * 1000) })),
      ...Array.from({ length: 7 }, (_, i) => pr({ number: 200 + i, draft: true })),
      ...Array.from({ length: 9 }, (_, i) => merged({ number: 300 + i })),
    ];
    const out = run(raw);
    assert.equal(GROUP_CAP, 5);
    assert.equal(out.review.length, GROUP_CAP);
    assert.equal(out.drafting.length, GROUP_CAP);
    assert.equal(out.merged.length, GROUP_CAP);
    assert.equal(out.open, 15);
    // the newest survive the cut
    assert.deepEqual(out.review.map((p) => p.number), [100, 101, 102, 103, 104]);
  });
});

describe("isEmpty", () => {
  it("is true for no pulls", () => {
    assert.equal(isEmpty(run([])), true);
  });

  it("is false when any single group has a pull", () => {
    assert.equal(isEmpty(run([pr({ draft: true })])), false);
    assert.equal(isEmpty(run([pr()])), false);
    assert.equal(isEmpty(run([merged()])), false);
  });

  it("only looks at the three groups", () => {
    assert.equal(isEmpty({ drafting: [], review: [], merged: [], open: 0 }), true);
  });
});
