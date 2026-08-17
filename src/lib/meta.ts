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
    openGraph: { title, description, type: "website", url: path },
    twitter: { card: "summary_large_image", title, description, creator: "@pranshgupta54" },
  };
}
