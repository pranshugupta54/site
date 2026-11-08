import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toOwnRepo } from "./repos.ts";

const row = {
  name: "hertz",
  fork: false,
  private: false,
  description: "a tiny menu-bar system monitor",
  html_url: "https://github.com/pranshugupta54/hertz",
  homepage: "",
  language: "Swift",
  stargazers_count: 3,
  topics: ["macos", 7],
  created_at: "2026-05-01T00:00:00Z",
  pushed_at: "2026-06-08T00:00:00Z",
};

describe("toOwnRepo", () => {
  it("maps his own public repo", () => {
    assert.deepEqual(toOwnRepo(row), {
      name: "hertz",
      description: "a tiny menu-bar system monitor",
      url: "https://github.com/pranshugupta54/hertz",
      homepage: null,
      language: "Swift",
      stars: 3,
      topics: ["macos"],
      createdAt: "2026-05-01T00:00:00Z",
      pushedAt: "2026-06-08T00:00:00Z",
    });
  });

  it("never lets a fork through — forks aren't his work", () => {
    assert.equal(toOwnRepo({ ...row, fork: true }), null);
    assert.equal(toOwnRepo({ ...row, fork: undefined }), null);
  });

  it("skips private rows and anything naming his employer", () => {
    assert.equal(toOwnRepo({ ...row, private: true }), null);
    assert.equal(toOwnRepo({ ...row, name: "traycer-notes" }), null);
    assert.equal(toOwnRepo({ ...row, description: "work stuff for Traycer" }), null);
  });

  it("keeps only https homepages", () => {
    assert.equal(toOwnRepo({ ...row, homepage: "https://p54.dev" })?.homepage, "https://p54.dev");
    assert.equal(toOwnRepo({ ...row, homepage: "javascript:alert(1)" })?.homepage, null);
    assert.equal(toOwnRepo({ ...row, homepage: "http://p54.dev" })?.homepage, null);
  });

  it("drops malformed rows", () => {
    assert.equal(toOwnRepo({ ...row, name: "" }), null);
    assert.equal(toOwnRepo({ ...row, html_url: 42 }), null);
  });
});
