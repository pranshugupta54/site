import { Hero } from "@/components/hero";
import { Sections, Connect } from "@/components/sections";
import { GitHubPanel } from "@/components/github-panel";

export const revalidate = 3600; // refresh live GitHub data hourly

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
