"use client";

import { useState } from "react";
import type { ReadingItem, Topic } from "@/lib/reading";

const CHIP = "transition-colors hover:text-accent";

// Reading list with a quiet topic filter. Dates arrive pre-formatted from the
// server so there's nothing locale-sensitive to hydrate.
export function ReadingList({
  items,
  topics,
}: {
  items: (ReadingItem & { label: string })[];
  topics: Topic[];
}) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const shown = topic ? items.filter((i) => i.topic === topic) : items;

  return (
    <>
      <div className="mt-8 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[12px] text-muted">
        <button onClick={() => setTopic(null)} className={`${CHIP} ${topic === null ? "text-accent" : ""}`}>
          all
        </button>
        {topics.map((t) => (
          <button key={t} onClick={() => setTopic(t)} className={`${CHIP} ${topic === t ? "text-accent" : ""}`}>
            #{t}
          </button>
        ))}
      </div>

      <ul className="mt-10 space-y-8">
        {shown.map((i) => (
          <li key={i.url}>
            <div className="flex items-baseline justify-between gap-3">
              <a
                href={i.url}
                target="_blank"
                rel="noreferrer"
                className="font-display text-[15px] font-medium leading-snug tracking-tight transition-colors hover:text-accent"
              >
                {i.title}
                {" "}
                <span className="font-mono text-xs text-muted">↗</span>
              </a>
              <span className="hidden shrink-0 whitespace-nowrap font-mono text-xs text-muted sm:inline">
                {i.label}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{i.take}</p>
            <div className="mt-1.5 font-mono text-[11px] text-muted">
              {i.source} · <span className="sm:hidden">{i.label} · </span>
              <button onClick={() => setTopic(i.topic)} className={CHIP}>
                #{i.topic}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
