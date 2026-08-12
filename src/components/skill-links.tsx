import { SKILLS_REPO } from "@/lib/skills";

// Small icon links shown beside a skill title — jump to skills.sh / GitHub.
function Icon({ href, domain, title }: { href: string; domain: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={title}
      className="opacity-50 transition-opacity hover:opacity-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={title}
        loading="lazy"
        className="inline-block h-[14px] w-[14px] rounded-[3px] align-[-2px] grayscale dark:invert"
      />
    </a>
  );
}

export function SkillLinks({ ghHref }: { ghHref: string }) {
  return (
    <span className="ml-2 inline-flex items-center gap-2 align-[1px]">
      <Icon
        href={`https://skills.sh/${SKILLS_REPO}`}
        domain="skills.sh"
        title="view on skills.sh"
      />
      <Icon href={ghHref} domain="github.com" title="view source on GitHub" />
    </span>
  );
}
