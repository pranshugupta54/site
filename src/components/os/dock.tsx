"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { AppIcon, type IconId } from "./icons";
import type { AppId } from "./wm";

const BASE = 46;
const PEAK = 66;
const RANGE = 150;

export type DockApp = { id: AppId; name: string; running: boolean };

function useMagnify(mouseX: MotionValue<number>, ref: React.RefObject<HTMLElement | null>, still: boolean) {
  const dist = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || x === Infinity) return RANGE;
    return x - (r.left + r.width / 2);
  });
  const target = useTransform(dist, (d) => (still ? BASE : BASE + (PEAK - BASE) * Math.max(0, 1 - (d / RANGE) ** 2)));
  return useSpring(target, { mass: 0.1, stiffness: 170, damping: 14 });
}

function Item({
  id,
  label,
  running,
  mouseX,
  still,
  onOpen,
  href,
}: {
  id: IconId;
  label: string;
  running?: boolean;
  mouseX: MotionValue<number>;
  still: boolean;
  onOpen?: () => void;
  href?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useMagnify(mouseX, ref, still);
  const icon = (
    <>
      <span className="os-tip">{label}</span>
      <motion.span style={{ width: size, height: size }} className="block">
        <ScaledIcon id={id} size={size} />
      </motion.span>
      {running ? <span className="os-dock-dot" aria-hidden /> : null}
    </>
  );
  return (
    <motion.div ref={ref} data-dock={id} className="relative flex flex-col items-center">
      {href ? (
        <Link href={href} className="os-dock-item" aria-label={label}>
          {icon}
        </Link>
      ) : (
        <button
          type="button"
          className="os-dock-item"
          aria-label={running ? `${label} (open)` : label}
          onClick={onOpen}
        >
          {icon}
        </button>
      )}
    </motion.div>
  );
}

// the icon draws at BASE and scales with the magnified box
function ScaledIcon({ id, size }: { id: IconId; size: MotionValue<number> }) {
  const scale = useTransform(size, (s) => s / BASE);
  return (
    <motion.span className="block origin-top-left" style={{ width: BASE, height: BASE, scale }}>
      <AppIcon id={id} size={BASE} />
    </motion.span>
  );
}

export function Dock({ apps, onOpen, still }: { apps: DockApp[]; onOpen: (id: AppId) => void; still: boolean }) {
  const mouseX = useMotionValue(Infinity);
  const [instant, setInstant] = useState(false);
  return (
    <div className="os-dock-wrap">
      <nav
        aria-label="dock"
        className="os-dock"
        data-instant={instant || undefined}
        onMouseMove={(e) => {
          mouseX.set(e.clientX);
          if (!instant) setInstant(true); // after the first tooltip, the rest show at once
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity);
          setInstant(false);
        }}
      >
        {apps.map((a) => (
          <Item key={a.id} id={a.id} label={a.name} running={a.running} mouseX={mouseX} still={still} onOpen={() => onOpen(a.id)} />
        ))}
        <span className="os-dock-sep" aria-hidden />
        <Item id="home" label="back to p54.dev" href="/" mouseX={mouseX} still={still} />
      </nav>
    </div>
  );
}
