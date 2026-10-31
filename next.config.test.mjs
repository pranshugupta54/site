import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const configSource = join(root, "next.config.mjs");

const mixed = {
  current: "3",
  renovation: null,
  versions: [
    { version: "3", archive: null },
    { version: "2", archive: "static" },
    { version: "1", archive: "static" },
    { version: "0", archive: null },
  ],
};

const noneArchived = {
  current: "1",
  renovation: null,
  versions: [
    { version: "1", archive: null },
    { version: "0", archive: null },
  ],
};

// Copy the real config next to a fixture versions.json. A fresh query string
// re-evaluates it, because SNAPSHOT_BASE_PATH is read at import time.
async function loadConfig(versions, snapshotBase) {
  const dir = mkdtempSync(join(tmpdir(), "next-config-"));
  const prev = process.env.SNAPSHOT_BASE_PATH;
  if (snapshotBase === undefined) delete process.env.SNAPSHOT_BASE_PATH;
  else process.env.SNAPSHOT_BASE_PATH = snapshotBase;
  try {
    mkdirSync(join(dir, "src/data"), { recursive: true });
    writeFileSync(join(dir, "src/data/versions.json"), JSON.stringify(versions));
    const configPath = join(dir, "next.config.mjs");
    cpSync(configSource, configPath);
    const href = `${pathToFileURL(configPath).href}?t=${randomBytes(8).toString("hex")}`;
    const mod = await import(href);
    return mod.default;
  } finally {
    if (prev === undefined) delete process.env.SNAPSHOT_BASE_PATH;
    else process.env.SNAPSHOT_BASE_PATH = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("next.config redirects and rewrites", () => {
  it("redirects only the current version home", async () => {
    const config = await loadConfig(mixed);
    assert.deepEqual(await config.redirects(), [
      { source: "/v/3", destination: "/", permanent: false },
    ]);
  });

  it("rewrites page paths for static archives only", async () => {
    const config = await loadConfig(mixed);
    assert.deepEqual(await config.rewrites(), {
      afterFiles: [
        { source: "/v/2", destination: "/v/2/index.html" },
        { source: "/v/2/:path*", destination: "/v/2/:path*/index.html" },
        { source: "/v/1", destination: "/v/1/index.html" },
        { source: "/v/1/:path*", destination: "/v/1/:path*/index.html" },
      ],
    });
  });

  it("rewrites nothing when no version is archived", async () => {
    const config = await loadConfig(noneArchived);
    assert.deepEqual(await config.rewrites(), { afterFiles: [] });
  });
});

describe("next.config snapshot export", () => {
  it("exports under SNAPSHOT_BASE_PATH and skips redirects and rewrites", async () => {
    const config = await loadConfig(mixed, "/v/9");
    assert.deepEqual(
      {
        output: config.output,
        basePath: config.basePath,
        trailingSlash: config.trailingSlash,
        unoptimized: config.images?.unoptimized,
        redirects: config.redirects,
        rewrites: config.rewrites,
      },
      {
        output: "export",
        basePath: "/v/9",
        trailingSlash: true,
        unoptimized: true,
        redirects: undefined,
        rewrites: undefined,
      },
    );
  });
});

describe("repo next.config.mjs", () => {
  it("imports against the real versions.json", async () => {
    const prev = process.env.SNAPSHOT_BASE_PATH;
    delete process.env.SNAPSHOT_BASE_PATH;
    try {
      const versions = JSON.parse(readFileSync(join(root, "src/data/versions.json"), "utf8"));
      const href = `${pathToFileURL(configSource).href}?real=${randomBytes(8).toString("hex")}`;
      const mod = await import(href);
      assert.deepEqual(await mod.default.redirects(), [
        { source: `/v/${versions.current}`, destination: "/", permanent: false },
      ]);
    } finally {
      if (prev === undefined) delete process.env.SNAPSHOT_BASE_PATH;
      else process.env.SNAPSHOT_BASE_PATH = prev;
    }
  });
});
