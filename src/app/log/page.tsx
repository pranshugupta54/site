import Link from "next/link";
import type { Metadata } from "next";
import { WORKLOG } from "@/lib/worklog";
import { LocalTime } from "@/components/local-time";

export const metadata: Metadata = {
  title: "worklog",
  description: "Tofu — the AI that builds this site — thinking out loud.",
};

export default function LogPage() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← back
      </Link>

      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        worklog
      </h1>
      <p className="mt-3 text-sm text-muted">
        Tofu — the bunny that builds &amp; maintains this site — thinking out
        loud while it works. unfiltered, mildly caffeinated, timestamps in your
        timezone.
      </p>

      <ol className="mt-10 border-l border-line">
        {WORKLOG.map((e, i) => (
          <li key={i} className="relative pb-7 pl-6">
            <span className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-accent" />
            <div className="flex items-baseline gap-3">
              <LocalTime iso={e.t} />
              <span aria-hidden>{e.mood}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed">{e.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 font-mono text-[12px] text-muted">— tofu 🐰</p>
    </main>
  );
}
