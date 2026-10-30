import { SITE } from "@/lib/site";
import quipsByTime from "@/data/quips-by-time.json";

// Tofu keeps Pranshu's clock (SITE.timezone), not the visitor's. The mood only
// nudges behavior — sleep sooner, hop less, an occasional coffee or yawn — and
// adds a time-matched layer on top of the regular quip pool.
// Call the clock helpers from effects only: the hour differs server vs client.

export type Mood = "night" | "morning" | "day" | "evening";

// a pose is a short frame sequence: [frame key in tofu-frames.json, ms on screen]
export type Pose = [frame: string, ms: number][];

export const POSES = {
  coffee: [["coffee", 900], ["sip", 1100], ["coffee", 800]],
  yawn: [["yawn", 300], ["stretch", 1000], ["yawn", 250], ["blink", 180]],
  slowBlink: [["drowsy", 600], ["blink", 500], ["drowsy", 500]],
} satisfies Record<string, Pose>;

export type MoodTraits = {
  sleepAfterMs: number; // no interaction for this long → dozes off
  restScale: number; // multiplies the pause between hops
  startAsleep: boolean; // already napping when the page loads
  bedtimeYawn: boolean; // yawns right before dozing off
  pose: keyof typeof POSES | null; // idle-time quirk
  poseChance: number; // per idle micro tick (~1s)
};

const AWAKE: MoodTraits = {
  sleepAfterMs: 40000,
  restScale: 1,
  startAsleep: false,
  bedtimeYawn: false,
  pose: null,
  poseChance: 0,
};

export const MOOD_TRAITS: Record<Mood, MoodTraits> = {
  night: { ...AWAKE, sleepAfterMs: 12000, restScale: 2, startAsleep: true, bedtimeYawn: true, pose: "slowBlink", poseChance: 0.1 },
  morning: { ...AWAKE, pose: "coffee", poseChance: 0.05 },
  day: AWAKE,
  evening: { ...AWAKE, sleepAfterMs: 22000, bedtimeYawn: true, pose: "yawn", poseChance: 0.05 },
};

// 00–06 night · 07–10 morning · 11–21 day · 22–23 evening
export function moodAt(hour: number): Mood {
  if (hour < 7) return "night";
  if (hour < 11) return "morning";
  if (hour >= 22) return "evening";
  return "day";
}

let fmt: Intl.DateTimeFormat | null = null;

export function hourIn(now: Date = new Date()): number {
  fmt ??= new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, hour: "numeric", hourCycle: "h23" });
  return Number(fmt.formatToParts(now).find((p) => p.type === "hour")?.value ?? 12);
}

export const moodNow = (now?: Date) => moodAt(hourIn(now));

const TIMED = quipsByTime as Partial<Record<Mood, string[]>>;
const TIMED_ODDS = 1 / 3;

// a time-matched quip some of the time, else null → caller uses the regular pool
export function timedQuip(mood: Mood, last: string | null, rand: () => number = Math.random): string | null {
  const pool = (TIMED[mood] ?? []).filter((q) => q !== last);
  if (!pool.length || rand() >= TIMED_ODDS) return null;
  return pool[Math.floor(rand() * pool.length)];
}
