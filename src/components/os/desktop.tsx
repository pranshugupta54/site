"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { APPS, AppView, DOCK_ORDER, titleOf, type AppCtx } from "./apps";
import type { OsData } from "./data";
import { Dock } from "./dock";
import { FloatingTofu, PerchedTofu, useTofuBrain } from "./desk-tofu";
import { MenuBar } from "./menubar";
import { OsWindow } from "./window";
import { WM_KEY, activeWin, appOf, parseWm, wmReducer, type AppId, type Desk, type Rect, type WmState } from "./wm";

const MENUBAR = 28;

const readDesk = (): Desk => ({ w: window.innerWidth, h: window.innerHeight - MENUBAR });

// first visit: projects, with "about" in front of it
function firstState(desk: Desk): WmState {
  const empty: WmState = { wins: [], order: [] };
  return (["projects", "about"] as AppId[]).reduce((s, kind) => wmReducer(s, { t: "open", kind, desk }), empty);
}

function loadState(desk: Desk): WmState {
  try {
    return parseWm(sessionStorage.getItem(WM_KEY), desk) ?? firstState(desk);
  } catch {
    return firstState(desk);
  }
}

const clickLight = (id: string, k: "close" | "min" | "zoom") =>
  document.querySelector<HTMLButtonElement>(`[data-win="${CSS.escape(id)}"] .os-light[data-k="${k}"]`)?.click();

export function Desktop({ data }: { data: OsData }) {
  const reduce = useReducedMotion() ?? false;
  const [desk, setDesk] = useState<Desk>(readDesk);
  const [state, dispatch] = useReducer(wmReducer, desk, loadState);
  const [focus, setFocus] = useState<{ id: string; n: number }>({ id: "", n: 0 });
  const [snakeOn, setSnakeOn] = useState(false); // the terminal's snake owns Esc while it runs
  const afterClose = useRef<AppId | null>(null);
  const brain = useTofuBrain();
  const placed = useRef(false);

  const active = activeWin(state);
  const deskRef = useRef(desk);
  useEffect(() => {
    deskRef.current = desk;
  }, [desk]);

  // windows last for the tab
  useEffect(() => {
    try {
      sessionStorage.setItem(WM_KEY, JSON.stringify(state));
    } catch {
      /* storage blocked: the desktop just forgets on reload */
    }
  }, [state]);

  // follow the browser window
  useEffect(() => {
    const onResize = () => {
      const d = readDesk();
      setDesk(d);
      dispatch({ t: "fit", desk: d });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // tell tofu where everything is; seat it once, on the frontmost window
  useEffect(() => {
    brain.setWorld(state.wins, desk, reduce);
    if (!placed.current) {
      placed.current = true;
      brain.place(state.order);
    }
  }, [brain, state, desk, reduce]);

  const requestFocus = useCallback((id: string) => setFocus((f) => ({ id, n: f.n + 1 })), []);

  const openApp = useCallback(
    (id: AppId) => {
      dispatch({ t: "open", kind: id, desk: deskRef.current });
      requestFocus(id);
    },
    [requestFocus]
  );
  const openProject = useCallback(
    (name: string) => {
      dispatch({ t: "open", kind: "project", arg: name, desk: deskRef.current, near: "projects" });
      requestFocus(`project:${name}`);
    },
    [requestFocus]
  );
  const onFocusWin = useCallback((id: string) => dispatch({ t: "focus", id }), []);
  const onRect = useCallback((id: string, rect: Partial<Rect>) => dispatch({ t: "rect", id, rect }), []);
  const onZoom = useCallback((id: string) => dispatch({ t: "zoom", id, desk: deskRef.current }), []);
  const onClosed = useCallback((id: string) => {
    afterClose.current = appOf((id.startsWith("project:") ? "project" : id) as AppId);
    dispatch({ t: "close", id });
  }, []);
  const onMinimized = useCallback((id: string) => {
    afterClose.current = appOf((id.startsWith("project:") ? "project" : id) as AppId);
    dispatch({ t: "min", id });
  }, []);
  const dockRect = useCallback((id: string) => {
    const app = appOf((id.startsWith("project:") ? "project" : id) as AppId);
    return document.querySelector(`[data-dock="${app}"]`)?.getBoundingClientRect() ?? null;
  }, []);
  const openTofu = useCallback(() => openApp("tofu"), [openApp]);
  const perch = useCallback(
    (id: string, dragging: boolean) => <PerchedTofu brain={brain} id={id} happy={dragging} onOpen={openTofu} />,
    [brain, openTofu]
  );

  // focus never falls into the void: after a close or minimize, the next window takes it, else the dock
  useEffect(() => {
    const app = afterClose.current;
    if (!app) return;
    afterClose.current = null;
    const win = active && document.querySelector<HTMLElement>(`[data-win="${CSS.escape(active.id)}"]`);
    const target = win ? (win.querySelector<HTMLElement>("[data-autofocus]") ?? win) : document.querySelector<HTMLElement>(`[data-dock="${app}"] .os-dock-item`);
    target?.focus({ preventScroll: true });
  }, [state, active]);

  // Esc closes the frontmost window (menus and the snake get it first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || snakeOn) return;
      const top = activeWin(state);
      if (!top) return;
      e.preventDefault();
      clickLight(top.id, "close");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, snakeOn]);

  const ctxFor = useCallback(
    (id: string, isActive: boolean): AppCtx => ({
      data,
      active: isActive,
      compact: false,
      openApp,
      openProject,
      close: () => clickLight(id, "close"),
      onSnake: setSnakeOn,
    }),
    [data, openApp, openProject]
  );

  const dockApps = useMemo(
    () => DOCK_ORDER.map((id) => ({ id, name: APPS[id].name, running: state.wins.some((w) => appOf(w.kind) === id) })),
    [state.wins]
  );
  const menuWins = state.wins.map((w) => ({ id: w.id, title: titleOf(w.kind, w.arg), min: w.min, active: w.id === active?.id }));

  return (
    <>
      <MenuBar
        appName={active ? (active.kind === "project" ? "projects" : APPS[active.kind].name) : "desktop"}
        wins={menuWins}
        openApp={openApp}
        focusWin={(id) => {
          const w = state.wins.find((x) => x.id === id);
          dispatch(w?.min ? { t: "restore", id } : { t: "focus", id });
          requestFocus(id);
        }}
        minActive={() => active && clickLight(active.id, "min")}
        zoomActive={() => active && clickLight(active.id, "zoom")}
        closeActive={() => active && clickLight(active.id, "close")}
      />
      <div className="os-desk">
        <p className="pointer-events-none absolute bottom-[86px] left-5 hidden font-mono text-[11px] leading-relaxed text-muted lg:block">
          p54 os — drag a window by its title, double-click to zoom, esc to close.
        </p>
        {state.wins.map((w) => (
          <OsWindow
            key={w.id}
            win={w}
            z={state.order.indexOf(w.id)}
            active={w.id === active?.id}
            title={titleOf(w.kind, w.arg)}
            dark={w.kind === "terminal"}
            desk={desk}
            reduce={reduce}
            focusSeq={focus.id === w.id ? focus.n : 0}
            dockRect={dockRect}
            perch={perch}
            onFocus={onFocusWin}
            onRect={onRect}
            onZoom={onZoom}
            onClosed={onClosed}
            onMinimized={onMinimized}
          >
            <AppView kind={w.kind} arg={w.arg} ctx={ctxFor(w.id, w.id === active?.id)} />
          </OsWindow>
        ))}
        <FloatingTofu brain={brain} onOpen={openTofu} />
      </div>
      <Dock apps={dockApps} onOpen={openApp} still={reduce} />
    </>
  );
}
