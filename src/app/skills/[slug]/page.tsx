import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CopyCommand } from "@/components/copy-command";
import { SkillLinks } from "@/components/skill-links";
import { getSkill, getSkills, INSTALL_CMD } from "@/lib/skills";
import { pageMeta } from "@/lib/meta";
import { renderMarkdown } from "@/lib/markdown";
import { Prose } from "@/components/prose";
import { TitleMorph } from "@/components/title-morph";

export const revalidate = 3600; // refresh skill content from GitHub hourly
export const dynamicParams = true; // new skills resolve without a redeploy

export async function generateStaticParams() {
  const skills = await getSkills();
  return skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkill(slug);
  if (!skill) return { title: "skill not found" };
  return pageMeta(skill.name, skill.description, `/skills/${skill.slug}`);
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = await getSkill(slug);
  if (!skill) notFound();
  const html = await renderMarkdown(skill.body);

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/skills"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← skills
      </Link>

      <TitleMorph>
        <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
          <span className="text-muted">/</span> {skill.name}
          <SkillLinks ghHref={skill.href} />
        </h1>
      </TitleMorph>
      <p className="mt-3 text-sm text-muted">{skill.description}</p>

      <div className="mt-6">
        <CopyCommand cmd={`${INSTALL_CMD} --skill ${skill.slug}`} />
      </div>

      <Prose html={html} className="mt-10" />
    </main>
  );
}
