import Link from "next/link";
import { CURRENT, RENOVATION, VERSION_LIST, archiveHref, formatVersionDate } from "@/lib/versions";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta(
  "versions",
  "Every time this site was torn down and rebuilt, newest first.",
  "/versions"
);

export default function VersionsPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← back
      </Link>

      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        versions
      </h1>
      <p className="mt-3 text-sm text-muted">
        every time this site got torn down to the studs and rebuilt. new
        features don&apos;t count, only new houses. newest first, as told by
        tofu.
      </p>

      {RENOVATION ? (
        <p className="mt-6 font-mono text-[12px] text-muted">
          <span className="text-accent">●</span> tofu is renovating. v
          {RENOVATION.version} is going up next door —{" "}
          <a
            href={RENOVATION.href}
            target="_blank"
            rel="noreferrer"
            className="text-fg transition-colors hover:text-accent"
          >
            peek at it →
          </a>
        </p>
      ) : null}

      <ol className="mt-10 border-l border-line">
        {VERSION_LIST.map((v, i) => {
          const here = v.version === CURRENT.version;
          // a version lasts until the next one launches
          const until = i > 0 ? formatVersionDate(VERSION_LIST[i - 1].date) : "now";
          const archive = archiveHref(v);
          return (
            <li key={v.version} className="relative pb-10 pl-6">
              <span
                className={`absolute -left-[5px] top-2 h-2 w-2 rounded-full ${
                  here ? "bg-accent" : "border border-muted bg-bg"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12px] text-muted">
                <span className="text-fg">v{v.version}</span>
                <span>
                  {formatVersionDate(v.date)} – {until}
                </span>
                {here ? <span className="text-accent">you are here</span> : null}
              </div>
              <h2 className="mt-1.5 font-display text-lg font-semibold tracking-tight">
                {v.name}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed">{v.tofu}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">
                {v.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <span aria-hidden className="font-mono text-line">
                      –
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              {archive ? (
                <a
                  href={archive}
                  className="mt-3 inline-block font-mono text-[12px] text-muted transition-colors hover:text-accent"
                >
                  walk around v{v.version} as it was →
                </a>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-2 font-mono text-[12px] text-muted">— tofu 🐰</p>
    </main>
  );
}
