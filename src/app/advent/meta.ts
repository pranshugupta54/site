import type { Metadata } from "next";
import { FEED_LINKS } from "@/lib/feed";
import { OG_SIZE, OG_VERSION } from "@/lib/og/image";
import { doorDate, doorPath } from "@/lib/advent";
import { previewAllowsFuture, type OpenDoor } from "@/lib/advent-server";
import type { LockedView } from "@/lib/advent";

// Metadata for /advent and /advent/<n>. A locked door's tags carry only its teaser;
// its image url says `s=locked`, so the open card gets a fresh url (and a fresh
// scraper fetch) once the door opens.

const TITLE = "tofu's advent calendar";

function meta(title: string, description: string, path: string, og: string, alt: string): Metadata {
  const image = { url: og, ...OG_SIZE, alt };
  return {
    title,
    description,
    alternates: { canonical: path, types: FEED_LINKS },
    openGraph: { title, description, type: "website", url: path, images: [image] },
    twitter: { card: "summary_large_image", title, description, creator: "@pranshgupta54", images: [image] },
  };
}

// previews (dev, preview deploys) draw the card at the previewed time too
const withNow = (q: URLSearchParams, now?: string) => {
  if (now && previewAllowsFuture()) q.set("now", now);
  return `/advent/og?${q}`;
};

export function calendarMeta(nowParam?: string): Metadata {
  return meta(
    TITLE,
    "24 doors, dec 1 to 24. one opens every day. toys, secrets and small things tofu made, on p54.dev.",
    "/advent",
    withNow(new URLSearchParams({ v: OG_VERSION }), nowParam),
    `${TITLE} — p54.dev`
  );
}

export function doorMeta(door: OpenDoor | LockedView, nowParam?: string): Metadata {
  const q = new URLSearchParams({ door: String(door.n), s: door.state, v: OG_VERSION });
  if (door.state === "locked")
    return meta(
      `door ${door.n} · locked · ${TITLE}`,
      `opens ${doorDate(door.n)}. "${door.hint}" no peeking.`,
      doorPath(door.n),
      withNow(q, nowParam),
      `door ${door.n} of ${TITLE}, still locked`
    );
  return meta(`door ${door.n} · ${door.title} · ${TITLE}`, door.tofu, doorPath(door.n), withNow(q, nowParam), `door ${door.n}: ${door.title} — ${TITLE}`);
}
