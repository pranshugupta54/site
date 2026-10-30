import Link from "next/link";

export const metadata = { title: "not found" };

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <p className="font-mono text-[13px] text-muted">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        nothing here.
      </h1>
      <p className="mt-3 text-sm text-muted">
        tofu checked under the couch. this page doesn&apos;t exist, or it moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← home
      </Link>
    </main>
  );
}
