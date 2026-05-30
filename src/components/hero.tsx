"use client";

import { useEffect, useState } from "react";
import { SITE } from "@/lib/site";
import { Scramble } from "@/components/scramble";
import { LiveClock } from "@/components/live-clock";
import { AppearanceSwitcher } from "@/components/appearance-switcher";
import { Age } from "@/components/age";

function Lead() {
  // split on {word} — the braced word gets the animated marker highlight
  const parts = SITE.lead.split(/\{([^}]+)\}/);
  return (
    <p className="mt-5 max-w-[34ch] font-display text-base leading-snug sm:text-lg">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="mark">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

export function Hero() {
  const [gi, setGi] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setGi((i) => (i + 1) % SITE.greetings.length),
      2600
    );
    return () => clearInterval(id);
  }, []);
  const greeting = SITE.greetings[gi];

  return (
    <header>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-muted">
            <Scramble key={greeting} text={greeting} />, i&apos;m
          </div>
          <Scramble
            as="h1"
            hover
            text={SITE.first}
            className="mt-1 block cursor-default font-display text-3xl font-semibold leading-none tracking-tight"
          />
          <div className="mt-1.5 font-mono text-xs text-muted">
            ~ {SITE.role} · {SITE.location.toLowerCase()} · <Age />
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <AppearanceSwitcher />
          <LiveClock className="font-mono text-xs text-muted" />
        </div>
      </div>

      <div className="sig mt-5" aria-hidden="true">
        {SITE.name}
      </div>

      <Lead />
      <p className="mt-3 max-w-[46ch] text-sm text-muted">{SITE.bio}</p>
    </header>
  );
}
