import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SNAPSHOT_CONFIG,
  assertNoSecrets,
  banner,
  envFileToken,
  injectBanner,
  installArchive,
  pinStaticParams,
  rebaseLinks,
  redactor,
  removeCheckout,
  runTee,
  scanForSecrets,
} from "./snapshot-version.mjs";

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

  it("leaves other versions' archives alone, even one that shares the base text", () => {
    // freezing v2 must not turn a link to v1's archive into /v/2/v/1
    assert.equal(rebaseLinks('<a href="/v/1">', "/v/2"), '<a href="/v/1">');
    assert.equal(rebaseLinks('<a href="/v/90/x">', base), '<a href="/v/90/x">');
    assert.equal(rebaseLinks('<a href="/v">', base), '<a href="/v">');
  });

  it("judges already-based links by pathname, ignoring query and hash", () => {
    assert.equal(rebaseLinks('<a href="/v/2?season=off">', "/v/2"), '<a href="/v/2?season=off">');
    assert.equal(rebaseLinks('<a href="/v/2#top">', "/v/2"), '<a href="/v/2#top">');
    assert.equal(rebaseLinks('<a href="/v/2/log?x=1">', "/v/2"), '<a href="/v/2/log?x=1">');
  });

  it("keeps the query and hash when it does prefix", () => {
    assert.equal(rebaseLinks('<a href="/?season=off">', base), '<a href="/v/9/?season=off">');
    assert.equal(rebaseLinks('<a href="/log#latest">', base), '<a href="/v/9/log#latest">');
  });

  it("rebases root-relative srcset and imagesrcset candidates", () => {
    const html =
      '<img srcset="/a.png 1x, /b.png 2x, https://cdn.example/c.png 3x, //cdn.example/d.png 4x, /v/9/e.png 5x, /v/1/f.png 6x">' +
      '<link rel="preload" imagesrcset="/g.png 640w,/h.png 1280w">';
    assert.equal(
      rebaseLinks(html, base),
      '<img srcset="/v/9/a.png 1x, /v/9/b.png 2x, https://cdn.example/c.png 3x, //cdn.example/d.png 4x, /v/9/e.png 5x, /v/1/f.png 6x">' +
        '<link rel="preload" imagesrcset="/v/9/g.png 640w,/v/9/h.png 1280w">'
    );
  });

  it("rebases url(/…) in style attributes, in every quoting style", () => {
    const html =
      '<div style="background:url(/a.png)"></div>' +
      "<div style=\"background:url('/b.png')\"></div>" +
      '<div style="background-image:url(&quot;/c.png&quot;)"></div>';
    assert.equal(
      rebaseLinks(html, base),
      '<div style="background:url(/v/9/a.png)"></div>' +
        "<div style=\"background:url('/v/9/b.png')\"></div>" +
        '<div style="background-image:url(&quot;/v/9/c.png&quot;)"></div>'
    );
  });

  it("rebases url(/…) in <style> blocks with the same skips", () => {
    const css = ".a{background:url(/a.png)}.b{background:url(\"//cdn.example/b.png\")}.c{background:url('/v/1/c.png')}";
    assert.equal(
      rebaseLinks(`<style>${css}</style>`, base),
      "<style>.a{background:url(/v/9/a.png)}.b{background:url(\"//cdn.example/b.png\")}.c{background:url('/v/1/c.png')}</style>"
    );
  });

  it("rebases a script's src but never its contents", () => {
    const body = 'self.__next_f.push([1,"<style>.x{background:url(/a.png)}</style><a href=\\"/log\\">"])';
    assert.equal(
      rebaseLinks(`<script src="/x.js"></script><script>${body}</script>`, base),
      `<script src="/v/9/x.js"></script><script>${body}</script>`
    );
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

describe("secret guard", () => {
  // Fake tokens, assembled at runtime so no token-shaped literal sits in the repo.
  const classic = ["gh", "p_"].join("") + "Fake0Token0Value0For0Tests0Only00";
  const fineGrained = ["github", "_pat_"].join("") + "11FAKE_fake_token_for_tests_only";
  const literal = "0123abcd".repeat(5); // a legacy-style token no pattern knows

  // A small export-shaped tree: html pages, a js chunk, a font.
  function exportDir(files = {}) {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-out-"));
    const all = {
      "index.html": "<html><body>hi</body></html>",
      "log/index.html": "<html><body>log</body></html>",
      "_next/static/chunks/main.js": "console.log(1)",
      "_next/static/media/font.woff2": Buffer.from([0, 1, 2, 255, 254]),
      ...files,
    };
    for (const [path, body] of Object.entries(all)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    return dir;
  }

  function withExport(files, fn) {
    const dir = exportDir(files);
    try {
      return fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("passes a clean export", () => {
    withExport({}, (dir) => {
      assert.deepEqual(scanForSecrets(dir, [literal]), []);
      assert.doesNotThrow(() => assertNoSecrets(dir, [literal]));
    });
  });

  it("catches a classic token in an html page", () => {
    withExport({ "log/index.html": `<body>${classic}</body>` }, (dir) => {
      assert.deepEqual(scanForSecrets(dir), [{ file: join("log", "index.html"), pattern: "github token (gh*_)" }]);
    });
  });

  it("catches a fine-grained token in a js chunk", () => {
    withExport({ "_next/static/chunks/main.js": `const t="${fineGrained}"` }, (dir) => {
      assert.deepEqual(scanForSecrets(dir), [
        { file: join("_next", "static", "chunks", "main.js"), pattern: "github fine-grained token (github_pat_)" },
      ]);
    });
  });

  it("catches the literal token the build used, even inside a binary file", () => {
    const font = Buffer.concat([Buffer.from([0, 255, 7]), Buffer.from(literal, "latin1"), Buffer.from([254])]);
    withExport({ "_next/static/media/font.woff2": font }, (dir) => {
      assert.deepEqual(scanForSecrets(dir, [literal]), [
        { file: join("_next", "static", "media", "font.woff2"), pattern: "the GITHUB_TOKEN this build used" },
      ]);
    });
  });

  it("ignores empty and too-short literal tokens", () => {
    withExport({}, (dir) => {
      assert.deepEqual(scanForSecrets(dir, [undefined, "", "hi"]), []);
    });
  });

  it("names files and patterns in the failure, never the secret", () => {
    const files = { "index.html": `<body>${classic}</body>`, "_next/static/chunks/main.js": `"${fineGrained}${literal}"` };
    withExport(files, (dir) => {
      let message = "";
      try {
        assertNoSecrets(dir, [literal]);
      } catch (e) {
        message = e.message;
      }
      assert.match(message, /secret found/);
      assert.match(message, /index\.html/);
      assert.match(message, /main\.js/);
      assert.match(message, /github fine-grained token/);
      for (const secret of [classic, fineGrained, literal]) assert.equal(message.includes(secret), false);
    });
  });
});

describe("redactor", () => {
  // synthetic credential, nothing like a real token
  const secret = "fake-credential-for-tests-0001";

  function feed(chunks, secrets = [secret]) {
    const r = redactor(secrets);
    const pieces = chunks.map((c) => r.write(c));
    pieces.push(r.end());
    return pieces;
  }

  it("redacts a secret inside one chunk", () => {
    assert.equal(feed([`token=${secret} ok\n`]).join(""), "token=[redacted] ok\n");
  });

  it("redacts a secret split across chunks, and never emits a partial", () => {
    const pieces = feed(["token=", secret.slice(0, 9), secret.slice(9, 20), `${secret.slice(20)} ok\n`]);
    assert.equal(pieces.join(""), "token=[redacted] ok\n");
    for (const p of pieces) assert.equal(p.includes(secret.slice(0, 9)), false);
  });

  it("redacts every secret, longest first", () => {
    const short = "fake-cred-0002";
    const out = feed([`${short} ${secret}${short}`], [short, secret]).join("");
    assert.equal(out, "[redacted] [redacted][redacted]");
  });

  it("passes output through untouched with no usable secrets", () => {
    assert.equal(feed(["a ", "b\n"], [undefined, "", "short"]).join(""), "a b\n");
  });
});

describe("runTee", () => {
  const secret = "fake-credential-for-tests-0003";
  const sink = () => ({ text: "", write(s) { this.text += s; } });

  it("redacts the build's stdout and stderr before forwarding or capturing", async () => {
    // the child prints the secret in two writes with a pause, so it really arrives split
    const prog = `
      const s = process.argv[1];
      process.stdout.write("token=" + s.slice(0, 11));
      setTimeout(() => { process.stdout.write(s.slice(11) + " done\\n"); process.stderr.write("err " + s + "\\n"); }, 50);
    `;
    const out = sink();
    const err = sink();
    const { code, output } = await runTee(process.execPath, ["-e", prog, secret], { secrets: [secret], out, err });
    assert.equal(code, 0);
    assert.equal(out.text, "token=[redacted] done\n");
    assert.equal(err.text, "err [redacted]\n");
    assert.equal(output.includes(secret), false);
    assert.equal(output.includes(secret.slice(0, 11)), false);
  });

  it("rejects instead of hanging when the command can't start", async () => {
    await assert.rejects(runTee("snapshot-no-such-command-xyz", [], { out: sink(), err: sink() }), /couldn't run/);
  });
});

describe("envFileToken", () => {
  function envDir(files) {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-env-"));
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    return dir;
  }

  function withEnv(files, fn) {
    const dir = envDir(files);
    try {
      return fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("drops inline comments like next does", () => {
    withEnv({ ".env.local": "GITHUB_TOKEN=fake-file-token-01 # the local one\n" }, (dir) => {
      assert.equal(envFileToken(dir), "fake-file-token-01");
    });
  });

  it("expands ${VAR} from the same file and from higher-precedence files", () => {
    withEnv({ ".env.local": "TOKEN_PART=fake-part-02\nGITHUB_TOKEN=${TOKEN_PART}-joined\n" }, (dir) => {
      assert.equal(envFileToken(dir), "fake-part-02-joined");
    });
    withEnv({ ".env.local": "TOKEN_PART=fake-part-05\n", ".env": "GITHUB_TOKEN=${TOKEN_PART}-joined\n" }, (dir) => {
      assert.equal(envFileToken(dir), "fake-part-05-joined");
    });
  });

  it("matches next when a file references a var only a lower-precedence file defines", () => {
    // next loads .env.local before .env, so the reference is still empty at expansion time
    withEnv({ ".env": "TOKEN_PART=fake-part-06\n", ".env.local": "GITHUB_TOKEN=${TOKEN_PART}-joined\n" }, (dir) => {
      assert.equal(envFileToken(dir), "-joined");
    });
  });

  it("expands ${VAR} from the shell env", () => {
    const prev = process.env.SNAPSHOT_TEST_PART;
    process.env.SNAPSHOT_TEST_PART = "fake-shell-part-07";
    try {
      withEnv({ ".env.local": "GITHUB_TOKEN=${SNAPSHOT_TEST_PART}-joined\n" }, (dir) => {
        assert.equal(envFileToken(dir), "fake-shell-part-07-joined");
      });
    } finally {
      if (prev === undefined) delete process.env.SNAPSHOT_TEST_PART;
      else process.env.SNAPSHOT_TEST_PART = prev;
    }
  });

  it("follows next's production precedence across files", () => {
    const files = {
      ".env": "GITHUB_TOKEN=from-env-file\n",
      ".env.production": "GITHUB_TOKEN=from-env-production\n",
      ".env.local": "GITHUB_TOKEN=from-env-local\n",
      ".env.production.local": "GITHUB_TOKEN=from-env-production-local\n",
    };
    withEnv(files, (dir) => assert.equal(envFileToken(dir), "from-env-production-local"));
    const { [".env.production.local"]: _, ...rest } = files;
    withEnv(rest, (dir) => assert.equal(envFileToken(dir), "from-env-local"));
  });

  it("reads the files even when the env already has a token or NODE_ENV=test", () => {
    const prev = { token: process.env.GITHUB_TOKEN, nodeEnv: process.env.NODE_ENV };
    process.env.GITHUB_TOKEN = "fake-shell-token-03";
    process.env.NODE_ENV = "test";
    try {
      withEnv({ ".env.local": "GITHUB_TOKEN=fake-file-token-04\n" }, (dir) => {
        assert.equal(envFileToken(dir), "fake-file-token-04");
      });
    } finally {
      for (const [key, value] of [["GITHUB_TOKEN", prev.token], ["NODE_ENV", prev.nodeEnv]]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("returns undefined without a token in any file", () => {
    withEnv({ ".env": "OTHER=1\n" }, (dir) => assert.equal(envFileToken(dir), undefined));
  });
});

describe("installArchive", () => {
  function tree(files) {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-tree-"));
    for (const [path, body] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    return dir;
  }

  function withPublic(fn) {
    const pub = mkdtempSync(join(tmpdir(), "snapshot-public-"));
    const src = tree({ "index.html": "new", "log/index.html": "new log" });
    try {
      return fn({ pub, src, dest: join(pub, "v", "9") });
    } finally {
      rmSync(pub, { recursive: true, force: true });
      rmSync(src, { recursive: true, force: true });
    }
  }

  const read = (p) => readFileSync(p, "utf8");
  const leftovers = (pub) => ["v/.9.tmp", "v/.9.old"].filter((p) => existsSync(join(pub, p)));

  it("installs a fresh archive and leaves no staging behind", () => {
    withPublic(({ pub, src, dest }) => {
      installArchive(src, dest);
      assert.equal(read(join(dest, "log/index.html")), "new log");
      assert.deepEqual(leftovers(pub), []);
    });
  });

  it("replaces an existing archive completely", () => {
    withPublic(({ pub, src, dest }) => {
      mkdirSync(dest, { recursive: true });
      writeFileSync(join(dest, "index.html"), "old");
      writeFileSync(join(dest, "gone.html"), "old only");
      installArchive(src, dest);
      assert.equal(read(join(dest, "index.html")), "new");
      assert.equal(existsSync(join(dest, "gone.html")), false);
      assert.deepEqual(leftovers(pub), []);
    });
  });

  it("puts the old archive back when the swap fails", () => {
    withPublic(({ pub, src, dest }) => {
      mkdirSync(dest, { recursive: true });
      writeFileSync(join(dest, "index.html"), "old");
      const rename = (from, to) => {
        if (from.endsWith(".9.tmp")) throw new Error("disk said no");
        renameSync(from, to);
      };
      assert.throws(() => installArchive(src, dest, { rename }), /disk said no/);
      assert.equal(read(join(dest, "index.html")), "old");
      assert.deepEqual(leftovers(pub), []);
    });
  });

  it("restores an archive a crashed run left aside before touching anything", () => {
    withPublic(({ pub, src, dest }) => {
      mkdirSync(join(pub, "v", ".9.old"), { recursive: true });
      writeFileSync(join(pub, "v", ".9.old", "index.html"), "old");
      const rename = (from, to) => {
        if (from.endsWith(".9.tmp")) throw new Error("disk said no");
        renameSync(from, to);
      };
      assert.throws(() => installArchive(src, dest, { rename }));
      assert.equal(read(join(dest, "index.html")), "old");
    });
  });
});

describe("removeCheckout", () => {
  function fakeGit(exitCode) {
    const dir = mkdtempSync(join(tmpdir(), "snapshot-git-"));
    const log = join(dir, "calls");
    writeFileSync(join(dir, "git"), `#!/bin/sh\nprintf '%s\\n' "$*" >> ${shQuote(log)}\nexit ${exitCode}\n`, { mode: 0o755 });
    return { dir, log };
  }

  function withFakeGit(exitCode, fn) {
    const git = fakeGit(exitCode);
    const tmp = mkdtempSync(join(tmpdir(), "snapshot-checkout-"));
    mkdirSync(join(tmp, "site"));
    const prevPath = process.env.PATH;
    process.env.PATH = `${git.dir}${delimiter}${prevPath}`;
    try {
      // git runs from git.dir (standing in for the repo), which outlives tmp
      return fn({ tmp, wt: join(tmp, "site"), cwd: git.dir, calls: () => readFileSync(git.log, "utf8").trim().split("\n") });
    } finally {
      process.env.PATH = prevPath;
      rmSync(git.dir, { recursive: true, force: true });
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  it("removes the worktree, the temp dir, then prunes", () => {
    withFakeGit(0, ({ tmp, wt, cwd, calls }) => {
      removeCheckout(wt, tmp, cwd);
      assert.equal(existsSync(tmp), false);
      assert.deepEqual(calls(), [`worktree remove --force ${wt}`, "worktree prune"]);
    });
  });

  it("still deletes the temp dir and prunes when git fails at both", () => {
    withFakeGit(1, ({ tmp, wt, cwd, calls }) => {
      const warn = console.warn;
      console.warn = () => {};
      try {
        assert.doesNotThrow(() => removeCheckout(wt, tmp, cwd));
      } finally {
        console.warn = warn;
      }
      assert.equal(existsSync(tmp), false);
      assert.deepEqual(calls(), [`worktree remove --force ${wt}`, "worktree prune"]);
    });
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

describe("pinStaticParams", () => {
  it("pins dynamicParams = true to false, leaves everything else alone", () => {
    const src = 'export const revalidate = 3600;\nexport const dynamicParams = true; // new skills\n';
    assert.equal(
      pinStaticParams(src),
      'export const revalidate = 3600;\nexport const dynamicParams = false; // new skills\n'
    );
    assert.equal(pinStaticParams("export const dynamicParams = false;"), "export const dynamicParams = false;");
    assert.equal(pinStaticParams("const x = trueish;"), "const x = trueish;");
  });
});
