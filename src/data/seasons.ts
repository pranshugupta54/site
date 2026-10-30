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
  /** footer-shell easter eggs: command -> output */
  commands?: Record<string, string>;
  /** a tiny ascii glyph that drifts across the page once per visit */
  ambient?: string;
};

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
