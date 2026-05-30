// Live WakaTime data (server-only). Returns null on any failure / missing key —
// callers hide the widget rather than show fake data.

export type WakaLang = { name: string; percent: number };
export type Wakatime = {
  languages: WakaLang[];
  weekText: string; // human-readable total for last 7 days
  dailyAvg: string;
  allTime: string | null;
};

type StatsResponse = {
  data?: {
    languages?: { name: string; percent: number }[];
    human_readable_total?: string;
    human_readable_daily_average?: string;
  };
};
type AllTimeResponse = { data?: { text?: string } };

export async function getWakatime(): Promise<Wakatime | null> {
  const key = process.env.WAKATIME_API_KEY;
  if (!key) return null;
  const auth = "Basic " + Buffer.from(key).toString("base64");

  try {
    const res = await fetch(
      "https://wakatime.com/api/v1/users/current/stats/last_7_days",
      { headers: { Authorization: auth }, next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as StatsResponse;
    const d = json.data;
    if (!d) return null;

    const languages: WakaLang[] = (d.languages ?? [])
      .slice(0, 5)
      .map((l) => ({ name: l.name, percent: l.percent }));

    let allTime: string | null = null;
    try {
      const r2 = await fetch(
        "https://wakatime.com/api/v1/users/current/all_time_since_today",
        { headers: { Authorization: auth }, next: { revalidate: 86400 } }
      );
      if (r2.ok) {
        const j2 = (await r2.json()) as AllTimeResponse;
        allTime = j2.data?.text ?? null;
      }
    } catch {
      /* all-time is optional */
    }

    if (languages.length === 0 && !d.human_readable_total) return null;

    return {
      languages,
      weekText: d.human_readable_total ?? "",
      dailyAvg: d.human_readable_daily_average ?? "",
      allTime,
    };
  } catch {
    return null;
  }
}
