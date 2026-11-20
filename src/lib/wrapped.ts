// /wrapped's numbers and slides, from plain data. Pure, no imports, so
// `node --test` loads it as-is; src/lib/wrapped-data.ts feeds it live data.
// A slide whose data is missing is left out — live or hidden, never fake.

export type Day = { date: string; count: number }; // date: YYYY-MM-DD

export type Viz =
  | { kind: "heatmap"; levels: number[]; pad: number }
  | { kind: "bars"; labels: string[]; values: number[]; hi: number }
  | { kind: "streak"; days: number }
  | { kind: "grid"; cells: { value: string; label: string }[] }
  | { kind: "read"; title: string; source: string; url: string; take: string };

export type Slide = {
  id: string;
  kicker: string;
  /** the big thing. A number counts up when `num` is set */
  value: string;
  num?: number;
  unit?: string;
  line?: string;
  tofu: string;
  viz?: Viz;
};

/** every slide id, in order. Deep links (/wrapped/<id>) and share cards key on these */
export const SLIDE_IDS = [
  "intro",
  "contributions",
  "busiest-day",
  "busiest-month",
  "streak",
  "language",
  "stars",
  "hertz",
  "site",
  "read",
  "outro",
] as const;
export type SlideId = (typeof SLIDE_IDS)[number];

/** the intro lives at /wrapped, every other slide at /wrapped/<id> */
export const slidePath = (id: string) => (id === "intro" ? "/wrapped" : `/wrapped/${id}`);

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const utc = (date: string) => new Date(`${date}T00:00:00Z`);
/** "2026-09-29" → "sep 29" */
export const shortDay = (date: string) => `${MONTHS[utc(date).getUTCMonth()].slice(0, 3)} ${utc(date).getUTCDate()}`;
export const weekday = (date: string) => WEEKDAYS[utc(date).getUTCDay()];
const n = (v: number) => v.toLocaleString("en-US");
const plural = (v: number, one: string, many = `${one}s`) => `${n(v)} ${v === 1 ? one : many}`;

/** The viewer-independent date in `tz`, as numbers. */
function zoned(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Until dec 1 the year isn't over: "2026 so far". From then on, "2026, wrapped". */
export function yearLabel(year: number, now: Date, tz: string): { soFar: boolean; label: string; title: string } {
  const { y, m } = zoned(now, tz);
  const soFar = y < year || (y === year && m < 12);
  return {
    soFar,
    label: soFar ? `${year} so far` : `${year}, wrapped`,
    title: soFar ? `pranshu's ${year} so far` : `pranshu's ${year}, wrapped`,
  };
}

export type CalendarStats = {
  total: number;
  days: number;
  busiestDay: Day | null;
  months: number[];
  busiestMonth: number; // 0-11, -1 when every month is empty
  streak: { days: number; start: string; end: string } | null;
  levels: number[]; // one per day, 0-4
  pad: number; // weekday of the first day (0 = sunday), to line up the weeks
};

/** Totals, peaks and the longest run of days with contributions, from one year's calendar. */
export function calendarStats(input: Day[]): CalendarStats {
  const days = [...input].sort((a, b) => a.date.localeCompare(b.date));
  const months = Array<number>(12).fill(0);
  let total = 0;
  let busiestDay: Day | null = null;
  let best: CalendarStats["streak"] = null;
  let run = 0;
  let runStart = "";
  for (const d of days) {
    total += d.count;
    months[utc(d.date).getUTCMonth()] += d.count;
    // ties go to the earlier day
    if (d.count > 0 && (!busiestDay || d.count > busiestDay.count)) busiestDay = d;
    if (d.count > 0) {
      if (run === 0) runStart = d.date;
      run++;
      if (!best || run > best.days) best = { days: run, start: runStart, end: d.date };
    } else run = 0;
  }
  const peak = Math.max(...months);
  const max = Math.max(1, ...days.map((d) => d.count));
  // same buckets as the home page graph
  const level = (c: number) => (c <= 0 ? 0 : c / max < 0.25 ? 1 : c / max < 0.5 ? 2 : c / max < 0.75 ? 3 : 4);
  return {
    total,
    days: days.length,
    busiestDay,
    months,
    busiestMonth: peak > 0 ? months.indexOf(peak) : -1,
    streak: best,
    levels: days.map((d) => level(d.count)),
    pad: days.length ? utc(days[0].date).getUTCDay() : 0,
  };
}

export type LangRepo = { language: string | null; pushedAt: string };

/** The language most of his repos touched this year were written in — only with a clear winner. */
export function topLanguage(repos: LangRepo[], year: number): { name: string; repos: number; of: number; rows: { label: string; value: number }[] } | null {
  const touched = repos.filter((r) => r.pushedAt.startsWith(`${year}-`) && r.language);
  const counts = new Map<string, number>();
  for (const r of touched) counts.set(r.language!, (counts.get(r.language!) ?? 0) + 1);
  const rows = [...counts].map(([label, value]) => ({ label: label.toLowerCase(), value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (!rows.length || rows[0].value < 2 || rows[1]?.value === rows[0].value) return null;
  return { name: rows[0].label, repos: rows[0].value, of: touched.length, rows: rows.slice(0, 5) };
}

type SeasonLike = { name: string; start: string; end: string };

/**
 * Seasons the site wore in `year` by `now`: occurrences starting that year whose
 * window overlaps [since, now]. "MM-DD" repeats yearly; "YYYY-MM-DD" is a one-off.
 */
export function seasonsWorn(seasons: SeasonLike[], year: number, now: Date, since?: string): string[] {
  const today = now.toISOString().slice(0, 10);
  const from = since && since > `${year}-01-01` ? since : `${year}-01-01`;
  const full = (s: string, y: number) => (s.length === 5 ? `${y}-${s}` : s);
  return seasons
    .filter((s) => {
      const start = full(s.start, year);
      if (!start.startsWith(`${year}-`)) return false;
      let end = full(s.end, year);
      if (end < start) end = full(s.end, year + 1); // wraps past new year
      return start <= today && end >= from;
    })
    .map((s) => s.name);
}

export type WrappedInput = {
  year: number;
  title: string; // "pranshu's 2026 so far"
  label: string; // "2026 so far"
  soFar: boolean;
  calendar: Day[] | null;
  repos: LangRepo[] | null;
  stars: { name: string; stars: number; blurb: string } | null;
  hertz: { releases: number; latest: string | null } | null;
  site: {
    prs: number | null;
    versions: { version: string; name: string }[];
    seasons: string[];
    worklog: number;
    reads: number;
    notes: number;
  };
  read: { title: string; source: string; url: string; take: string; why: string } | null;
};

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, s.lastIndexOf(" ", max)).replace(/[,.;:]$/, "")}…`);

/** The story, in order. Slides without data are dropped; intro and outro always stay. */
export function buildSlides(w: WrappedInput): Slide[] {
  const out: Slide[] = [];
  const cal = w.calendar?.length ? calendarStats(w.calendar) : null;

  out.push({
    id: "intro",
    kicker: "~/wrapped",
    value: String(w.year),
    unit: w.soFar ? "so far" : "wrapped",
    line: `${w.title}, counted by the bunny who runs his site. tap or press → to go on.`,
    tofu: "i read his commit log so you don't have to.",
  });

  if (cal && cal.total > 0) {
    const perDay = cal.total / Math.max(1, cal.days);
    out.push({
      id: "contributions",
      kicker: "# contributions",
      value: n(cal.total),
      num: cal.total,
      unit: "contributions on github",
      line: `every square is a day of ${w.label}.`,
      tofu: `that's ${perDay >= 10 ? Math.round(perDay) : perDay.toFixed(1).replace(/\.0$/, "")} a day. i checked twice.`,
      viz: { kind: "heatmap", levels: cal.levels, pad: cal.pad },
    });
    if (cal.busiestDay) {
      const d = cal.busiestDay;
      out.push({
        id: "busiest-day",
        kicker: "# busiest day",
        value: shortDay(d.date),
        unit: `${plural(d.count, "contribution")} in one day`,
        line: `a ${weekday(d.date)}. nothing on the calendar explains it.`,
        tofu: "i don't ask. i just count.",
      });
    }
    if (cal.busiestMonth >= 0) {
      const m = cal.busiestMonth;
      out.push({
        id: "busiest-month",
        kicker: "# busiest month",
        value: MONTHS[m],
        unit: plural(cal.months[m], "contribution"),
        line: `${Math.round((cal.months[m] / cal.total) * 100)}% of the year${w.soFar ? " so far" : ""}, in one month.`,
        tofu: "the other months know what they did.",
        viz: { kind: "bars", labels: MONTHS.map((x) => x[0]), values: cal.months, hi: m },
      });
    }
    if (cal.streak && cal.streak.days > 1) {
      const s = cal.streak;
      out.push({
        id: "streak",
        kicker: "# longest streak",
        value: n(s.days),
        num: s.days,
        unit: "days in a row",
        line: `${shortDay(s.start)} → ${shortDay(s.end)}. not one day off.`,
        tofu: "then he rested. briefly.",
        viz: { kind: "streak", days: s.days },
      });
    }
  }

  const lang = w.repos ? topLanguage(w.repos, w.year) : null;
  if (lang) {
    out.push({
      id: "language",
      kicker: "# top language",
      value: lang.name,
      unit: `${lang.repos} of the ${plural(lang.of, "repo")} he pushed to`,
      tofu: "i'd have picked ascii. nobody asked.",
      viz: { kind: "grid", cells: lang.rows.map((r) => ({ value: String(r.value), label: r.label })) },
    });
  }

  if (w.stars && w.stars.stars > 0) {
    out.push({
      id: "stars",
      kicker: "# most stars",
      value: `★ ${n(w.stars.stars)}`,
      num: w.stars.stars,
      unit: `stars on ${w.stars.name}`,
      line: `${w.stars.blurb}. still the one people star.`,
      tofu: "every star is someone clicking on purpose.",
    });
  }

  if (w.hertz && w.hertz.releases > 0) {
    out.push({
      id: "hertz",
      kicker: "# hertz",
      value: n(w.hertz.releases),
      num: w.hertz.releases,
      unit: `${w.hertz.releases === 1 ? "release" : "releases"} of hertz`,
      line: `his macos menu-bar monitor${w.hertz.latest ? `, now at ${w.hertz.latest}` : ""}.`,
      tofu: "brew upgrade hertz. you know the drill.",
    });
  }

  const s = w.site;
  const cells = [
    s.versions.length ? { value: String(s.versions.length), label: s.versions.length === 1 ? "new version" : "new versions" } : null,
    s.seasons.length ? { value: String(s.seasons.length), label: s.seasons.length === 1 ? "festival worn" : "festivals worn" } : null,
    s.worklog ? { value: n(s.worklog), label: "worklog entries" } : null,
    s.reads ? { value: n(s.reads), label: "reading picks" } : null,
    s.notes ? { value: n(s.notes), label: s.notes === 1 ? "note" : "notes" } : null,
  ].filter((c): c is { value: string; label: string } => c !== null);
  if (s.prs || cells.length) {
    const named = s.versions.map((v) => `v${v.version}, ${v.name}`).join(" · ");
    out.push({
      id: "site",
      kicker: "# the site itself",
      value: s.prs ? n(s.prs) : "p54.dev",
      num: s.prs ?? undefined,
      unit: s.prs ? "pull requests merged into this site" : "kept busy",
      line: [named, s.seasons.join(", ")].filter(Boolean).join(" · ") || undefined,
      tofu: "i opened most of those. he merged them. teamwork.",
      viz: cells.length ? { kind: "grid", cells } : undefined,
    });
  }

  if (w.read) {
    out.push({
      id: "read",
      kicker: "# tofu's favorite read",
      value: w.read.title.toLowerCase(),
      unit: w.read.source,
      tofu: w.read.why,
      viz: { kind: "read", title: w.read.title, source: w.read.source, url: w.read.url, take: clip(w.read.take, 200) },
    });
  }

  out.push({
    id: "outro",
    kicker: "~/wrapped --done",
    value: w.soFar ? "so far, so good" : `that was ${w.year}`,
    line: w.soFar ? `the rest of ${w.year} is still being typed. come back in december.` : `see you in ${w.year + 1}. same bunny, more commits.`,
    tofu: "share it. i worked hard on the counting.",
  });

  return out;
}
