import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SNAPSHOT_CONFIG, banner, injectBanner, rebaseLinks } from "./snapshot-version.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts/snapshot-version.mjs");
const versionsPath = join(root, "src/data/versions.json");
const base = "/v/9";

function shQuote(value) {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

// Stand-ins ahead of PATH, so a guard regression cannot run the real git or npm.
function fakeBin() {
  const dir = mkdtempSync(join(tmpdir(), "snapshot-bin-"));
  const marker = join(dir, "called");
  const body = `#!/bin/sh\nprintf '%s\\n' "$0 $*" >> ${shQuote(marker)}\nexit 99\n`;
  for (const name of ["git", "npm", "gh"]) {
    writeFileSync(join(dir, name), body, { mode: 0o755 });
  }
  return { dir, marker };
}

function quietEnv(dir) {
  const env = { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}` };
  delete env.NO_COLOR;
  delete env.FORCE_COLOR;
  return env;
}

function runCli(args) {
  const bin = fakeBin();
  const before = readFileSync(versionsPath);
  const archive = join(root, "public/v");
  const hadArchive = existsSync(archive);
  try {
    const result = spawnSync(process.execPath, [script, ...args], {
      encoding: "utf8",
      cwd: root,
      timeout: 8000,
      env: quietEnv(bin.dir),
    });
    return {
      result,
      called: existsSync(bin.marker),
      mutated: !readFileSync(versionsPath).equals(before),
      archiveCreated: !hadArchive && existsSync(archive),
    };
  } finally {
    if (!readFileSync(versionsPath).equals(before)) writeFileSync(versionsPath, before);
    if (!hadArchive && existsSync(archive)) rmSync(archive, { recursive: true, force: true });
    rmSync(bin.dir, { recursive: true, force: true });
  }
}

describe("importing snapshot-version", () => {
  it("does not run git or npm and prints nothing", () => {
    const bin = fakeBin();
    const dir = mkdtempSync(join(tmpdir(), "snapshot-import-"));
    const loader = join(dir, "load.mjs");
    writeFileSync(loader, `import ${JSON.stringify(pathToFileURL(script).href)};\n`);
    try {
      const result = spawnSync(process.execPath, [loader], {
        encoding: "utf8",
        cwd: root,
        timeout: 8000,
        env: quietEnv(bin.dir),
      });
      assert.equal(result.status, 0);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      assert.equal(existsSync(bin.marker), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(bin.dir, { recursive: true, force: true });
    }
  });
});

describe("rebaseLinks", () => {
  it("prefixes a root-relative href", () => {
    assert.equal(rebaseLinks('<a href="/log">', base), '<a href="/v/9/log">');
  });

  it("prefixes the site root with a trailing slash", () => {
    assert.equal(rebaseLinks('<a href="/">', base), '<a href="/v/9/">');
  });

  it("prefixes a root-relative src", () => {
    assert.equal(rebaseLinks('<img src="/me.jpeg">', base), '<img src="/v/9/me.jpeg">');
  });

  it("leaves an already-prefixed asset alone", () => {
    const html = '<script src="/v/9/_next/static/chunk.js"></script>';
    assert.equal(rebaseLinks(html, base), html);
  });

  it("leaves the exact base path alone", () => {
    const html = '<a href="/v/9">';
    assert.equal(rebaseLinks(html, base), html);
  });

  it("prefixes a longer id that only shares the base text", () => {
    // `/v/90/x` does not start with `/v/9/`.
    assert.equal(rebaseLinks('<a href="/v/90/x">', base), '<a href="/v/9/v/90/x">');
  });

  it("leaves protocol-relative, absolute, hash, and relative urls alone", () => {
    const html = [
      '<a href="//cdn.example/a"></a>',
      '<a href="https://example.com/a"></a>',
      '<a href="#hash"></a>',
      '<img src="me.jpeg">',
    ].join("");
    assert.equal(rebaseLinks(html, base), html);
  });

  it("does not touch data-href", () => {
    const html = '<div data-href="/x"><a href="/x"></a></div>';
    assert.equal(rebaseLinks(html, base), '<div data-href="/x"><a href="/v/9/x"></a></div>');
  });

  it("does not prefix RSC href props or their escaped form", () => {
    const rsc = String.raw`{"href":"/log"}`;
    const escaped = String.raw`{\"href\":\"/log\"}`;
    const html = `<a href="/log"></a><script>${rsc}</script><script>${escaped}</script>`;
    const out = rebaseLinks(html, base);
    assert.equal(out, `<a href="/v/9/log"></a><script>${rsc}</script><script>${escaped}</script>`);
  });
});

describe("injectBanner", () => {
  it("inserts the banner immediately before the last </body>", () => {
    const html = "<body>one</body><body>two</body>";
    const at = html.lastIndexOf("</body>");
    assert.equal(injectBanner(html, "9", "2026-05-30"), html.slice(0, at) + banner("9", "2026-05-30") + html.slice(at));
  });

  it("returns the input when there is no </body>", () => {
    const html = "<p>no body</p>";
    assert.equal(injectBanner(html, "9", "2026-05-30"), html);
  });

  it("names the version and date, links home, and escapes the apostrophe", () => {
    const html = injectBanner("<body></body>", "9", "2026-05-30");
    assert.match(html, /v9/);
    assert.match(html, /2026-05-30/);
    assert.match(html, /href="\/"/);
    assert.match(html, /var\(--muted/);
    assert.match(html, /var\(--bg/);
    assert.match(html, /you&#39;re/);
    assert.equal(html.includes("you're"), false);
  });
});

describe("SNAPSHOT_CONFIG", () => {
  it("exports a static config that reads SNAPSHOT_BASE_PATH", async () => {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-config-"));
    const file = join(dir, "next.config.mjs");
    writeFileSync(file, SNAPSHOT_CONFIG);
    const prev = process.env.SNAPSHOT_BASE_PATH;
    process.env.SNAPSHOT_BASE_PATH = "/v/9";
    try {
      const href = `${pathToFileURL(file).href}?t=${randomBytes(8).toString("hex")}`;
      const mod = await import(href);
      assert.deepEqual(
        {
          output: mod.default.output,
          basePath: mod.default.basePath,
          trailingSlash: mod.default.trailingSlash,
          unoptimized: mod.default.images.unoptimized,
        },
        { output: "export", basePath: "/v/9", trailingSlash: true, unoptimized: true },
      );
    } finally {
      if (prev === undefined) delete process.env.SNAPSHOT_BASE_PATH;
      else process.env.SNAPSHOT_BASE_PATH = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("snapshot-version cli guards", () => {
  it("exits 1 with usage when no version is given", () => {
    const { result, called, mutated, archiveCreated } = runCli([]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /usage: node scripts\/snapshot-version\.mjs <n> \[git-ref\]/);
    assert.equal(result.stdout, "");
    assert.equal(called, false);
    assert.equal(mutated, false);
    assert.equal(archiveCreated, false);
  });

  it("exits 1 when the version is not in versions.json", () => {
    const { result, called, mutated, archiveCreated } = runCli(["999"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /no v999/);
    assert.equal(result.stdout, "");
    assert.equal(called, false);
    assert.equal(mutated, false);
    assert.equal(archiveCreated, false);
  });
});
