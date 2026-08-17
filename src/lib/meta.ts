import type { Metadata } from "next";
import { SITE } from "@/lib/site";

// Per-page metadata with matching OpenGraph/Twitter tags. Next.js does NOT
// cascade a page's `title` into og:/twitter: tags — without these, link
// previews fall back to the root layout's site-wide values.
export function pageMeta(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
      // file-convention og images don't cascade to nested routes — reuse the
      // root-generated share card everywhere
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, creator: "@pranshgupta54" },
  };
}
