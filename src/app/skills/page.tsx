import Link from "next/link";
import { CopyCommand } from "@/components/copy-command";
import { SkillLinks } from "@/components/skill-links";
import { getSkills, INSTALL_CMD, SKILLS_REPO } from "@/lib/skills";
import { pageMeta } from "@/lib/meta";

export const revalidate = 3600; // refresh skill list from GitHub hourly

export const metadata = pageMeta(
  "skills",
  "Agent skills for coding agents — keeping codebases clean when agents do the writing.",
  "/skills"
);

const BTN =
  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 font-mono text-[12px] transition-colors hover:border-accent hover:text-accent";

export default async function SkillsPage() {
  const skills = await getSkills();
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-16 sm:py-24">
      <Link
        href="/"
        className="font-mono text-[13px] text-muted transition-colors hover:text-accent"
      >
        ← back
      </Link>

      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        <span className="text-muted">/</span> skills
      </h1>
      <p className="mt-3 text-sm text-muted">
        Agent skills for coding agents — Claude Code, Cursor, Codex, anything
        that reads a <code className="font-mono text-[12px]">SKILL.md</code>.
        Focused on keeping codebases clean when agents do the writing.
      </p>

      <div className="mt-8">
        <CopyCommand cmd={INSTALL_CMD} />
        <div className="mt-2 flex gap-2">
          <a
            href={`https://skills.sh/${SKILLS_REPO}`}
            target="_blank"
            rel="noreferrer"
            className={BTN}
          >
            ▲ skills.sh
          </a>
          <a
            href={`https://github.com/${SKILLS_REPO}`}
            target="_blank"
            rel="noreferrer"
            className={BTN}
          >
            GitHub ↗
          </a>
        </div>
      </div>

      <ul className="mt-14 space-y-12">
        {skills.map((s) => (
          <li key={s.name}>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              <span className="text-muted">/</span>{" "}
              <Link href={`/skills/${s.slug}`} className="transition-colors hover:text-accent">
                {s.name}
              </Link>{" "}
              <Link
                href={`/skills/${s.slug}`}
                className="font-mono text-xs text-muted transition-colors hover:text-accent"
              >
                →
              </Link>
              <SkillLinks ghHref={s.href} />
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
            <div className="mt-4">
              <CopyCommand cmd={`${INSTALL_CMD} --skill ${s.slug}`} />
            </div>
          </li>
        ))}
      </ul>

      {skills.length === 0 ? (
        <p className="mt-14 font-mono text-[12px] text-muted">
          skill list unavailable right now — see{" "}
          <a
            href={`https://github.com/${SKILLS_REPO}`}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-accent"
          >
            github.com/{SKILLS_REPO}
          </a>
        </p>
      ) : null}
    </main>
  );
}
