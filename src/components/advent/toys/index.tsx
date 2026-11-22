import type { ReactNode } from "react";
import type { Door } from "@/data/advent";
import type { DoorTile } from "@/lib/advent-server";
import { ToyLoader } from "./loader";

// Server side of the toys: only an open door's page calls this, so a toy's words (its
// `copy`) reach the browser with that door and no other. The toy's code loads on demand.
export function toyFor(door: Door, ornaments: DoorTile[]): ReactNode {
  if (!door.toy) return null;
  return <ToyLoader id={door.toy} copy={door.copy} ornaments={door.toy === "finale" ? ornaments : undefined} />;
}
