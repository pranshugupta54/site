// p54 os window manager: plain state + a reducer, persisted per tab.
// No React in here, so the rules stay easy to read (and to test).

export const APP_IDS = ["projects", "terminal", "notes", "reading", "tofu", "about"] as const;
export type AppId = (typeof APP_IDS)[number];
/** an app's own window, or a project's detail window */
export type WinKind = AppId | "project";

export type Rect = { x: number; y: number; w: number; h: number };
export type Win = Rect & {
  id: string;
  kind: WinKind;
  /** the project name, for kind "project" */
  arg?: string;
  min: boolean;
  max: boolean;
  /** the rect to go back to after a zoom */
  prev?: Rect;
};
/** wins in creation order (stable DOM order); order = z-order ids, bottom → top */
export type WmState = { wins: Win[]; order: string[] };
/** the space windows live in: below the menu bar, dock included */
export type Desk = { w: number; h: number };

export const DOCK_SPACE = 84; // what a zoomed window leaves for the dock
const MARGIN = 10;

type Size = { w: number; h: number; minW: number; minH: number };
export const SIZES: Record<WinKind, Size> = {
  projects: { w: 720, h: 470, minW: 420, minH: 300 },
  terminal: { w: 640, h: 400, minW: 380, minH: 220 },
  notes: { w: 800, h: 560, minW: 460, minH: 320 },
  reading: { w: 560, h: 580, minW: 360, minH: 300 },
  tofu: { w: 540, h: 600, minW: 360, minH: 320 },
  about: { w: 400, h: 580, minW: 340, minH: 380 },
  project: { w: 460, h: 520, minW: 340, minH: 300 },
};

// where each app likes to open, as fractions of the desk
const SPOTS: Record<WinKind, [number, number]> = {
  about: [0.1, 0.1],
  projects: [0.4, 0.15],
  terminal: [0.3, 0.42],
  notes: [0.22, 0.08],
  reading: [0.55, 0.06],
  tofu: [0.62, 0.12],
  project: [0.5, 0.25],
};

export const winId = (kind: WinKind, arg?: string) => (kind === "project" ? `project:${arg}` : kind);

/** keep a window grabbable: its title bar stays on the desk, and some of it stays in view */
export function clampRect(r: Rect, desk: Desk): Rect {
  const w = Math.min(r.w, desk.w);
  const h = Math.min(r.h, desk.h);
  const x = Math.max(80 - w, Math.min(desk.w - 80, r.x));
  const y = Math.max(0, Math.min(desk.h - 40, r.y));
  return { x, y, w, h };
}

function fitSize(kind: WinKind, desk: Desk) {
  const s = SIZES[kind];
  return {
    w: Math.max(Math.min(s.w, desk.w - MARGIN * 2), Math.min(s.minW, desk.w)),
    h: Math.max(Math.min(s.h, desk.h - DOCK_SPACE - MARGIN), Math.min(s.minH, desk.h)),
  };
}

function placeFor(state: WmState, kind: WinKind, desk: Desk, near?: Rect): Rect {
  const { w, h } = fitSize(kind, desk);
  let x: number;
  let y: number;
  if (near) {
    x = near.x + 36;
    y = near.y + 30;
  } else {
    const [fx, fy] = SPOTS[kind];
    x = Math.round(Math.min(fx * desk.w, desk.w - w - MARGIN));
    y = Math.round(Math.min(fy * desk.h, desk.h - DOCK_SPACE - h));
  }
  // cascade off any window already sitting right there
  for (let i = 0; i < 12 && state.wins.some((o) => Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 14); i++) {
    x += 26;
    y += 24;
  }
  if (x + w > desk.w - MARGIN) x = Math.max(MARGIN, desk.w - w - MARGIN);
  if (y + h > desk.h - DOCK_SPACE) y = Math.max(MARGIN, desk.h - DOCK_SPACE - h);
  return { x: Math.max(MARGIN, x), y: Math.max(MARGIN, y), w, h };
}

const raise = (order: string[], id: string) => [...order.filter((o) => o !== id), id];

export type WmAction =
  | { t: "open"; kind: WinKind; arg?: string; desk: Desk; near?: string }
  | { t: "focus"; id: string }
  | { t: "close"; id: string }
  | { t: "min"; id: string }
  | { t: "restore"; id: string }
  | { t: "rect"; id: string; rect: Partial<Rect> }
  | { t: "zoom"; id: string; desk: Desk }
  | { t: "fit"; desk: Desk };

export function wmReducer(state: WmState, a: WmAction): WmState {
  switch (a.t) {
    case "open": {
      const id = winId(a.kind, a.arg);
      const have = state.wins.find((w) => w.id === id);
      if (have) {
        const wins = have.min ? state.wins.map((w) => (w.id === id ? { ...w, min: false } : w)) : state.wins;
        return { wins, order: raise(state.order, id) };
      }
      const near = a.near ? state.wins.find((w) => w.id === a.near) : undefined;
      const rect = placeFor(state, a.kind, a.desk, near && !near.min ? near : undefined);
      const win: Win = { id, kind: a.kind, arg: a.arg, ...rect, min: false, max: false };
      return { wins: [...state.wins, win], order: [...state.order, id] };
    }
    case "focus":
      if (state.order[state.order.length - 1] === a.id) return state;
      return { ...state, order: raise(state.order, a.id) };
    case "close":
      return { wins: state.wins.filter((w) => w.id !== a.id), order: state.order.filter((o) => o !== a.id) };
    case "min":
      return { ...state, wins: state.wins.map((w) => (w.id === a.id ? { ...w, min: true } : w)) };
    case "restore":
      return {
        wins: state.wins.map((w) => (w.id === a.id ? { ...w, min: false } : w)),
        order: raise(state.order, a.id),
      };
    case "rect":
      return {
        ...state,
        wins: state.wins.map((w) => (w.id === a.id ? { ...w, ...a.rect, max: false, prev: undefined } : w)),
      };
    case "zoom":
      return {
        wins: state.wins.map((w) => {
          if (w.id !== a.id) return w;
          if (w.max && w.prev) return { ...w, ...clampRect(w.prev, a.desk), max: false, prev: undefined };
          const prev = { x: w.x, y: w.y, w: w.w, h: w.h };
          return { ...w, x: 0, y: 0, w: a.desk.w, h: a.desk.h - DOCK_SPACE + 8, max: true, prev };
        }),
        order: raise(state.order, a.id),
      };
    case "fit":
      // after a resize of the browser: zoomed windows follow it, the rest stay reachable
      return {
        ...state,
        wins: state.wins.map((w) =>
          w.max ? { ...w, w: a.desk.w, h: a.desk.h - DOCK_SPACE + 8 } : { ...w, ...clampRect(w, a.desk) }
        ),
      };
  }
}

/** the window that has focus: topmost one that isn't minimized */
export function activeWin(state: WmState): Win | null {
  for (let i = state.order.length - 1; i >= 0; i--) {
    const w = state.wins.find((x) => x.id === state.order[i]);
    if (w && !w.min) return w;
  }
  return null;
}

/** the app a window belongs to (a project detail belongs to projects) */
export const appOf = (kind: WinKind): AppId => (kind === "project" ? "projects" : kind);

// ── persistence (sessionStorage: open windows last for the tab) ──

export const WM_KEY = "p54os:wm:v1";

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const KINDS: string[] = [...APP_IDS, "project"];

/** a stored state, or null if it's missing or doesn't look right */
export function parseWm(raw: string | null, desk: Desk): WmState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { wins?: unknown; order?: unknown };
    if (!Array.isArray(v.wins) || !Array.isArray(v.order)) return null;
    const wins: Win[] = [];
    for (const w of v.wins as Record<string, unknown>[]) {
      if (!w || typeof w.id !== "string" || typeof w.kind !== "string" || !KINDS.includes(w.kind)) continue;
      if (![w.x, w.y, w.w, w.h].every(num)) continue;
      const kind = w.kind as WinKind;
      const arg = typeof w.arg === "string" ? w.arg : undefined;
      if (kind === "project" && !arg) continue;
      if (w.id !== winId(kind, arg) || wins.some((o) => o.id === w.id)) continue;
      const s = SIZES[kind];
      const rect = clampRect(
        { x: w.x as number, y: w.y as number, w: Math.max(s.minW, w.w as number), h: Math.max(s.minH, w.h as number) },
        desk
      );
      const p = w.prev as Record<string, unknown> | undefined;
      const prev = p && [p.x, p.y, p.w, p.h].every(num) ? clampRect(p as Rect, desk) : undefined;
      if (w.max === true && prev)
        wins.push({ id: w.id, kind, arg, x: 0, y: 0, w: desk.w, h: desk.h - DOCK_SPACE + 8, min: w.min === true, max: true, prev });
      else wins.push({ id: w.id, kind, arg, ...rect, min: w.min === true, max: false });
    }
    const ids = new Set(wins.map((w) => w.id));
    const order = (v.order as unknown[]).filter((o): o is string => typeof o === "string" && ids.has(o));
    for (const w of wins) if (!order.includes(w.id)) order.push(w.id);
    return { wins, order };
  } catch {
    return null;
  }
}
