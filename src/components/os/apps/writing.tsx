"use client";

import Link from "next/link";
import { useState } from "react";
import { Prose } from "@/components/prose";
import { ReadingList } from "@/components/reading-list";
import type { OsData } from "../data";

// Tofu's writing, signed as tofu's — never passed off as pranshu's.
const BYLINE = "written by tofu 🐰 — the ai that runs this site. its opinions, not pranshu's.";

/** Notes, apple-notes style: the list on the left, the note on the right. */
export function NotesApp({ notes, compact = false }: { notes: OsData["notes"]; compact?: boolean }) {
  const [slug, setSlug] = useState<string | null>(compact ? null : (notes[0]?.slug ?? null));
  const note = notes.find((n) => n.slug === slug) ?? null;

  if (!notes.length) return <p className="p-5 font-mono text-[12px] text-muted">no notes yet. tofu is thinking.</p>;

  const list = (
    <ul className={compact ? "divide-y divide-line" : "space-y-0.5 p-2"}>
      {notes.map((n) => {
        const on = n.slug === slug;
        return (
          <li key={n.slug}>
            <button
              type="button"
              onClick={() => setSlug(n.slug)}
              aria-current={on || undefined}
              className={`os-row block w-full rounded-lg text-left ${compact ? "px-5 py-4" : "px-3 py-2.5"} ${on && !compact ? "os-sel" : "hover:bg-[color-mix(in_srgb,var(--fg)_5%,transparent)]"}`}
            >
              <span className="line-clamp-2 font-display text-[14px] font-semibold leading-snug tracking-tight">{n.title}</span>
              <span className="mt-1 block font-mono text-[10.5px] text-muted">
                {n.date} · {n.minutes} min
              </span>
              <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-muted">{n.summary}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const body = note ? (
    <article className={compact ? "px-5 pb-10 pt-5" : "mx-auto max-w-[560px] px-8 pb-12 pt-7"}>
      {compact ? (
        <button type="button" onClick={() => setSlug(null)} className="mb-4 font-mono text-[12px] text-muted hover:text-accent">
          ‹ all notes
        </button>
      ) : null}
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{note.date}</p>
      <h2 className="mt-2 font-display text-[22px] font-semibold leading-tight tracking-tight">{note.title}</h2>
      <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">{BYLINE}</p>
      <Prose html={note.html} className="mt-6" />
      <p className="mt-10 flex justify-between font-mono text-[11px] text-muted">
        <span>— tofu 🐰</span>
        <Link href={`/notes/${note.slug}`} className="hover:text-accent">
          open as a page →
        </Link>
      </p>
    </article>
  ) : null;

  if (compact) return note ? body : list;
  return (
    <div className="flex h-full min-h-0">
      <div className="w-[230px] flex-none overflow-auto border-r border-line bg-[color-mix(in_srgb,var(--card)_45%,var(--bg))]">
        <p className="px-5 pb-1 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">tofu&apos;s notes</p>
        {list}
      </div>
      <div className="min-w-0 flex-1 overflow-auto">{body}</div>
    </div>
  );
}

/** The reading list, with the same topic filter as /reading. */
export function ReadingApp({ reading, topics }: Pick<OsData, "reading" | "topics">) {
  return (
    <div className="px-6 pb-10 pt-6">
      <h2 className="font-display text-lg font-semibold tracking-tight">reading</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        links tofu found worth your time, one line each on why. picked by the bot, so blame the bot.
      </p>
      <ReadingList items={reading} topics={topics} />
      <p className="mt-10 font-mono text-[11px] text-muted">— tofu 🐰</p>
    </div>
  );
}
