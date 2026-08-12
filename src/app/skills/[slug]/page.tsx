import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CopyCommand } from "@/components/copy-command";
import { SkillLinks } from "@/components/skill-links";
import { getSkill, getSkills, INSTALL_CMD } from "@/lib/skills";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 3600; // refresh skill content from GitHub hourly
export const dynamicParams = true; // new skills resolve without a redeploy

export async function generateStaticParams() {
  const skills = await getSkills();
  return skills.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const skill = await getSkill(params.slug);
  if (!skill) return { title: "skill not found" };
  return { title: skill.name, description: skill.description };
}

export default async function SkillPage({ params }: { params: { slug: string } }) {
  const skill = await getSkill(params.slug);
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

      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        <span className="text-muted">/</span> {skill.name}
        <SkillLinks ghHref={skill.href} />
      </h1>
      <p className="mt-3 text-sm text-muted">{skill.description}</p>

      <div className="mt-6">
        <CopyCommand cmd={`${INSTALL_CMD} --skill ${skill.slug}`} />
      </div>

      <article
        className="prose prose-sm mt-10 max-w-none prose-headings:font-display prose-headings:tracking-tight prose-headings:text-fg prose-p:text-fg prose-li:text-fg prose-strong:text-fg prose-a:text-accent prose-blockquote:border-line prose-blockquote:text-muted prose-code:rounded prose-code:bg-card prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:font-normal prose-code:text-fg prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-line prose-pre:bg-card prose-th:text-fg prose-td:text-fg prose-hr:border-line"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
