import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { FEED_LINKS } from "@/lib/feed";

// Per-page metadata with matching OpenGraph/Twitter tags. Next.js does NOT
// cascade a page's `title` into og:/twitter: tags — without these, link
// previews fall back to the root layout's site-wide values.
export function pageMeta(title: string, description: string, path: string): Metadata {
  // file-convention og images don't cascade to nested routes — each page
  // points at its own card from the /og route instead
  const image = {
    url: `/og?${new URLSearchParams({ title, path })}`,
    width: 1200,
    height: 630,
    alt: `${title} — ${SITE.name}`,
  };
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
