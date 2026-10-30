import Link from "next/link";
import { LostTofu, LostPath } from "@/components/lost-tofu";

export const metadata = { title: "not found" };

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <LostTofu />
      <p className="mt-8 flex gap-x-2 font-mono text-[13px] text-muted">
        <span className="shrink-0">404</span>
        <LostPath />
      </p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        i&apos;m lost too, and i built this place.
      </h1>
      <p className="mt-3 text-sm text-muted">
        checked twice. had a coffee. still nothing here. probably my fault.
      </p>
      <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2 font-mono text-[13px] text-muted">
        <Link href="/" className="transition-colors hover:text-accent">
          ← home
        </Link>
        {/* keyboard-only: typing anywhere opens the footer shell */}
        <span className="hidden sm:inline">
          or type <span className="text-fg">snake</span>. i won&apos;t tell.
        </span>
      </div>
    </main>
  );
}
