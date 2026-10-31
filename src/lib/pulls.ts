// Groups the site repo's pull requests into what tofu is working on. Pure and
// import-free so `node --test` can load it directly; the fetch lives in github.ts.

// the slice of GitHub's REST pull object this reads
export type RawPull = {
  number?: unknown;
  title?: unknown;
  draft?: unknown;
  state?: unknown;
  merged_at?: unknown;
  updated_at?: unknown;
  user?: { login?: unknown } | null;
};

export type PullState = "drafting" | "in review" | "merged";
export type SitePull = { number: number; title: string; url: string; state: PullState };

export type SitePulls = {
  drafting: SitePull[];
  review: SitePull[];
  merged: SitePull[];
  open: number; // drafting + in review, before the per-group cap
};

export const MERGED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const GROUP_CAP = 5;
// a last good snapshot older than this hides rather than shows — the block must
// never claim a PR is open days after it merged
export const PULLS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Whether a snapshot stamped `fetchedAt` (epoch ms) is too old to show at `now`;
// a missing or invalid stamp counts as too old.
export const tooOld = (fetchedAt: unknown, now: number) =>
  typeof fetchedAt !== "number" || !Number.isFinite(fetchedAt) || now - fetchedAt > PULLS_MAX_AGE_MS;

const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);

// GitHub's `Link` header → its rel="next" URL, followed only while it stays on
// api.github.com (the request carries the token).
export function nextLink(header: string | null): string | null {
  const next = header?.split(",").map((part) => /<([^>]+)>\s*;\s*rel="next"/.exec(part)?.[1]).find(Boolean);
  return next?.startsWith("https://api.github.com/") ? next : null;
}

// The open and closed lists are separate requests, so a PR that changed state
// in between can arrive twice. Keep one record per number: the merged one if
// either is (a merge is final), else the most recently updated.
function dedupe(raw: RawPull[]): RawPull[] {
  const merged = (p: RawPull) => typeof p.merged_at === "string";
  const byNumber = new Map<unknown, RawPull>();
  for (const p of raw) {
    const prev = byNumber.get(p.number);
    const wins =
      !prev ||
      (merged(p) !== merged(prev)
        ? merged(p)
        : (time(p.updated_at) || 0) > (time(prev.updated_at) || 0));
    if (wins) byNumber.set(p.number, p);
  }
  return [...byNumber.values()];
}

// Draft → drafting, open → in review, merged in the last 7 days → merged
// (newest first); closed-unmerged PRs are dropped. Only the owner's own PRs
// count, so a stranger's PR title never renders on the site, and any title
// mentioning traycer is skipped outright.
export function groupPulls(
  raw: RawPull[],
  { repo, owner, now }: { repo: string; owner: string; now: number }
): SitePulls {
  const drafting: (SitePull & { at: number })[] = [];
  const review: (SitePull & { at: number })[] = [];
  const merged: (SitePull & { at: number })[] = [];

  const valid = raw.filter((p) => typeof p.number === "number" && typeof p.title === "string");
  for (const p of dedupe(valid)) {
    if (typeof p.number !== "number" || typeof p.title !== "string") continue;
    if (p.user?.login !== owner) continue;
    const title = p.title.trim();
    if (!title || /traycer/i.test(title)) continue;
    const base = { number: p.number, title, url: `https://github.com/${repo}/pull/${p.number}` };

    if (p.state === "open") {
      const at = time(p.updated_at) || 0;
      if (p.draft === true) drafting.push({ ...base, state: "drafting", at });
      else review.push({ ...base, state: "in review", at });
    } else {
      const at = time(p.merged_at);
      if (!Number.isNaN(at) && at <= now && now - at <= MERGED_WINDOW_MS) merged.push({ ...base, state: "merged", at });
    }
  }

  const top = (list: (SitePull & { at: number })[]) =>
    list
      .sort((a, b) => b.at - a.at || b.number - a.number)
      .slice(0, GROUP_CAP)
      .map(({ number, title, url, state }) => ({ number, title, url, state }));

  return {
    drafting: top(drafting),
    review: top(review),
    merged: top(merged),
    open: drafting.length + review.length,
  };
}

export const isEmpty = (p: SitePulls) => !p.drafting.length && !p.review.length && !p.merged.length;
