import type { CSSProperties, ReactNode } from "react";

// Isometric helpers for the room. World units: x runs along the right-hand
// wall, y along the left-hand wall, z is up. 2:1 isometric, S px per unit.
export const S = 18;
export const ROOM = { X: 12, Y: 10, Z: 8, T: 0.4, F: 0.7 };

const r = (n: number) => Math.round(n * 100) / 100;
export const P = (x: number, y: number, z: number): [number, number] => [r((x - y) * S), r(((x + y) * S) / 2 - z * S)];
export const pts = (...ps: [number, number, number][]) => ps.map((p) => P(...p).join(",")).join(" ");

/** a solid block: top, the face toward +x ("a") and the face toward +y ("b"), shaded from one color */
export function Box({
  x,
  y,
  z,
  w,
  d,
  h,
  c,
  className,
}: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  /** a css color, usually one of the room's --r-* materials */
  c: string;
  className?: string;
}) {
  const X = x + w;
  const Y = y + d;
  const Z = z + h;
  return (
    <g className={`bx ${className ?? ""}`} style={{ "--c": c } as CSSProperties}>
      <polygon className="b" points={pts([x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z])} />
      <polygon className="a" points={pts([X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z])} />
      <polygon className="t" points={pts([x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z])} />
    </g>
  );
}

/**
 * Draw flat things on a wall-like plane in plain 2d: inside, u runs right and v
 * runs down, both in px (u = x·S on a y-plane, u = (Y − y)·S on an x-plane; v = −z·S).
 */
export const onY = (y: number) => `matrix(1 0.5 0 1 ${r(-y * S)} ${r((y * S) / 2)})`;
export function OnY({ y, children, className }: { y: number; children: ReactNode; className?: string }) {
  return (
    <g className={className} transform={onY(y)}>
      {children}
    </g>
  );
}
export function OnX({ x, children, className }: { x: number; children: ReactNode; className?: string }) {
  const { Y } = ROOM;
  return (
    <g className={className} transform={`matrix(1 -0.5 0 1 ${r((x - Y) * S)} ${r(((x + Y) * S) / 2)})`}>
      {children}
    </g>
  );
}
/** u for a y-coordinate on an x-plane */
export const ux = (y: number) => (ROOM.Y - y) * S;
