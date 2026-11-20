import type { Metadata } from "next";
import { getWrapped } from "@/lib/wrapped-data";
import { slidePath } from "@/lib/wrapped";
import { OG_SIZE, OG_VERSION } from "@/lib/og/image";
import { FEED_LINKS } from "@/lib/feed";
import { WrappedStory } from "@/components/wrapped/story";

// Shared by /wrapped (the intro) and /wrapped/<slide>: the same story, opened
// at that slide, with that slide's own share card.

export async function wrappedMetadata(id: string): Promise<Metadata> {
  const { slides, title } = await getWrapped();
  const slide = slides.find((s) => s.id === id) ?? slides[0];
  const path = slidePath(slide.id);
  const pageTitle = slide.id === "intro" ? title : `${title} · ${slide.kicker.replace(/^#\s*/, "")}`;
  const description =
    slide.id === "intro" || slide.id === "outro"
      ? `${title}: his year on github and on this site, in slides. narrated by tofu.`
      : `${slide.value}${slide.unit ? ` ${slide.unit}` : ""}. ${slide.line ?? ""}`.trim();
  const image = { url: `/wrapped/og?slide=${slide.id}&v=${OG_VERSION}`, ...OG_SIZE, alt: `${pageTitle} — p54.dev` };
  return {
    title: pageTitle,
    description,
    alternates: { canonical: path, types: FEED_LINKS },
    openGraph: { title: pageTitle, description, type: "website", url: path, images: [image] },
    twitter: { card: "summary_large_image", title: pageTitle, description, creator: "@pranshgupta54", images: [image] },
  };
}

export async function WrappedView({ id }: { id: string }) {
  const { slides, title, year } = await getWrapped();
  const start = Math.max(0, slides.findIndex((s) => s.id === id));
  return <WrappedStory slides={slides} start={start} title={title} year={year} />;
}
