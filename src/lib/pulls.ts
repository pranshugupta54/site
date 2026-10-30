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

const time = (v: unknown) => (typeof v === "string" ? Date.parse(v) : NaN);

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

  for (const p of raw) {
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
