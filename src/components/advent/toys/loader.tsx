"use client";

import dynamic from "next/dynamic";
import type { DoorTile } from "@/lib/advent-server";

// Loads one toy on demand, in the browser only (toys are random and timed). Each toy is
// its own chunk and none is in a page's initial payload; the words a toy says arrive as
// `copy` from the server, with the open door, never inside the toy's code.

const wait = () => <div className="adv-toy adv-toy-wait" aria-hidden />;
const TOYS = {
  pet: dynamic(() => import("./pet"), { ssr: false, loading: wait }),
  catch: dynamic(() => import("./catch"), { ssr: false, loading: wait }),
  forest: dynamic(() => import("./forest"), { ssr: false, loading: wait }),
  globe: dynamic(() => import("./globe"), { ssr: false, loading: wait }),
  maze: dynamic(() => import("./maze"), { ssr: false, loading: wait }),
  fortune: dynamic(() => import("./fortune"), { ssr: false, loading: wait }),
  lights: dynamic(() => import("./lights"), { ssr: false, loading: wait }),
  finale: dynamic(() => import("./finale"), { ssr: false, loading: wait }),
} as const;

export type ToyName = keyof typeof TOYS;

export function ToyLoader({ id, copy, ornaments }: { id: ToyName; copy?: string[]; ornaments?: DoorTile[] }) {
  const Toy = TOYS[id] as React.ComponentType<{ copy?: string[]; ornaments?: DoorTile[] }>;
  return <Toy copy={copy} ornaments={ornaments} />;
}
