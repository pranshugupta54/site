import { Hero } from "@/components/hero";
import { Sections, Connect } from "@/components/sections";
import { GitHubPanel } from "@/components/github-panel";
import { CodingRhythm } from "@/components/coding-rhythm";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-[600px] px-6 py-14 sm:py-20">
      <Hero />
      <Sections />
      <GitHubPanel />
      <CodingRhythm />
      <Connect />
    </main>
  );
}
