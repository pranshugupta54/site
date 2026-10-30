// Live competitive-programming ratings (server-only). Each platform resolves to a
// formatted line, or null on any failure / bad shape — callers fall back to the
// static line in SITE rather than show a made-up or partial number.
import { SITE } from "@/lib/site";

const TIMEOUT_MS = 5000; // a slow API must not stall a build or ISR
// LeetCode turns away requests that don't look like a browser.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type CpLive = { codeforces: string | null; leetcode: string | null };

type CfResponse = {
  status?: string;
  result?: { rating?: unknown; maxRating?: unknown; rank?: unknown }[];
};
type LcResponse = {
  data?: {
    userContestRanking?: { rating?: unknown; topPercentage?: unknown } | null;
    userContestRankingHistory?: { attended?: unknown; rating?: unknown }[] | null;
  };
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// Nothing rounds in a flattering direction: ratings floor, percentages ceil.
// "top x%" keeps one decimal (11.64 → 11.7); the epsilon stops float noise
// (0.7 * 10 = 7.000000000000001) from bumping an exact value up a step.
export function topPercent(p: number): string {
  return `top ${Math.ceil(p * 10 - 1e-9) / 10}%`;
}

// "1301 · max 1316", or one number when current is the max.
function currentAndMax(current: number, max: number): string {
  return current === max ? `${current}` : `${current} · max ${max}`;
}

export function formatCodeforces(json: unknown): string | null {
  const res = json as CfResponse | null;
  const u = res?.status === "OK" ? res.result?.[0] : undefined;
  if (!u || !isNum(u.rating) || !isNum(u.maxRating)) return null;
  if (typeof u.rank !== "string" || !u.rank) return null;
  const current = Math.floor(u.rating);
  const max = Math.floor(u.maxRating);
  if (max < current) return null;
  return `${u.rank} · ${currentAndMax(current, max)}`;
}

export function formatLeetcode(json: unknown): string | null {
  const data = (json as LcResponse | null)?.data;
  const r = data?.userContestRanking;
  const history = data?.userContestRankingHistory;
  if (!r || !isNum(r.rating) || !isNum(r.topPercentage)) return null;
  if (r.topPercentage <= 0 || r.topPercentage > 100 || !Array.isArray(history)) return null;
  // max = best rating over contests actually attended
  const attended = history.filter((h) => h?.attended === true).map((h) => h.rating);
  if (!attended.length || !attended.every(isNum)) return null;
  const current = Math.floor(r.rating);
  const max = Math.floor(Math.max(r.rating, ...attended));
  return `${topPercent(r.topPercentage)} · ${currentAndMax(current, max)}`;
}

async function fetchJson(source: string, url: string, init: RequestInit = {}): Promise<unknown> {
  try {
    const res = await fetch(url, {
      ...init,
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[cp] ${source} HTTP`, res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[cp] ${source} failed:`, (err as Error)?.name ?? err);
    return null;
  }
}

export async function getCodeforces(handle = SITE.cpHandle): Promise<string | null> {
  const json = await fetchJson(
    "codeforces",
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
  );
  return formatCodeforces(json);
}

export async function getLeetcode(handle = SITE.cpHandle): Promise<string | null> {
  const query = `query($u:String!){
    userContestRanking(username:$u){ rating topPercentage }
    userContestRankingHistory(username:$u){ attended rating }
  }`;
  const json = await fetchJson("leetcode", "https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com",
      "User-Agent": BROWSER_UA,
    },
    body: JSON.stringify({ query, variables: { u: handle } }),
  });
  return formatLeetcode(json);
}

export async function getCpRatings(): Promise<CpLive> {
  const [codeforces, leetcode] = await Promise.all([getCodeforces(), getLeetcode()]);
  return { codeforces, leetcode };
}
