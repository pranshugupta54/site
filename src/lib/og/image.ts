import { SITE } from "@/lib/site";

// /og responses are cached as immutable for a year, keyed by URL. Bump this
// whenever anything the card draws changes (layout, fonts, colors, the SITE
// fields it shows, tofu's idle frame) so scrapers and CDNs fetch a fresh one.
export const OG_VERSION = "1";
export const OG_SIZE = { width: 1200, height: 630 };

// Metadata entry for a share card from the /og route. No title → the home card.
export function shareImage(page?: { title: string; path: string }) {
  const params = new URLSearchParams(page ? { ...page, v: OG_VERSION } : { v: OG_VERSION });
  return {
    url: `/og?${params}`,
    ...OG_SIZE,
    alt: page ? `${page.title} — ${SITE.name}` : `${SITE.name} — ${SITE.role}`,
  };
}
