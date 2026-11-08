"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { relative } from "@/components/local-time";
import { CopyCommand } from "@/components/copy-command";
import { SITE } from "@/lib/site";
import type { OwnRepo } from "@/lib/github";
import type { Featured } from "../data";

type Sort = "recent" | "stars" | "name";
type Place = { kind: "featured" } | { kind: "all" } | { kind: "lang"; lang: string };

const noSubscribe = () => () => {};
// relative times read the clock: client-only, after hydration
const useMounted = () => useSyncExternalStore(noSubscribe, () => true, () => false);

function Folder({ size = 52, star = false }: { size?: number; star?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="block">
      <path d="M5 13a3 3 0 0 1 3-3h10l3.5 3.5H40a3 3 0 0 1 3 3V19H5z" fill="color-mix(in srgb, var(--accent) 50%, var(--card))" />
      <rect x="5" y="17" width="38" height="23" rx="3.5" fill="color-mix(in srgb, var(--accent) 82%, var(--bg))" />
      <rect x="5" y="17" width="38" height="2" fill="color-mix(in srgb, var(--bg) 28%, transparent)" />
      {star ? (
        <path
          d="m24 22.5 1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z"
          fill="color-mix(in srgb, var(--bg) 75%, transparent)"
        />
      ) : (
        <path d="M18 29h12" stroke="color-mix(in srgb, var(--bg) 50%, transparent)" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

type Item = { name: string; sub: string; star: boolean };

/** Finder-ish: places on the left, folders on the right. Double-click (or Enter) opens one. */
export function ProjectsApp({
  repos,
  featured,
  onOpen,
  compact = false,
}: {
  repos: OwnRepo[] | null;
  featured: Featured[];
  onOpen: (name: string) => void;
  /** phone: no sidebar, a segmented control instead */
  compact?: boolean;
}) {
  const [place, setPlace] = useState<Place>(repos ? { kind: "all" } : { kind: "featured" });
  const [sort, setSort] = useState<Sort>("recent");
  const [sel, setSel] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const langs = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of repos ?? []) if (r.language) m.set(r.language, (m.get(r.language) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [repos]);

  const items: Item[] = useMemo(() => {
    if (place.kind === "featured")
      return featured.map((f) => ({ name: f.name, sub: f.users ?? f.release ?? "featured", star: true }));
    const pinned = new Set(featured.map((f) => f.name));
    let list = (repos ?? []).filter((r) => place.kind !== "all" || !pinned.has(r.name));
    if (place.kind === "lang") list = list.filter((r) => r.language === place.lang);
    const sorted = [...list].sort((a, b) =>
      sort === "stars" ? b.stars - a.stars || b.pushedAt.localeCompare(a.pushedAt) : sort === "name" ? a.name.localeCompare(b.name) : b.pushedAt.localeCompare(a.pushedAt)
    );
    const rows = sorted.map((r) => ({ name: r.name, sub: r.language ?? "—", star: pinned.has(r.name) }));
    // "all" keeps the featured ones pinned up front
    return place.kind === "all"
      ? [...featured.map((f) => ({ name: f.name, sub: f.users ?? f.release ?? "featured", star: true })), ...rows]
      : rows;
  }, [place, sort, repos, featured]);

  const title = place.kind === "featured" ? "featured" : place.kind === "all" ? "all repos" : place.lang;

  // arrow keys walk the grid; Enter opens
  const onKey = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    const i = items.findIndex((it) => it.name === sel);
    const grid = gridRef.current;
    const cols = grid ? Math.max(1, Math.round(grid.clientWidth / 122)) : 4;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (step) {
      e.preventDefault();
      const next = i === -1 ? 0 : Math.max(0, Math.min(items.length - 1, i + step));
      setSel(items[next].name);
      grid?.querySelector<HTMLElement>(`[data-item="${CSS.escape(items[next].name)}"]`)?.focus();
    } else if (e.key === "Enter" && sel) {
      e.preventDefault();
      onOpen(sel);
    }
  };

  const placeBtn = (p: Place, label: string, count?: number) => {
    const on = JSON.stringify(p) === JSON.stringify(place);
    return (
      <button
        key={label}
        type="button"
        onClick={() => {
          setPlace(p);
          setSel(null);
        }}
        aria-pressed={on}
        className={`os-row flex w-full items-baseline justify-between rounded-md px-2 py-1 text-left font-mono text-[11.5px] ${on ? "os-sel text-fg" : "text-muted hover:text-fg"}`}
      >
        <span className="truncate">{label}</span>
        {count !== undefined ? <span className="text-[10.5px] text-muted">{count}</span> : null}
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0">
      {!compact && (
        <nav aria-label="places" className="w-[150px] flex-none space-y-0.5 overflow-auto border-r border-line bg-[color-mix(in_srgb,var(--card)_45%,var(--bg))] p-2">
          <p className="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">favorites</p>
          {placeBtn({ kind: "featured" }, "featured", featured.length)}
          {repos ? placeBtn({ kind: "all" }, "all repos", repos.length + featured.filter((f) => !repos.some((r) => r.name === f.name)).length) : null}
          {langs.length > 0 && (
            <p className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">languages</p>
          )}
          {langs.map(([lang, n]) => placeBtn({ kind: "lang", lang }, lang.toLowerCase(), n))}
        </nav>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-3 border-b border-line px-4 py-2 font-mono text-[11.5px]">
          {compact ? (
            <div className="flex gap-1 rounded-lg bg-card p-0.5" role="group" aria-label="show">
              {placeBtn({ kind: "featured" }, "featured")}
              {repos ? placeBtn({ kind: "all" }, "all repos") : null}
            </div>
          ) : (
            <span className="text-fg">{title}</span>
          )}
          <span className="text-muted">{items.length} {items.length === 1 ? "item" : "items"}</span>
          {place.kind !== "featured" && (
            <label className="ml-auto flex items-center gap-1.5 text-muted">
              sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-md border border-line bg-bg px-1.5 py-0.5 text-fg outline-none focus-visible:border-accent"
              >
                <option value="recent">recent</option>
                <option value="stars">stars</option>
                <option value="name">name</option>
              </select>
            </label>
          )}
        </div>

        <div
          ref={gridRef}
          role="listbox"
          aria-label={title}
          onKeyDown={onKey}
          onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}
          className="grid min-h-0 flex-1 auto-rows-max content-start gap-x-1 gap-y-3 overflow-auto p-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))" }}
        >
          {items.map((it) => {
            const on = sel === it.name;
            return (
              <button
                key={it.name}
                type="button"
                role="option"
                aria-selected={on}
                data-item={it.name}
                tabIndex={on || (!sel && it === items[0]) ? 0 : -1}
                title={compact ? undefined : "double-click to open"}
                onClick={() => (compact ? onOpen(it.name) : setSel(it.name))}
                onDoubleClick={() => onOpen(it.name)}
                onFocus={() => setSel(it.name)}
                className="group flex flex-col items-center gap-1 rounded-lg px-1 py-2 outline-none"
              >
                <span className={`rounded-md p-1 ${on ? "bg-[color-mix(in_srgb,var(--fg)_8%,transparent)]" : ""}`}>
                  <Folder star={it.star} />
                </span>
                <span
                  className={`line-clamp-2 max-w-full rounded px-1.5 text-center font-mono text-[11.5px] leading-snug [overflow-wrap:anywhere] ${on ? "os-sel-strong" : "text-fg"}`}
                >
                  {it.name}
                </span>
                <span className="font-mono text-[10px] lowercase text-muted">{it.sub}</span>
              </button>
            );
          })}
          {!repos && place.kind !== "featured" ? (
            <p className="col-span-full font-mono text-[12px] text-muted">github didn&apos;t answer. the repos are one click away →</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-1.5 last:border-0">
      <dt className="font-mono text-[11px] text-muted">{k}</dt>
      <dd className="min-w-0 truncate text-right font-mono text-[12px]">{children}</dd>
    </div>
  );
}

/** "Get Info" for one project: featured ones from site.ts + live counts, the rest from github. */
export function ProjectDetail({ name, repos, featured }: { name: string; repos: OwnRepo[] | null; featured: Featured[] }) {
  const mounted = useMounted();
  const f = featured.find((p) => p.name === name);
  const r = repos?.find((p) => p.name === (f ? f.repo.split("/")[1] : name) && (!f || f.repo.startsWith(`${SITE.handle}/`)));
  if (!f && !r) return <p className="p-5 font-mono text-[12px] text-muted">this one wandered off.</p>;

  const desc = f?.blurb ?? r?.description ?? null;
  const url = f?.href ?? r!.url;
  const stars = f ? f.stars : r!.stars;
  const year = r?.createdAt ? r.createdAt.slice(0, 4) : null;

  return (
    <div className="p-5">
      <div className="flex items-start gap-4">
        <Folder size={64} star={!!f} />
        <div className="min-w-0 pt-1">
          <h2 className="font-display text-xl font-semibold tracking-tight">{name}</h2>
          {desc ? <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p> : null}
        </div>
      </div>

      <dl className="mt-5 rounded-lg border border-line bg-[color-mix(in_srgb,var(--card)_45%,var(--bg))] px-3 py-1">
        {f?.users ? <Row k="users">{f.users}</Row> : null}
        {stars !== null && stars !== undefined ? <Row k="stars">★ {stars.toLocaleString("en-US")}</Row> : null}
        {f?.release ? <Row k="latest release">{f.release}</Row> : null}
        {r?.language ? <Row k="language">{r.language.toLowerCase()}</Row> : null}
        {r?.pushedAt ? (
          <Row k="last push">
            <span suppressHydrationWarning>{mounted ? relative(new Date(r.pushedAt)) : r.pushedAt.slice(0, 10)}</span>
          </Row>
        ) : null}
        {year ? <Row k="since">{year}</Row> : null}
        <Row k="repo">{(f?.repo ?? `${SITE.handle}/${name}`).toLowerCase()}</Row>
      </dl>

      {r?.topics.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {r.topics.slice(0, 8).map((t) => (
            <span key={t} className="rounded-md bg-card px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
              #{t}
            </span>
          ))}
        </div>
      ) : null}

      {f?.install ? <CopyCommand cmd={f.install} className="mt-4" /> : null}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px]">
        <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          open on github ↗
        </a>
        {r?.homepage ? (
          <a href={r.homepage} target="_blank" rel="noreferrer" className="text-muted transition-colors hover:text-accent">
            website ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}
