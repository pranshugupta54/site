// TODO: wire GITHUB_TOKEN env var to get live contribution data.
// The component works fully without this route — it falls back to static SITE.stats.
//
// Usage: GET /api/github
// Returns: { contributions: number[] }  (array of 210 integers, 30 cols × 7 rows, 0-4 intensity)

import { NextResponse } from "next/server";
import { SITE } from "@/lib/site";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

// Weeks of contribution data to fetch (≥30 to fill our 30-column grid)
const WEEKS = 30;

interface ContribDay {
  contributionCount: number;
  date: string;
}
interface ContribWeek {
  contributionDays: ContribDay[];
}
interface GHResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: ContribWeek[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

function toLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio < 0.1) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.65) return 3;
  return 4;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    // Graceful fallback — return a predictable seeded set so the component
    // can still render without a flash of empty cells.
    return NextResponse.json({ contributions: null }, { status: 200 });
  }

  try {
    const query = `
      query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `;

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - WEEKS * 7);

    const res = await fetch(GITHUB_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          login: SITE.handle,
          from: from.toISOString(),
          to: now.toISOString(),
        },
      }),
      // revalidate every 6 hours
      next: { revalidate: 21600 },
    } as RequestInit & { next?: { revalidate: number } });

    if (!res.ok) throw new Error(`GitHub API ${res.status}`);

    const json: GHResponse = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);

    const weeks =
      json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];

    // Build a flat array: 7 rows × up to 30 cols.
    // GitHub returns weeks as columns; rows are days-of-week (0=Sun … 6=Sat).
    const slice = weeks.slice(-WEEKS);
    const counts: number[] = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < WEEKS; col++) {
        const day = slice[col]?.contributionDays[row];
        counts.push(day?.contributionCount ?? 0);
      }
    }

    const max = Math.max(...counts, 1);
    const contributions = counts.map((c) => toLevel(c, max));

    return NextResponse.json({ contributions }, { status: 200 });
  } catch (err) {
    console.error("[/api/github]", err);
    return NextResponse.json({ contributions: null, error: "fetch failed" }, { status: 200 });
  }
}
