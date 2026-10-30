import type { Metadata } from "next";
import { FEED_LINKS } from "@/lib/feed";
import { shareImage } from "@/lib/og/image";

// Per-page metadata with matching OpenGraph/Twitter tags. Next.js does NOT
// cascade a page's `title` into og:/twitter: tags — without these, link
// previews fall back to the root layout's site-wide values.
export function pageMeta(title: string, description: string, path: string): Metadata {
  // each page points at its own card from the /og route
  const image = shareImage({ title, path });
  return {
    title,
    description,
    // a page's `alternates` replaces the layout's wholesale, so repeat the feeds
    alternates: { canonical: path, types: FEED_LINKS },
    openGraph: { title, description, type: "website", url: path, images: [image] },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@pranshgupta54",
      images: [image],
    },
  };
}
