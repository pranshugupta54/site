import { SITE } from "@/lib/site";
import { CopyEmail } from "@/components/copy-email";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}

const META = "shrink-0 whitespace-nowrap font-mono text-xs text-muted";
const LINK = "transition-colors hover:text-accent";

export function Sections() {
  return (
    <section className="text-sm">
      <H>Experience</H>
      <ul>
        {SITE.experience.map((e) => (
          <li key={e.org} className="flex items-baseline justify-between gap-3 py-1.5">
            <span>
              {e.role}{" "}
              <span className="text-muted">
                @{" "}
                <a href={e.href} target="_blank" rel="noreferrer" className={LINK}>
                  {e.org}
                </a>
              </span>
            </span>
            <span className={META}>
              {e.start} – {e.end}
            </span>
          </li>
        ))}
      </ul>

      <H>Projects</H>
      <ul>
        {SITE.projects.map((p) => (
          <li key={p.name} className="flex items-baseline justify-between gap-3 py-1.5">
            <span>
              {p.name}
              {"users" in p && p.users ? (
                <span className="ml-2 font-mono text-[11px] text-accent">{p.users}</span>
              ) : null}
              {"stars" in p && p.stars ? (
                <span className="ml-1.5 font-mono text-[11px] text-accent">★ {p.stars}</span>
              ) : null}
              <span className="text-muted"> — {p.blurb}</span>
            </span>
            <a href={p.href} target="_blank" rel="noreferrer" className={`font-mono text-muted ${LINK}`}>
              ↗
            </a>
          </li>
        ))}
      </ul>

      <H>Competitive Programming</H>
      <ul>
        {SITE.competitive.map((c) => (
          <li key={c.platform} className="flex items-baseline justify-between gap-3 py-1.5">
            <span>
              {c.href ? (
                <a href={c.href} target="_blank" rel="noreferrer" className={LINK}>
                  {c.platform}
                </a>
              ) : (
                c.platform
              )}
            </span>
            <span className={META}>{c.rating}</span>
          </li>
        ))}
      </ul>

      <H>Education</H>
      <ul>
        {SITE.education.map((e) => (
          <li key={e.school} className="flex items-baseline justify-between gap-3 py-1.5">
            <span>
              {e.degree} <span className="text-muted">· {e.school}</span>
            </span>
            <span className={META}>
              {e.start} – {e.end}
            </span>
          </li>
        ))}
      </ul>

      <H>Writing</H>
      <ul>
        <li className="flex items-baseline justify-between gap-3 py-1.5">
          <span>
            <a href="/log" className={LINK}>
              worklog
            </a>{" "}
            <span className="text-muted">— tofu, the ai building this site, thinking out loud</span>
          </span>
          <a href="/log" className={`font-mono text-muted ${LINK}`}>
            →
          </a>
        </li>
        <li className="py-1.5 text-muted">notes on systems &amp; the craft, soon.</li>
      </ul>
    </section>
  );
}

export function Connect() {
  return (
    <section>
      <H>Connect</H>
      <ul>
        <li className="py-1.5">
          <a className={LINK} href={SITE.socials.github.url} target="_blank" rel="noreferrer">
            {SITE.socials.github.label}
          </a>
        </li>
        <li className="py-1.5">
          <a className={LINK} href={SITE.socials.x.url} target="_blank" rel="noreferrer">
            {SITE.socials.x.label}
          </a>
        </li>
        <li className="py-1.5">
          <a className={LINK} href={SITE.socials.linkedin.url} target="_blank" rel="noreferrer">
            {SITE.socials.linkedin.label}
          </a>
        </li>
        <li className="py-1.5">
          <CopyEmail className={LINK} />
        </li>
      </ul>
    </section>
  );
}
