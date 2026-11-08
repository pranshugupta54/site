"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SIZES, clampRect, type Desk, type Rect, type Win } from "./wm";

const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const GENIE = "cubic-bezier(0.32, 0.72, 0, 1)";

export type WindowProps = {
  win: Win;
  z: number;
  active: boolean;
  title: string;
  dark?: boolean;
  desk: Desk;
  reduce: boolean;
  /** bumps when the desktop wants this window to take keyboard focus */
  focusSeq: number;
  /** where the window flies to when minimized */
  dockRect: (id: string) => DOMRect | null;
  perch?: (id: string, dragging: boolean) => ReactNode;
  onFocus: (id: string) => void;
  onRect: (id: string, rect: Partial<Rect>) => void;
  onZoom: (id: string) => void;
  onClosed: (id: string) => void;
  onMinimized: (id: string) => void;
  children: ReactNode;
};

/** keyframe toward (or from) the dock icon: translate to its center, shrink, fade */
function dockFrame(el: HTMLElement, dock: DOMRect | null): Keyframe {
  if (!dock) return { opacity: 0, transform: "translateY(24px) scale(0.6)" };
  const r = el.getBoundingClientRect();
  const dx = dock.left + dock.width / 2 - (r.left + r.width / 2);
  const dy = dock.top + dock.height / 2 - (r.top + r.height / 2);
  const s = Math.max(0.06, dock.width / r.width);
  return { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${s})` };
}

function WindowImpl({
  win,
  z,
  active,
  title,
  dark,
  desk,
  reduce,
  focusSeq,
  dockRect,
  perch,
  onFocus,
  onRect,
  onZoom,
  onClosed,
  onMinimized,
  children,
}: WindowProps) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [zooming, setZooming] = useState(false);
  const leaving = useRef(false);
  const wasMin = useRef(win.min);

  // open: a short settle-in (never from nothing)
  useLayoutEffect(() => {
    if (reduce || win.min) return;
    frame.current?.animate(
      [{ opacity: 0, transform: "scale(0.965) translateY(6px)" }, { opacity: 1, transform: "none" }],
      { duration: 190, easing: EASE }
    );
    // mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // restore from the dock: play the minimize in reverse
  useLayoutEffect(() => {
    const was = wasMin.current;
    wasMin.current = win.min;
    if (!was || win.min || reduce || !frame.current) return;
    frame.current.animate([dockFrame(frame.current, dockRect(win.id)), { opacity: 1, transform: "none" }], {
      duration: 300,
      easing: GENIE,
    });
  }, [win.min, win.id, reduce, dockRect]);

  useEffect(() => {
    if (!focusSeq || win.min) return;
    const el = ref.current;
    const target = el?.querySelector<HTMLElement>("[data-autofocus]") ?? el;
    target?.focus({ preventScroll: true });
  }, [focusSeq, win.min]);

  const close = () => {
    if (leaving.current) return;
    leaving.current = true;
    const f = frame.current;
    if (reduce || !f) return onClosed(win.id);
    f.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.97)" }], {
      duration: 130,
      easing: "ease-out",
      fill: "forwards",
    }).onfinish = () => onClosed(win.id);
  };

  const minimize = () => {
    const f = frame.current;
    if (reduce || !f) return onMinimized(win.id);
    f.animate([{ opacity: 1, transform: "none" }, dockFrame(f, dockRect(win.id))], {
      duration: 320,
      easing: GENIE,
      fill: "forwards",
    }).onfinish = (e) => {
      onMinimized(win.id);
      // the animation holds the shrunk frame until the window hides; drop it after
      requestAnimationFrame(() => (e.target as Animation | null)?.cancel());
    };
  };

  const zoom = () => {
    if (!reduce) {
      setZooming(true);
      setTimeout(() => setZooming(false), 260);
    }
    onZoom(win.id);
  };

  // ── drag by the title bar ──
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean; id: number } | null>(null);
  const onTitleDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    if (win.max) return;
    drag.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y, moved: false, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onTitleMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !ref.current) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    const r = clampRect({ x: d.x + dx, y: d.y + dy, w: win.w, h: win.h }, desk);
    ref.current.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
  };
  const onTitleUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) return;
    setDragging(false);
    const r = clampRect({ x: d.x + e.clientX - d.px, y: d.y + e.clientY - d.py, w: win.w, h: win.h }, desk);
    onRect(win.id, { x: r.x, y: r.y });
  };

  // ── resize from the corner ──
  const size = useRef<{ px: number; py: number; w: number; h: number; id: number } | null>(null);
  const min = SIZES[win.kind];
  const sized = (e: React.PointerEvent, s: NonNullable<typeof size.current>) => ({
    w: Math.round(Math.max(min.minW, Math.min(desk.w - win.x, s.w + e.clientX - s.px))),
    h: Math.round(Math.max(min.minH, Math.min(desk.h - win.y, s.h + e.clientY - s.py))),
  });
  const onSizeDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    size.current = { px: e.clientX, py: e.clientY, w: win.w, h: win.h, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onSizeMove = (e: React.PointerEvent) => {
    const s = size.current;
    if (!s || s.id !== e.pointerId || !ref.current) return;
    const { w, h } = sized(e, s);
    ref.current.style.width = `${w}px`;
    ref.current.style.height = `${h}px`;
  };
  const onSizeUp = (e: React.PointerEvent) => {
    const s = size.current;
    if (!s || s.id !== e.pointerId) return;
    size.current = null;
    onRect(win.id, sized(e, s));
  };

  return (
    <section
      ref={ref}
      role="dialog"
      aria-label={title}
      tabIndex={-1}
      hidden={win.min}
      data-active={active || undefined}
      data-max={win.max || undefined}
      data-zooming={zooming || undefined}
      data-win={win.id}
      className="os-win"
      style={{ transform: `translate3d(${win.x}px, ${win.y}px, 0)`, width: win.w, height: win.h, zIndex: 10 + z }}
      onPointerDownCapture={() => !active && onFocus(win.id)}
      onFocusCapture={() => !active && onFocus(win.id)}
    >
      <div ref={frame} className="os-frame">
        <div
          className="os-titlebar"
          data-dark={dark || undefined}
          onPointerDown={onTitleDown}
          onPointerMove={onTitleMove}
          onPointerUp={onTitleUp}
          onPointerCancel={onTitleUp}
          onDoubleClick={(e) => !(e.target as HTMLElement).closest("button") && zoom()}
        >
          <div className="os-lights">
            <button type="button" className="os-light" data-k="close" aria-label={`close ${title}`} onClick={close}>
              ×
            </button>
            <button type="button" className="os-light" data-k="min" aria-label={`minimize ${title}`} onClick={minimize}>
              −
            </button>
            <button
              type="button"
              className="os-light"
              data-k="zoom"
              aria-label={win.max ? `restore ${title}` : `zoom ${title}`}
              onClick={zoom}
            >
              +
            </button>
          </div>
          <span className="os-title">{title}</span>
        </div>
        <div className="os-body" data-dark={dark || undefined}>
          {children}
        </div>
      </div>
      {!win.max && (
        <span
          aria-hidden
          className="os-resize"
          onPointerDown={onSizeDown}
          onPointerMove={onSizeMove}
          onPointerUp={onSizeUp}
          onPointerCancel={onSizeUp}
        />
      )}
      {perch?.(win.id, dragging)}
    </section>
  );
}

export const OsWindow = memo(WindowImpl);
