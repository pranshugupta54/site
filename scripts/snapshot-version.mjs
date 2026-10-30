#!/usr/bin/env node
// Archive a site version as a static export under public/v/<n>/, served by the
// production domain forever. See docs/versions.md. Usage:
//   node scripts/snapshot-version.mjs <n> [git-ref]     (ref defaults to HEAD)
//
// Builds the ref in a throwaway git worktree, so your checkout is never touched
// beyond public/v/<n>/ and the version's `archive` field in versions.json.
import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const versionsFile = join(repo, "src", "data", "versions.json");

// next.config for refs that predate SNAPSHOT_BASE_PATH support
export const SNAPSHOT_CONFIG = `/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.SNAPSHOT_BASE_PATH,
  trailingSlash: true,
  images: { unoptimized: true },
};
`;

// can't be statically exported; the archive does fine without them
const BLOCKERS = [
  "src/app/opengraph-image.tsx", // edge runtime
  "public/v", // older archives — they're already served from the live site
];

// `output: "export"` rejects `dynamicParams = true` (next 16+). A static archive
// can only serve the pages it built anyway, so pin every route to its built params.
export function pinStaticParams(src) {
  return src.replace(/export\s+const\s+dynamicParams\s*=\s*true\b/g, "export const dynamicParams = false");
}

function pinAllStaticParams(dir) {
  for (const f of walk(dir)) {
    if (!/\.(tsx?|jsx?|mjs)$/.test(f)) continue;
    const src = readFileSync(f, "utf8");
    const pinned = pinStaticParams(src);
    if (pinned !== src) writeFileSync(f, pinned);
  }
}

// local env (e.g. GITHUB_TOKEN) so live widgets freeze with real data, not hide
const ENV_FILES = [".env.local", ".env.production.local"];

// shorter than this can't be a real token, and would match all over the place
const MIN_SECRET = 8;

// GitHub token shapes: classic (ghp_, gho_, ghu_, ghs_, ghr_) and fine-grained
const SECRET_PATTERNS = [
  { name: "github token (gh*_)", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: "github fine-grained token (github_pat_)", re: /github_pat_[A-Za-z0-9_]{20,}/ },
];

/**
 * Every file under `dir` (binary read as latin1) checked for GitHub token
 * shapes and for the literal `tokens` the build ran with. Returns
 * `{ file, pattern }` per hit, file relative to `dir` — never the matched value.
 */
export function scanForSecrets(dir, tokens = []) {
  const literals = tokens.filter((t) => t && t.length >= MIN_SECRET);
  const hits = [];
  for (const file of walk(dir)) {
    const text = readFileSync(file).toString("latin1");
    const rel = relative(dir, file);
    for (const { name, re } of SECRET_PATTERNS) if (re.test(text)) hits.push({ file: rel, pattern: name });
    if (literals.some((t) => text.includes(t))) hits.push({ file: rel, pattern: "the GITHUB_TOKEN this build used" });
  }
  return hits;
}

/** Throws, listing files and pattern names only, if the export carries a secret. */
export function assertNoSecrets(dir, tokens = []) {
  const hits = scanForSecrets(dir, tokens);
  if (hits.length === 0) return;
  const list = hits.map((h) => `  ${h.file}  (${h.pattern})`).join("\n");
  throw new Error(`secret found in the export, nothing was archived:\n${list}`);
}

/**
 * GITHUB_TOKEN as next would resolve it from the env files in `dir`: next's own
 * loader (@next/env, from `dir` when it has one), production file precedence,
 * `# comments` and `${VAR}` expansion. A real GITHUB_TOKEN env var would shadow
 * the files, so it's left out here and collected separately. Runs in a child
 * process because the loader caches and rewrites process.env.
 */
export function envFileToken(dir) {
  const env = { ...process.env, NODE_ENV: "production" };
  delete env.GITHUB_TOKEN;
  const load = `
    const { createRequire } = require("node:module");
    const [dir, fallback] = process.argv.slice(1);
    let nextEnv;
    for (const from of [require("node:path").join(dir, "package.json"), fallback]) {
      try { nextEnv = createRequire(from)("@next/env"); break; } catch {}
    }
    if (!nextEnv) { console.error("@next/env not found; run npm ci"); process.exit(2); }
    const { parsedEnv } = nextEnv.loadEnvConfig(dir, false, { info() {}, error() {} }, true);
    process.stdout.write(JSON.stringify(parsedEnv?.GITHUB_TOKEN ?? null));
  `;
  const out = execFileSync(process.execPath, ["-e", load, dir, join(repo, "package.json")], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return JSON.parse(out) ?? undefined;
}

/**
 * Streams text with every secret replaced. Holds back the last
 * (longest secret - 1) characters, so a secret split across chunks is still
 * whole when it's matched; end() releases the rest.
 */
export function redactor(secrets = []) {
  const list = [...new Set(secrets.filter((s) => s && s.length >= MIN_SECRET))].sort((a, b) => b.length - a.length);
  const hold = list.length ? list[0].length - 1 : 0;
  const scrub = (s) => list.reduce((acc, secret) => acc.split(secret).join("[redacted]"), s);
  let buf = "";
  return {
    write(chunk) {
      buf = scrub(buf + chunk);
      const cut = Math.max(0, buf.length - hold);
      const ready = buf.slice(0, cut);
      buf = buf.slice(cut);
      return ready;
    },
    end() {
      const rest = scrub(buf);
      buf = "";
      return rest;
    },
  };
}

/**
 * Runs a command, forwarding its output with `secrets` redacted, and resolves
 * with the exit code and the (redacted) output so a failure can be read.
 * Rejects if the command can't start at all.
 */
export function runTee(cmd, args, { secrets = [], out = process.stdout, err = process.stderr, ...opts } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const forward = (from, to) => {
      const r = redactor(secrets);
      const emit = (text) => {
        if (!text) return;
        output += text;
        to.write(text);
      };
      from.setEncoding("utf8");
      from.on("data", (d) => emit(r.write(d)));
      from.on("end", () => emit(r.end()));
    };
    forward(child.stdout, out);
    forward(child.stderr, err);
    child.on("error", (e) => reject(new Error(`couldn't run ${cmd}: ${e.message}`)));
    child.on("close", (code) => resolve({ code, output }));
  });
}

/**
 * Root-relative URLs that skipped basePath — raw <a href="/log">, metadata
 * icons, <img src>, srcset candidates, url(/…) in inline styles — would walk
 * out of the archive. Point them back inside it.
 *
 * Left alone: protocol-relative `//…`, anything already under `base` (judged
 * by pathname, so `?query` / `#hash` don't matter), and the whole /v/ namespace,
 * which belongs to other archived versions. Script contents are never touched:
 * inline RSC payloads must stay byte-exact, and their next/link props get
 * basePath from the router anyway, so prefixing them would double it. React
 * keeps the server's attributes on hydration, so the rebased URLs stick.
 */
export function rebaseLinks(html, base) {
  const fix = (url) => {
    if (!url.startsWith("/") || url.startsWith("//")) return url;
    const path = url.split(/[?#]/, 1)[0];
    if (path === base || path.startsWith(base + "/")) return url;
    if (path === "/v" || path.startsWith("/v/")) return url;
    return base + url;
  };
  const css = (s) =>
    s.replace(/url\(\s*(&quot;|&#39;|&#x27;|['"])?(\/[^'")\s&]*)\1\s*\)/g, (_, q = "", url) => `url(${q}${fix(url)}${q})`);
  const markup = (s) =>
    s
      .replace(/(\s(?:href|src)=")(\/[^"]*)"/g, (_, pre, url) => `${pre}${fix(url)}"`)
      .replace(/(\s(?:srcset|imagesrcset)=")([^"]*)"/gi, (_, pre, set) =>
        `${pre}${set.replace(/(^|,)(\s*)(\/[^\s,]*)/g, (m, sep, ws, url) => sep + ws + fix(url))}"`
      )
      .replace(/(\sstyle=")([^"]*)"/g, (_, pre, style) => `${pre}${css(style)}"`)
      .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, open, body, close) => open + css(body) + close);
  // odd parts are whole <script> elements: rebase the opening tag, keep the body
  return html
    .split(/(<script\b[^>]*>[\s\S]*?<\/script>)/i)
    .map((part, i) => (i % 2 ? part.replace(/^<script\b[^>]*>/i, (tag) => markup(tag)) : markup(part)))
    .join("");
}

/** The "you're in the archive" strip. Inline styles on that snapshot's own tokens. */
export function banner(version, date) {
  return (
    `<div data-snapshot-banner style="position:fixed;top:0;left:0;right:0;z-index:60;` +
    `padding:6px 16px;text-align:center;text-wrap:balance;font:11px/1.5 var(--font-mono,ui-monospace,monospace);` +
    `color:var(--muted,#777);background:var(--bg,#fff);border-bottom:1px solid var(--line,#ddd)">` +
    `you&#39;re looking at v${version}, archived ${date} · ` +
    `<a href="/" style="color:var(--fg,#111);text-decoration:none;white-space:nowrap">back to now →</a></div>`
  );
}

export function injectBanner(html, version, date) {
  const i = html.lastIndexOf("</body>");
  return i === -1 ? html : html.slice(0, i) + banner(version, date) + html.slice(i);
}

/**
 * Puts `src` at `dest` without ever leaving `dest` missing or half-written:
 * copy into a staging dir beside it, move the old copy aside, rename staging
 * in, and only then drop the old copy. A failed swap puts the old copy back.
 * An old copy left aside by a crashed run is restored first.
 */
export function installArchive(src, dest, { rename = renameSync } = {}) {
  const staging = join(dirname(dest), `.${basename(dest)}.tmp`);
  const aside = join(dirname(dest), `.${basename(dest)}.old`);
  if (existsSync(aside)) {
    if (existsSync(dest)) rmSync(aside, { recursive: true, force: true });
    else rename(aside, dest);
  }
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  try {
    cpSync(src, staging, { recursive: true });
    const had = existsSync(dest);
    if (had) rename(dest, aside);
    try {
      rename(staging, dest);
    } catch (e) {
      if (had) rename(aside, dest);
      throw e;
    }
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  rmSync(aside, { recursive: true, force: true });
}

/**
 * Removes the temp checkout no matter what: git's own removal first, then the
 * directory itself, then a prune so git forgets a checkout it couldn't remove.
 */
export function removeCheckout(wt, tmp, cwd = repo) {
  try {
    execFileSync("git", ["worktree", "remove", "--force", wt], { cwd, stdio: "ignore" });
  } catch {
    /* never created, or git refused: the rm + prune below still clean up */
  } finally {
    rmSync(tmp, { recursive: true, force: true });
    try {
      execFileSync("git", ["worktree", "prune"], { cwd, stdio: "ignore" });
    } catch {
      console.warn("couldn't prune git worktrees; run `git worktree prune` by hand");
    }
  }
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
}

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

// Unauthenticated GitHub calls get rate-limited, which would freeze the archive
// with an empty heatmap and skills list. Borrow gh's token when none is set.
function ghToken() {
  try {
    const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (token) console.log("\n→ GITHUB_TOKEN unset; using gh's token for build-time GitHub fetches");
    return token || undefined;
  } catch {
    return undefined; // no gh — GitHub widgets hide, like they do live
  }
}

async function main() {
  const [, , n, ref = "HEAD"] = process.argv;
  if (!n || !/^[A-Za-z0-9][\w.-]*$/.test(n) || n.includes("..")) {
    console.error("usage: node scripts/snapshot-version.mjs <n> [git-ref]");
    process.exit(1);
  }
  const versions = JSON.parse(readFileSync(versionsFile, "utf8"));
  const entry = versions.versions.find((v) => v.version === n);
  if (!entry) {
    console.error(`no v${n} in src/data/versions.json — add its entry first`);
    process.exit(1);
  }

  const base = `/v/${n}`;
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  const tmp = mkdtempSync(join(tmpdir(), `site-v${n}-`));
  const wt = join(tmp, "site");

  try {
    console.log(`\n→ checking out ${ref} into ${wt}`);
    run("git", ["worktree", "add", "--detach", wt, ref], { cwd: repo });

    console.log("\n→ installing");
    const install = existsSync(join(wt, "package-lock.json")) ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"];
    const installed = await runTee("npm", install, { cwd: wt, secrets: [process.env.GITHUB_TOKEN] });
    if (installed.code !== 0) throw new Error("npm install failed (see output above)");

    for (const b of BLOCKERS) rmSync(join(wt, b), { recursive: true, force: true });
    if (existsSync(join(wt, "src/app"))) pinAllStaticParams(join(wt, "src/app"));
    for (const f of ENV_FILES) if (existsSync(join(repo, f))) cpSync(join(repo, f), join(wt, f));

    const configs = ["next.config.mjs", "next.config.js", "next.config.ts"].filter((f) => existsSync(join(wt, f)));
    const honorsBase = configs.some((f) => readFileSync(join(wt, f), "utf8").includes("SNAPSHOT_BASE_PATH"));
    if (!honorsBase) {
      console.log("\n→ ref predates snapshot support; using the known-good snapshot config");
      for (const f of configs) rmSync(join(wt, f));
      writeFileSync(join(wt, "next.config.mjs"), SNAPSHOT_CONFIG);
    }

    // every token the build can see: redacted from its output, scanned for in the export
    const fileToken = envFileToken(wt);
    const borrowed = process.env.GITHUB_TOKEN || fileToken ? undefined : ghToken();
    const tokens = [process.env.GITHUB_TOKEN, fileToken, borrowed];
    const env = { ...process.env, SNAPSHOT_BASE_PATH: base, NEXT_TELEMETRY_DISABLED: "1" };
    if (borrowed) env.GITHUB_TOKEN = borrowed;

    for (let attempt = 1; ; attempt++) {
      console.log(`\n→ building static export at ${base}`);
      const { code, output } = await runTee("npm", ["run", "build"], { cwd: wt, env, secrets: tokens });
      if (code === 0) break;
      // A dynamic route whose data came back empty has no pages to export, and
      // next refuses to export it at all. Leave it out and go again.
      const route = output.match(/Page "([^"]+)" is missing "?generateStaticParams/)?.[1];
      const dir = route && ["src/app", "app"].map((d) => join(wt, d, route)).find(existsSync);
      if (!dir || attempt > 5) throw new Error("snapshot build failed (see output above)");
      console.log(`\n→ ${route} has nothing to export; leaving it out of the snapshot`);
      rmSync(dir, { recursive: true, force: true });
    }

    const out = join(wt, "out");
    const pages = walk(out).filter((f) => f.endsWith(".html"));
    for (const file of pages) {
      writeFileSync(file, injectBanner(rebaseLinks(readFileSync(file, "utf8"), base), n, date));
    }

    // the build had a token in hand; make sure none of it ended up in public/
    console.log("\n→ scanning the export for secrets");
    try {
      assertNoSecrets(out, tokens);
    } catch (e) {
      rmSync(out, { recursive: true, force: true });
      throw e;
    }

    installArchive(out, join(repo, "public", "v", n));

    entry.archive = "static";
    writeFileSync(versionsFile, JSON.stringify(versions, null, 2) + "\n");

    console.log(`\n✓ v${n} archived: ${pages.length} pages → public/v/${n}/, versions.json updated`);
  } finally {
    removeCheckout(wt, tmp);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`\n✗ ${e.message}`);
    process.exit(1);
  });
}
