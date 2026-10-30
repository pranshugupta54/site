import { Hero } from "@/components/hero";
import { Sections, Connect } from "@/components/sections";
import { GitHubPanel } from "@/components/github-panel";
import { FEED_LINKS } from "@/lib/feed";

export const revalidate = 3600; // refresh live GitHub data hourly

// replaces the layout's `alternates` wholesale, so repeat the feeds
export const metadata = { alternates: { canonical: "/", types: FEED_LINKS } };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[600px] px-6 py-14 sm:py-20">
      <Hero />
      <Sections />
      <GitHubPanel />
      <Connect />
    </main>
  );
}
