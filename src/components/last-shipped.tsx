import { getLastShipped } from "@/lib/github";
import { RelativeTime } from "@/components/local-time";

// Async server component. Hidden entirely when there's no eligible public push
// (API failure, odd data, nothing recent) — never shows fake data.
export async function LastShipped() {
  const last = await getLastShipped();
  if (!last) return null;

  return (
    <p
      className="mt-10 font-mono text-[12px] text-muted"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      last commit <RelativeTime iso={last.at} /> <span className="select-none text-line">·</span>{" "}
      <a
        href={`https://github.com/${last.repo}`}
        target="_blank"
        rel="noreferrer"
        className="transition-colors hover:text-accent"
      >
        {last.repo.toLowerCase()}
      </a>
    </p>
  );
}
