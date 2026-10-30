// Live GitHub data (server-only). Returns null on any failure / missing token —
// callers hide the widget rather than show fake data.
import { SITE } from "@/lib/site";

const GQL = "https://api.github.com/graphql";
const COLS = 30; // weeks shown in the heatmap

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

export type LastShipped = { repo: string; at: string }; // repo "owner/name", at = ISO

type PublicEvent = {
  type?: unknown;
  public?: unknown;
  created_at?: unknown;
  repo?: { name?: unknown };
};

const restHeaders = (token?: string) => ({
  "User-Agent": "pranshugupta54-portfolio",
  Accept: "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});
const REPO_NAME = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const EVENT_PAGES = 3; // the public events feed caps at 300 events (3 × 100)
const MAX_REPO_CHECKS = 3;

// Most recent public push, from the *public* events feed only. `/users/:u/events`
// (no `/public`) can include private activity when authenticated — never use it.
// Skips: non-public events, anything mentioning traycer (site copy rule), and
// the profile README repo (its pushes are a daily metrics bot, not shipping).
// Each candidate repo is re-checked as public before it's shown.
export async function getLastShipped(login = SITE.handle): Promise<LastShipped | null> {
  const token = process.env.GITHUB_TOKEN;
  const profileRepo = `${login}/${login}`.toLowerCase();
  try {
    for (let page = 1; page <= EVENT_PAGES; page++) {
      const res = await fetch(
        `https://api.github.com/users/${login}/events/public?per_page=100&page=${page}`,
        { headers: restHeaders(token), next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) },
      );
      if (!res.ok) return null;
      const events = (await res.json()) as unknown;
      if (!Array.isArray(events)) return null;

      // the feed is only roughly chronological — sort pushes by time ourselves
      const pushes = (events as PublicEvent[])
        .flatMap((e) => {
          if (e?.type !== "PushEvent" || e.public !== true) return [];
          const repo = e.repo?.name;
          const at = e.created_at;
          if (typeof repo !== "string" || !REPO_NAME.test(repo)) return [];
          if (typeof at !== "string" || Number.isNaN(Date.parse(at))) return [];
          const lower = repo.toLowerCase();
          if (lower.includes("traycer") || lower === profileRepo) return [];
          return [{ repo, at: new Date(at).toISOString() }];
        })
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

      for (const push of pushes.slice(0, MAX_REPO_CHECKS)) {
        const visibility = await getRepoVisibility(push.repo, token);
        if (visibility === "public") return push;
        if (visibility === "error") return null;
      }
      if (pushes.length) return null;
      if (events.length < 100) return null; // last page
    }
    return null;
  } catch {
    return null;
  }
}

// "hidden" covers private, missing (404) and renamed-away repos.
async function getRepoVisibility(
  repo: string,
  token?: string,
): Promise<"public" | "hidden" | "error"> {
  const res = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: restHeaders(token),
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(4000),
  });
  if (res.status === 404) return "hidden";
  if (!res.ok) return "error";
  const json = (await res.json()) as { private?: unknown; visibility?: unknown; full_name?: unknown };
  const isPublic =
    json.private === false &&
    json.visibility === "public" &&
    typeof json.full_name === "string" &&
    json.full_name.toLowerCase() === repo.toLowerCase();
  return isPublic ? "public" : "hidden";
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
