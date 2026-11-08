// Seasonal overlays. Each season switches itself on inside its window, in the
// viewer's local date, and off outside it — no deploy per festival.
//
//   start / end  inclusive. "MM-DD" repeats every year (may wrap past new year);
//                "YYYY-MM-DD" is a one-off, for festivals that move.
//
// The look lives elsewhere, keyed by id:
//   tokens   [data-season="<id>"] in src/app/globals.css (--accent / --mark only)
//   tofu     hats.<id> in src/data/tofu-frames.json (3 chars, sits between the ears)
//
// This file has no imports so the no-flash script and `node --test` can use it as-is.

export type Season = {
  id: string;
  name: string;
  start: string;
  end: string;
  /** joins the hero greeting rotator: "<greeting>, i'm pranshu" */
  greeting?: string;
  /** extra hover quips for tofu */
  quips?: string[];
  /** footer-shell easter eggs: command -> output. Either may depend on the viewer's local now
   *  (read them through seasonCommands). */
  commands?: Commands | ((now: Date) => Commands);
  /** a tiny ascii glyph that drifts across the page once per visit */
  ambient?: string;
  /** ascii snow in the side gutters (wide screens) and a frost line (narrow ones) */
  snow?: boolean;
  /** shell-bar countdown on dec 31 and "happy <year>" on jan 1, in local time */
  newYear?: boolean;
};

export type Commands = Record<string, string | ((now: Date) => string)>;

/** A season's egg commands as of `now`. */
export function seasonCommands(season: { commands?: Season["commands"] } | null | undefined, now: Date): Commands {
  const c = season?.commands;
  return (typeof c === "function" ? c(now) : c) ?? {};
}

const pad2 = (n: number) => (n < 10 ? "0" : "") + n;

/** The year a new-year countdown is counting to: next year, or this one on jan 1. */
export function newYearTarget(now: Date): number {
  return now.getMonth() === 0 && now.getDate() === 1 ? now.getFullYear() : now.getFullYear() + 1;
}

/**
 * Shell-bar new-year state for `now` (local time): a countdown on dec 31, a greeting on jan 1,
 * null otherwise. `msLeft` is 0 once the year has turned.
 */
export function newYearState(now: Date): { label: string; msLeft: number } | null {
  const y = newYearTarget(now);
  if (now.getMonth() === 0 && now.getDate() === 1) return { label: `happy ${y}`, msLeft: 0 };
  if (now.getMonth() !== 11 || now.getDate() !== 31) return null;
  const left = Math.max(0, new Date(y, 0, 1).getTime() - now.getTime());
  const t = Math.ceil(left / 1000);
  const hms = `${pad2(Math.floor(t / 3600))}:${pad2(Math.floor((t % 3600) / 60))}:${pad2(t % 60)}`;
  return { label: `${y} in ${hms}`, msLeft: left };
}

/** Output of the `<year>` shell egg. */
export function countdownText(now: Date): string {
  const y = newYearTarget(now);
  if (now.getMonth() === 0 && now.getDate() === 1) return `happy new year. it's ${y}. tofu made it.`;
  const left = new Date(y, 0, 1).getTime() - now.getTime();
  const days = Math.floor(left / 86_400_000);
  if (days >= 1) return `${y} in ${days} day${days === 1 ? "" : "s"}. pacing myself.`;
  const mins = Math.floor(left / 60_000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m to ${y}. chai in hand.`;
}

export const SEASONS: Season[] = [
  {
    id: "halloween",
    name: "halloween",
    start: "10-26",
    end: "10-31",
    greeting: "Boo",
    quips: [
      "the hat stays. it was a whole thing to get on.",
      "dressed up as a bunny. very convincing, i know.",
      "type 'treat' in the shell. or 'trick', if you must.",
      "spooky season. i've lowered the contrast by 0%.",
    ],
    commands: {
      trick: "tofu swapped your semicolons for greek question marks. kidding. probably.",
      treat: "    ,\n  .-'-.\n ( ^ ^ )   one pumpkin, hand-carved in ascii.\n  '-w-'    no refunds.",
    },
    ambient: "^v^",
  },
  {
    id: "winter",
    name: "winter",
    start: "12-15",
    end: "01-01",
    greeting: "Cheers",
    quips: [
      "chai weather. i've had four. it's 11am.",
      "wrapping up the year. the year is not cooperating.",
      "the beanie is wool. the wool is ascii.",
      "type 'chai' in the shell. or the year in 'help', if you're counting.",
    ],
    snow: true,
    newYear: true,
    commands: (now) => ({
      [String(newYearTarget(now))]: countdownText,
      chai: "   ( (\n    ) )\n  ........\n  |      |]   cutting chai, extra adrak.\n  \\      /    blow on it first.\n   `----'",
    }),
    ambient: "~",
  },
  {
    // moves every year — set next year's dates when they're announced
    id: "diwali",
    name: "diwali",
    start: "2026-11-06",
    end: "2026-11-10",
    greeting: "Shubh Deepavali",
    quips: [
      "lit a diya. it's ascii, so the fire risk is low.",
      "the marigold is a css variable. still counts.",
      "cleaned the whole site for diwali. found three unused imports.",
      "type 'diya' in the shell. bring your own sweets.",
    ],
    commands: {
      diya: "     )\n    (.)\n  \\_____/   a diya, lit.\n   '---'    mind the flame.",
      mithai: "tofu ate the kaju katli. all of it. it was for guests.",
    },
    ambient: "*",
  },
];

export const SEASON_KEY = "season"; // sessionStorage: <id> | "off"

/**
 * Picks the season for `now`. `override` is a season id, "off", or null.
 * Kept dependency-free and ES5-ish: it is stringified into the no-flash script.
 */
export function pickSeason(
  now: Date,
  seasons: { id: string; start: string; end: string }[],
  override: string | null
): string | null {
  if (override === "off") return null;
  for (var i = 0; i < seasons.length; i++) if (seasons[i].id === override) return override;
  var pad = function (n: number) {
    return (n < 10 ? "0" : "") + n;
  };
  var md = pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  var ymd = now.getFullYear() + "-" + md;
  for (var j = 0; j < seasons.length; j++) {
    var s = seasons[j];
    var day = s.start.length > 5 ? ymd : md;
    var hit = s.start <= s.end ? day >= s.start && day <= s.end : day >= s.start || day <= s.end;
    if (hit) return s.id;
  }
  return null;
}

export function getSeason(id: string | null): Season | null {
  return SEASONS.find((s) => s.id === id) ?? null;
}
