// tofu's advent calendar (/advent): the date rules, kept pure (no imports) so
// `node --test` can check them as-is and client components can share them.
//
// Every date here is IST (Asia/Kolkata, UTC+05:30, no DST): door n opens at
// 00:00 IST on dec n. The door contents live in src/data/advent.ts and must only
// ever reach the browser through doorView(), which strips a locked door to its teaser.

export const DOORS = 24;
const IST_MS = 5.5 * 3600_000;

/** When door `n` opens: dec n, 00:00 IST. */
export function unlockAt(n: number, year: number): Date {
  return new Date(Date.UTC(year, 11, n) - IST_MS);
}

/** Door `n` is open at `now` (1..24 only). */
export function isOpen(n: number, now: Date, year: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= DOORS && now.getTime() >= unlockAt(n, year).getTime();
}

/** How many doors are open at `now`: 0 before dec 1, 24 from dec 24 on. */
export function openCount(now: Date, year: number): number {
  let c = 0;
  for (let n = 1; n <= DOORS; n++) if (isOpen(n, now, year)) c++;
  return c;
}

/** The home page's advent entry shows from nov 30 00:00 IST until dec 24 ends (dec 25 00:00 IST). */
export function homeEntryVisible(now: Date, year: number): boolean {
  const t = now.getTime();
  return t >= Date.UTC(year, 10, 30) - IST_MS && t < Date.UTC(year, 11, 25) - IST_MS;
}

/** A `/advent/<n>` segment as a door number, or null: only "1".."24", no padding or junk. */
export function parseDoor(raw: string | null | undefined): number | null {
  if (!raw || !/^[1-9]\d?$/.test(raw)) return null;
  const n = Number(raw);
  return n <= DOORS ? n : null;
}

export const doorPath = (n: number) => `/advent/${n}`;

/**
 * The `?now=` preview for advent, as a Date. A time without a zone ("2026-12-05T09:00") is
 * read as IST, so the server and every viewer agree on it. With `allowFuture` false
 * (production), a preview can only look back: anything later than `real` is clamped to
 * `real`, so a crafted link never opens a door early. Missing or unparseable → `real`.
 */
export function previewNow(raw: string | null | undefined, real: Date, allowFuture: boolean): Date {
  if (!raw) return real;
  let s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00:00";
  if (/T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) s += "+05:30";
  const t = Date.parse(s);
  if (Number.isNaN(t)) return real;
  if (!allowFuture && t > real.getTime()) return real;
  return new Date(t);
}

/** "3d 04:12:09" / "04:12:09" until `target`; "00:00:00" once it has passed. */
export function countdown(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(t / 86400);
  const p = (x: number) => (x < 10 ? "0" : "") + x;
  const hms = `${p(Math.floor((t % 86400) / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`;
  return d ? `${d}d ${hms}` : hms;
}

// ─── what a door may show ────────────────────────────────────────────────────

/** The fields every door has; a locked door shows only `n` and `hint`. */
export type DoorBase = { n: number; hint: string };

export type LockedView = { n: number; state: "locked"; hint: string; opensAt: string };
export type OpenView<D extends DoorBase> = D & { state: "open" };

/**
 * A door as it may leave the server at `now`: the whole door once it's open, otherwise
 * only its number, teaser and opening time. Anything rendered for a visitor (pages, share
 * cards, metadata) goes through here.
 */
export function doorView<D extends DoorBase>(door: D, now: Date, year: number): LockedView | OpenView<D> {
  if (isOpen(door.n, now, year)) return { ...door, state: "open" };
  return { n: door.n, state: "locked", hint: door.hint, opensAt: unlockAt(door.n, year).toISOString() };
}

/** "dec 5" for door 5. */
export const doorDate = (n: number) => `dec ${n}`;

/** "opens in 3 days" / "opens in 4h" / "opens in 12m" / "open": coarse, for share cards. */
export function opensIn(n: number, now: Date, year: number): string {
  const ms = unlockAt(n, year).getTime() - now.getTime();
  if (ms <= 0) return "open";
  const h = ms / 3600_000;
  if (h < 1) return `opens in ${Math.max(1, Math.ceil(ms / 60_000))}m`;
  if (h < 24) return `opens in ${Math.ceil(h)}h`;
  return `opens in ${Math.ceil(h / 24)} days`;
}
