import { getSitePulls } from "@/lib/github";
import { isEmpty, type PullState, type SitePull } from "@/lib/pulls";
import { SITE } from "@/lib/site";

// Async server component: tofu's live PRs on the site repo, titles only.
// Hidden when there's nothing to show or on a cold fetch failure; after that,
// a failed refresh keeps the last good snapshot until one succeeds.
const MARK: Record<PullState, string> = {
  drafting: "border border-muted",
  "in review": "border border-accent",
  merged: "bg-accent",
};

const LINK = "transition-colors hover:text-accent";

export async function TofuAtWork() {
  const pulls = await getSitePulls();
  if (!pulls || isEmpty(pulls)) return null;
  const groups = [pulls.drafting, pulls.review, pulls.merged].filter((g) => g.length > 0);

  return (
    <section aria-labelledby="tofu-at-work" className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="tofu-at-work"
          className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
        >
          tofu at work
        </h2>
        <a
          href={`https://github.com/${SITE.handle}/site/pulls`}
          target="_blank"
          rel="noreferrer"
          className={`font-mono text-[11px] text-muted ${LINK}`}
        >
          all prs ↗
        </a>
      </div>
      <dl className="mt-2.5 space-y-2 sm:space-y-1.5">
        {groups.map((g) => (
          <div key={g[0].state} className="sm:grid sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-x-3">
            <dt className="mb-0.5 whitespace-nowrap font-mono text-[11px] text-muted sm:mb-0 sm:pt-px">
              {g[0].state}
            </dt>
            <dd>
              <ul>
                {g.map((p) => (
                  <Pull key={p.number} pull={p} />
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Pull({ pull }: { pull: SitePull }) {
  return (
    <li className="py-px">
      <a
        href={pull.url}
        target="_blank"
        rel="noreferrer"
        title={pull.title}
        className={`flex items-center gap-2 text-sm text-muted ${LINK}`}
      >
        <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${MARK[pull.state]}`} />
        <span className="truncate">{pull.title}</span>
      </a>
    </li>
  );
}
