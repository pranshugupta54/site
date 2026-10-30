// Live GitHub data (server-only). Returns null on any failure / missing token —
// callers hide the widget rather than show fake data.
import { unstable_cache } from "next/cache";
import { SITE } from "@/lib/site";
import { groupPulls, nextLink, tooOld, type RawPull, type SitePulls } from "@/lib/pulls";

const GQL = "https://api.github.com/graphql";
const COLS = 30; // weeks shown in the heatmap
const SITE_REPO = `${SITE.handle}/site`;
const PULLS_API = `https://api.github.com/repos/${SITE_REPO}/pulls`;
const PULLS_TIMEOUT_MS = 4000; // one deadline across every page of a refresh
const OPEN_PAGES = 3; // × 100 open PRs

type Day = { contributionCount: number };
type Week = { contributionDays: Day[] };
type GraphQLResponse = {
  errors?: { message: string }[];
  data?: {
    user?: {
      followers?: { totalCount?: number };
      contributionsCollection?: {
        contributionCalendar?: { totalContributions?: number; weeks?: Week[] };
      };
    };
  };
};

export type Github = {
  levels: number[]; // length 7*COLS, row-major (row 0..6, col 0..COLS-1)
  cols: number;
  totalContributions: number;
  followers: number;
  streak: number;
};

// Live star count for a repo ("owner/name"). Returns null on failure.
export async function getRepoStars(repo: string): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        "User-Agent": "pranshugupta54-portfolio",
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { stargazers_count?: number };
    return typeof json.stargazers_count === "number" ? json.stargazers_count : null;
  } catch {
    return null;
  }
}

// Live count of a user's own public repos (forks excluded). Returns null on failure.
export async function getOwnRepoCount(login = SITE.handle): Promise<number | null> {
  const token = process.env.GITHUB_TOKEN;
  try {
    let count = 0;
    for (let page = 1; page <= 10; page++) {
      const res = await fetch(
        `https://api.github.com/users/${login}/repos?type=owner&per_page=100&page=${page}`,
        {
          headers: {
            "User-Agent": "pranshugupta54-portfolio",
            Accept: "application/vnd.github+json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          next: { revalidate: 3600 },
        },
      );
      if (!res.ok) return null;
      const repos = (await res.json()) as { fork?: boolean }[];
      if (!Array.isArray(repos)) return null;
      count += repos.filter((r) => r.fork === false).length;
      if (repos.length < 100) return count;
    }
    return null;
  } catch {
    return null;
  }
}

// Tofu's PRs on the site repo, grouped (see pulls.ts). Every open PR (up to
// OPEN_PAGES pages, else it throws rather than undercount) plus a sample of the
// 30 most recently updated closed ones — enough to find this week's merges.
// Requests skip the fetch cache and share one AbortSignal deadline; that signal
// is honored here, unlike on Next's stale fetch-cache refresh, which drops it.
// Stamped with `fetchedAt` on success; throws on any failure.
async function fetchSitePulls(): Promise<SitePulls & { fetchedAt: number }> {
  const token = process.env.GITHUB_TOKEN;
  const signal = AbortSignal.timeout(PULLS_TIMEOUT_MS);
  const page = async (url: string) => {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "pranshugupta54-portfolio",
        Accept: "application/vnd.github+json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) throw new Error("expected a list");
    return { rows: rows as RawPull[], next: nextLink(res.headers.get("link")) };
  };
  const allOpen = async () => {
    const rows: RawPull[] = [];
    let url: string | null = `${PULLS_API}?state=open&per_page=100`;
    for (let n = 0; url; n++) {
      if (n === OPEN_PAGES) throw new Error(`more than ${OPEN_PAGES} pages of open PRs`);
      const p = await page(url);
      rows.push(...p.rows);
      url = p.next;
    }
    return rows;
  };
  const [open, closed] = await Promise.all([
    allOpen(),
    page(`${PULLS_API}?state=closed&sort=updated&direction=desc&per_page=30`).then((p) => p.rows),
  ]);
  const now = Date.now();
  return { ...groupPulls([...open, ...closed], { repo: SITE_REPO, owner: SITE.handle, now }), fetchedAt: now };
}

// Caches the grouped result (a few hundred bytes), not the raw REST payloads.
// A throw is never stored: a cold miss rethrows, and a failed refresh keeps
// the last good value — so a GitHub hiccup can't pin an empty block for an hour.
// Each caller passes its own `revalidate` — /log hourly, /api/pulls every 5 min.
// They don't share an entry: the key includes the cached fn's compiled source,
// which differs between the minified page and route bundles.
const cachedSitePulls = (revalidate: number) =>
  unstable_cache(fetchSitePulls, ["site-pulls"], { revalidate });

// Null on a cold failure (no snapshot yet) or once the last good snapshot is
// older than PULLS_MAX_AGE_MS — callers hide the block. Otherwise a failed
// refresh returns the last good snapshot.
export async function getSitePulls({ revalidate = 3600 } = {}): Promise<SitePulls | null> {
  try {
    const pulls = await cachedSitePulls(revalidate)();
    if (tooOld(pulls.fetchedAt, Date.now())) throw new Error("last good snapshot is over 24h old");
    return pulls;
  } catch (e) {
    console.error("[github] site pulls:", (e as Error).message);
    return null;
  }
}

export async function getGithub(login = SITE.handle): Promise<Github | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - COLS * 7 + 1);

  const query = `query($login:String!,$from:DateTime!,$to:DateTime!){
    user(login:$login){
      followers{ totalCount }
      contributionsCollection(from:$from,to:$to){
        contributionCalendar{ totalContributions weeks{ contributionDays{ contributionCount } } }
      }
    }
  }`;

  try {
    const res = await fetch(GQL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // GitHub rejects requests without a User-Agent (403) — required.
        "User-Agent": "pranshugupta54-portfolio",
      },
      body: JSON.stringify({
        query,
        variables: { login, from: from.toISOString(), to: now.toISOString() },
      }),
    });
    if (!res.ok) {
      console.error("[github] HTTP", res.status, await res.text().catch(() => ""));
      return null;
    }

    const json = (await res.json()) as GraphQLResponse;
    if (json.errors?.length) {
      console.error("[github] graphql error:", json.errors[0]?.message);
      return null;
    }
    const user = json.data?.user;
    const cal = user?.contributionsCollection?.contributionCalendar;
    if (!user || !cal) return null;

    const weeks = (cal.weeks ?? []).slice(-COLS);
    const allDays = weeks.flatMap((w) => w.contributionDays);
    const max = Math.max(1, ...allDays.map((d) => d.contributionCount));
    const toLevel = (c: number) => {
      if (c <= 0) return 0;
      const r = c / max;
      return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4;
    };

    const levels: number[] = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < COLS; col++) {
        const day = weeks[col]?.contributionDays[row];
        levels.push(day ? toLevel(day.contributionCount) : 0);
      }
    }

    // streak: consecutive days with contributions, counting back from the most
    // recent day (today doesn't break the streak if it's just not started yet)
    let streak = 0;
    let i = allDays.length - 1;
    if (allDays[i] && allDays[i].contributionCount === 0) i -= 1;
    for (; i >= 0; i--) {
      if (allDays[i].contributionCount > 0) streak++;
      else break;
    }

    return {
      levels,
      cols: COLS,
      totalContributions: cal.totalContributions ?? allDays.reduce((s, d) => s + d.contributionCount, 0),
      followers: user.followers?.totalCount ?? 0,
      streak,
    };
  } catch {
    return null;
  }
}
