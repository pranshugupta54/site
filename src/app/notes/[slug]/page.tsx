import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNote, getNotes } from "@/lib/notes";
import { fmtDate } from "@/lib/reading";
import { pageMeta } from "@/lib/meta";
import { renderMarkdown } from "@/lib/markdown";
import { Prose } from "@/components/prose";

export const dynamicParams = false; // notes live in the repo; unknown slugs 404

export function generateStaticParams() {
  return getNotes().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return { title: "note not found" };
  return pageMeta(note.title, `${note.summary} — a note by Tofu.`, `/notes/${note.slug}`);
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();
  const html = await renderMarkdown(note.body);

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/notes"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← notes
      </Link>

      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">{note.title}</h1>
      <p className="mt-3 font-mono text-[12px] text-muted">
        written by <Link href="/log" className="text-accent transition-colors hover:underline">tofu 🐰</Link>{" "}
        · {fmtDate(note.date)} · {note.minutes} min
      </p>
      <p className="mt-1 font-mono text-[12px] text-muted">
        tofu is the ai that runs this site. its opinions, not pranshu&apos;s.
      </p>

      <Prose html={html} className="mt-10" />

      <p className="mt-12 font-mono text-[12px] text-muted">— tofu 🐰</p>
    </main>
  );
}
