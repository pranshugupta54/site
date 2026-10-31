import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GROUP_CAP,
  groupPulls,
  isEmpty,
  MERGED_WINDOW_MS,
  nextLink,
  PULLS_MAX_AGE_MS,
  tooOld,
  type RawPull,
} from "./pulls.ts";

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

describe("groupPulls dedupe", () => {
  const stale = () => pr({ number: 7, title: "stale open", updated_at: iso(now - 2 * DAY) });
  const done = () => merged({ number: 7, title: "merged copy", merged_at: iso(now - DAY) });

  it("puts a PR seen as open and as merged only in merged", () => {
    const out = run([stale(), done()]);
    assert.deepEqual(out.merged.map((p) => p.title), ["merged copy"]);
    assert.equal(out.review.length, 0);
    assert.equal(out.drafting.length, 0);
    assert.equal(out.open, 0);
  });

  it("is independent of order", () => {
    assert.deepEqual(run([done(), stale()]), run([stale(), done()]));
    assert.equal(run([done(), stale()]).open, 0);
  });

  it("ignores a malformed duplicate instead of letting it replace a valid copy", () => {
    const out = run([stale(), merged({ number: 7, title: 42 as unknown as string })]);
    assert.deepEqual(out.review.map((p) => p.title), ["stale open"]);
    assert.equal(out.merged.length, 0);
  });

  it("merged wins even when the open copy is newer", () => {
    const out = run([done(), pr({ number: 7, updated_at: iso(now) })]);
    assert.equal(out.merged.length, 1);
    assert.equal(out.open, 0);
  });

  it("keeps a newer open copy over a closed-unmerged one", () => {
    const closed = pr({ number: 7, state: "closed", merged_at: null, updated_at: iso(now - 3 * DAY) });
    const reopened = pr({ number: 7, title: "reopened", updated_at: iso(now - DAY) });
    for (const raw of [[closed, reopened], [reopened, closed]]) {
      const out = run(raw);
      assert.deepEqual(out.review.map((p) => p.title), ["reopened"]);
      assert.equal(out.open, 1);
    }
  });

  it("keeps the newer of two open copies", () => {
    const older = pr({ number: 7, title: "older", updated_at: iso(now - 3 * DAY) });
    const newer = pr({ number: 7, title: "newer", updated_at: iso(now - DAY) });
    for (const raw of [[older, newer], [newer, older]]) {
      const out = run(raw);
      assert.deepEqual(out.review.map((p) => p.title), ["newer"]);
      assert.equal(out.open, 1);
    }
  });

  it("lets the first occurrence win a tie", () => {
    const at = iso(now - DAY);
    const out = run([pr({ number: 7, title: "first", updated_at: at }), pr({ number: 7, title: "second", updated_at: at })]);
    assert.deepEqual(out.review.map((p) => p.title), ["first"]);
  });

  it("treats a missing updated_at as oldest", () => {
    const out = run([pr({ number: 7, title: "dated" }), pr({ number: 7, title: "undated", updated_at: undefined })]);
    assert.deepEqual(out.review.map((p) => p.title), ["dated"]);
  });
});

describe("nextLink", () => {
  const api = "https://api.github.com/repositories/1/pulls?state=open&per_page=100";

  it("returns the next url from a github-shaped header", () => {
    const header = `<${api}&page=2>; rel="next", <${api}&page=3>; rel="last"`;
    assert.equal(nextLink(header), `${api}&page=2`);
  });

  it("finds next when it is not first", () => {
    const header = `<${api}&page=1>; rel="prev", <${api}&page=3>; rel="next"`;
    assert.equal(nextLink(header), `${api}&page=3`);
  });

  it("returns null without a next rel", () => {
    assert.equal(nextLink(`<${api}&page=1>; rel="prev", <${api}&page=9>; rel="last"`), null);
  });

  it("returns null for null and empty headers", () => {
    assert.equal(nextLink(null), null);
    assert.equal(nextLink(""), null);
  });

  it("refuses off-host and non-https next urls", () => {
    assert.equal(nextLink('<https://evil.example/pulls?page=2>; rel="next"'), null);
    assert.equal(nextLink('<http://api.github.com/repositories/1/pulls?page=2>; rel="next"'), null);
    assert.equal(nextLink('<https://api.github.com.evil.example/pulls?page=2>; rel="next"'), null);
  });

  it("tolerates whitespace around the semicolon", () => {
    assert.equal(nextLink(`<${api}&page=2>   ;   rel="next"`), `${api}&page=2`);
    assert.equal(nextLink(`  <${api}&page=2>;rel="next"  `), `${api}&page=2`);
  });
});

describe("tooOld", () => {
  it("max age is 24h", () => {
    assert.equal(PULLS_MAX_AGE_MS, DAY);
  });

  it("keeps a fresh snapshot", () => {
    assert.equal(tooOld(now, now), false);
    assert.equal(tooOld(now - 3 * 60 * 60 * 1000, now), false);
  });

  it("keeps a snapshot exactly at the limit", () => {
    assert.equal(tooOld(now - PULLS_MAX_AGE_MS, now), false);
  });

  it("hides one ms past the limit", () => {
    assert.equal(tooOld(now - PULLS_MAX_AGE_MS - 1, now), true);
  });

  it("hides a snapshot days old", () => {
    assert.equal(tooOld(now - 3 * DAY, now), true);
  });

  it("hides a missing or invalid stamp", () => {
    for (const bad of [undefined, null, "1700000000000", NaN, Infinity, -Infinity]) {
      assert.equal(tooOld(bad, now), true, String(bad));
    }
  });

  it("keeps a stamp from the future", () => {
    assert.equal(tooOld(now + 5000, now), false);
    assert.equal(tooOld(now + 10 * DAY, now), false);
  });
});
