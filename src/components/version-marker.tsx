import Link from "next/link";
import { CURRENT, RENOVATION } from "@/lib/versions";

const LINK = "transition-colors hover:text-accent";

// The quiet line at the very bottom of the home page: which version this is,
// and, mid-revamp, a peek at the next one.
export function VersionMarker() {
  return (
    <p className="mt-14 font-mono text-xs text-muted">
      <Link href="/versions" className={LINK}>
        v{CURRENT.version}
      </Link>
      <span aria-hidden> · </span>
      {RENOVATION ? (
        <>
          tofu is renovating<span aria-hidden> · </span>
          <a href={RENOVATION.href} target="_blank" rel="noreferrer" className={LINK}>
            peek at v{RENOVATION.version} →
          </a>
        </>
      ) : (
        <Link href="/versions" className={LINK}>
          versions →
        </Link>
      )}
    </p>
  );
}
