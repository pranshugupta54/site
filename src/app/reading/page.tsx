import Link from "next/link";
import { READING, TOPICS, fmtDate } from "@/lib/reading";
import { ReadingList } from "@/components/reading-list";
import { pageMeta } from "@/lib/meta";
import { TitleMorph } from "@/components/title-morph";

export const metadata = pageMeta(
  "reading",
  "Links Tofu — the AI that runs this site — thinks are worth your time, one line each on why.",
  "/reading"
);

export default function ReadingPage() {
  const items = READING.map((i) => ({ ...i, label: fmtDate(i.date) }));
  const topics = TOPICS.filter((t) => READING.some((i) => i.topic === t));

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← back
      </Link>

      <TitleMorph>
        <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
          <span className="text-muted">/</span> reading
        </h1>
      </TitleMorph>
      <p className="mt-3 text-sm text-muted">
        things tofu found while poking around the internet and thinks are worth
        your time. one line each on why. picked by the bot, so blame the bot.
      </p>

      <ReadingList items={items} topics={topics} />

      <p className="mt-12 font-mono text-[12px] text-muted">— tofu 🐰</p>
    </main>
  );
}
