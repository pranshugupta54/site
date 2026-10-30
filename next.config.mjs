import { readFileSync } from "node:fs";

// Site versions (docs/versions.md). Read with fs so this file needs no JSON
// import support from whichever Node runs the build.
const VERSIONS = JSON.parse(
  readFileSync(new URL("./src/data/versions.json", import.meta.url), "utf8")
);

// Set by scripts/snapshot-version.mjs: build a static export that lives under
// /v/<n>/ of the production site.
const snapshotBase = process.env.SNAPSHOT_BASE_PATH;

// Build vitals for the site strip, only on Vercel — local builds leave them
// empty so the strip hides them. `??=` pins one timestamp per build: workers
// inherit process.env, so every bundle inlines the same value.
const onVercel = process.env.VERCEL === "1";

/** @type {import('next').NextConfig} */
const base = {
  reactStrictMode: true,
  env: {
    SITE_BUILT_AT: onVercel ? (process.env.SITE_BUILT_AT ??= new Date().toISOString()) : "",
    SITE_COMMIT_SHA: onVercel ? (process.env.VERCEL_GIT_COMMIT_SHA ?? "") : "",
  },
  // files read from disk at render time; ship them with every function so ISR
  // revalidation still finds them — notes (e.g. the home page's Writing
  // section) and worklog entries (src/lib/worklog.ts). "/**" also matches "/".
  outputFileTracingIncludes: {
    "/**": ["./content/notes/**/*", "./src/data/worklog/**"],
  },
};

const nextConfig = snapshotBase
  ? {
      ...base,
      output: "export",
      basePath: snapshotBase,
      env: { ...base.env, NEXT_PUBLIC_BASE_PATH: snapshotBase }, // for urls next doesn't base itself
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      ...base,
      async redirects() {
        // the current version is the live site
        return [{ source: `/v/${VERSIONS.current}`, destination: "/", permanent: false }];
      },
      async rewrites() {
        // Archived versions are static exports in public/v/<n>/. afterFiles runs
        // once public files have had their chance, so real assets (_next/*, images,
        // index.txt payloads) are served as-is and only page paths reach these.
        const archived = VERSIONS.versions.filter((v) => v.archive === "static");
        return {
          afterFiles: archived.flatMap(({ version: n }) => [
            { source: `/v/${n}`, destination: `/v/${n}/index.html` },
            { source: `/v/${n}/:path*`, destination: `/v/${n}/:path*/index.html` },
          ]),
        };
      },
    };

export default nextConfig;
