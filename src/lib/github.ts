// Live GitHub data (server-only). Returns null on any failure / missing token —
// callers hide the widget rather than show fake data.
import { SITE } from "@/lib/site";

const GQL = "https://api.github.com/graphql";
const COLS = 30; // weeks shown in the heatmap

type Day = { contributionCount: number };
type Week = { contributionDays: Day[] };
type GraphQLResponse = {
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
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { login, from: from.toISOString(), to: now.toISOString() },
      }),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as GraphQLResponse;
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
