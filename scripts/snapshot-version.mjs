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
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
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

// local env (e.g. GITHUB_TOKEN) so live widgets freeze with real data, not hide
const ENV_FILES = [".env.local", ".env.production.local"];

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
  // too short to be a real token, and would match all over the place
  const literals = tokens.filter((t) => t && t.length >= 8);
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

/** GITHUB_TOKEN values from env files in `dir`, as next would load them. */
function envFileTokens(dir) {
  return [".env", ".env.production", ...ENV_FILES]
    .filter((f) => existsSync(join(dir, f)))
    .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n"))
    .map((line) => line.match(/^\s*(?:export\s+)?GITHUB_TOKEN\s*=\s*(.*?)\s*$/)?.[1])
    .filter(Boolean)
    .map((v) => v.replace(/^(['"])(.*)\1$/, "$2"));
}

/**
 * Root-relative links that skipped basePath — raw <a href="/log">, metadata
 * icons, <img src="/x.png"> — would walk out of the archive. Point them back
 * inside it. HTML attributes only: the RSC payloads also hold next/link props,
 * which are stored without basePath and get it added by the router, so
 * touching those would prefix them twice. React keeps the server's attribute
 * on hydration, so the rebased href sticks.
 */
export function rebaseLinks(html, base) {
  const fix = (p) => (p === base || p.startsWith(base + "/") ? p : base + p);
  return html.replace(/(\s(?:href|src)=")(\/(?!\/)[^"]*)"/g, (_, pre, p) => `${pre}${fix(p)}"`);
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

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
}

function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: "inherit", ...opts });
}

// like run(), but also hands back the output so a failure can be read
function runTee(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const tee = (from, to) => from.on("data", (d) => ((output += d), to.write(d)));
    tee(child.stdout, process.stdout);
    tee(child.stderr, process.stderr);
    child.on("close", (code) => resolve({ code, output }));
  });
}

// Unauthenticated GitHub calls get rate-limited, which would freeze the archive
// with an empty heatmap and skills list. Borrow gh's token when none is set.
function githubEnv(wt) {
  if (process.env.GITHUB_TOKEN) return {};
  if (ENV_FILES.some((f) => existsSync(join(wt, f)) && readFileSync(join(wt, f), "utf8").includes("GITHUB_TOKEN"))) return {};
  try {
    const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (token) {
      console.log("\n→ GITHUB_TOKEN unset; using gh's token for build-time GitHub fetches");
      return { GITHUB_TOKEN: token };
    }
  } catch {
    /* no gh — GitHub widgets hide, like they do live */
  }
  return {};
}

async function main() {
  const [, , n, ref = "HEAD"] = process.argv;
  if (!n || !/^[\w.-]+$/.test(n)) {
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
    run("npm", existsSync(join(wt, "package-lock.json")) ? ["ci", "--no-audit", "--no-fund"] : ["install", "--no-audit", "--no-fund"], { cwd: wt });

    for (const b of BLOCKERS) rmSync(join(wt, b), { recursive: true, force: true });
    for (const f of ENV_FILES) if (existsSync(join(repo, f))) cpSync(join(repo, f), join(wt, f));

    const configs = ["next.config.mjs", "next.config.js", "next.config.ts"].filter((f) => existsSync(join(wt, f)));
    const honorsBase = configs.some((f) => readFileSync(join(wt, f), "utf8").includes("SNAPSHOT_BASE_PATH"));
    if (!honorsBase) {
      console.log("\n→ ref predates snapshot support; using the known-good snapshot config");
      for (const f of configs) rmSync(join(wt, f));
      writeFileSync(join(wt, "next.config.mjs"), SNAPSHOT_CONFIG);
    }

    const borrowed = githubEnv(wt);
    const tokens = [process.env.GITHUB_TOKEN, ...envFileTokens(wt), borrowed.GITHUB_TOKEN];
    const env = { ...process.env, ...borrowed, SNAPSHOT_BASE_PATH: base, NEXT_TELEMETRY_DISABLED: "1" };
    for (let attempt = 1; ; attempt++) {
      console.log(`\n→ building static export at ${base}`);
      const { code, output } = await runTee("npm", ["run", "build"], { cwd: wt, env });
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

    const dest = join(repo, "public", "v", n);
    rmSync(dest, { recursive: true, force: true });
    cpSync(out, dest, { recursive: true });

    entry.archive = "static";
    writeFileSync(versionsFile, JSON.stringify(versions, null, 2) + "\n");

    console.log(`\n✓ v${n} archived: ${pages.length} pages → public/v/${n}/, versions.json updated`);
  } finally {
    try {
      run("git", ["worktree", "remove", "--force", wt], { cwd: repo });
    } catch {
      run("git", ["worktree", "prune"], { cwd: repo });
    }
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`\n✗ ${e.message}`);
    process.exit(1);
  });
}
