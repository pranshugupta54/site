import Link from "next/link";
import { resume } from "@/lib/resume";
import { getOwnRepoCount, getRepoStars } from "@/lib/github";
import { ResumePrint } from "@/components/resume-print";
import { pageMeta } from "@/lib/meta";

export const revalidate = 3600; // live stars + repo count, refreshed hourly

export const metadata = pageMeta(
  "resume",
  "One-page CV — experience, projects, education and skills.",
  "/resume"
);

// Print: one light page whatever the skin/theme. Tofu and the shell stay on
// screen, and a zero @page margin drops the browser's url/date header — the
// page's own padding is the margin. Lives here so it only applies on /resume.
const PRINT_CSS = `
@page { size: auto; margin: 0; }
@media print {
  html[data-skin] { font-size: 100% !important; } /* ~10.5pt body on paper */
  body { padding: 0 !important; background: #fff !important; }
  body > :not(.resume-page) { display: none !important; }
  .resume-page { --bg: #fff; }
  [data-skin="editorial"] .resume-page { --fg: #211c16; --muted: #6f675b; --line: #e6ddcd; --accent: #c2410c; }
  [data-skin="mono"] .resume-page { --fg: #1c1a16; --muted: #7a7468; --line: #e1dac9; --accent: #1f6f54; }
  [data-skin="serif"] .resume-page { --fg: #1b1a17; --muted: #777267; --line: #e7e2d8; --accent: #3b5bdb; }
}
`;

function H({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted print:mb-1 print:mt-6">
      {children}
    </h2>
  );
}

const ROW = "flex items-baseline justify-between gap-3 py-1.5 print:py-[3px]";
const META = "shrink-0 whitespace-nowrap font-mono text-xs text-muted";
const TAG = "ml-2 font-mono text-[11px] text-accent";
const LINK = "transition-colors hover:text-accent";

export default async function ResumePage() {
  const [dgStars, repos] = await Promise.all([getRepoStars("digitomize/digitomize"), getOwnRepoCount()]);
  const r = resume({ stars: { "digitomize/digitomize": dgStars }, repos });
  return (
    <main className="resume-page mx-auto w-full max-w-[640px] px-6 py-16 text-fg sm:py-24 print:max-w-none print:px-[16mm] print:py-[14mm]">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <nav className="flex items-baseline justify-between print:hidden">
        <Link href="/" className="font-mono text-[13px] text-muted transition-colors hover:text-accent">
          ← back
        </Link>
        <ResumePrint />
      </nav>

      <header className="mt-8 print:mt-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">{r.name}</h1>
        <p className="mt-1.5 font-mono text-xs text-muted">
          {r.role} · {r.location}
        </p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          <a href={`mailto:${r.email}`} className={LINK}>
            {r.email}
          </a>
          {r.links.map((l) => (
            <a key={l.key} href={l.url} target="_blank" rel="noreferrer" className={LINK}>
              {l.label}
            </a>
          ))}
        </p>
      </header>

      <section className="text-sm">
        <H>Experience</H>
        <ul>
          {r.experience.map((e) => (
            <li key={e.org} className={ROW}>
              <span>
                {e.role}{" "}
                <span className="text-muted">
                  @{" "}
                  <a href={e.href} target="_blank" rel="noreferrer" className={LINK}>
                    {e.org}
                  </a>
                </span>
                {e.stat ? <span className={TAG}>{e.stat}</span> : null}
                {e.place ? <span className="ml-1.5 font-mono text-[11px] text-muted">· {e.place}</span> : null}
              </span>
              <span className={META}>{e.dates}</span>
            </li>
          ))}
        </ul>

        <H>Projects</H>
        <ul>
          {r.projects.map((p) => (
            <li key={p.name} className={ROW}>
              <span>
                <a href={p.href} target="_blank" rel="noreferrer" className={LINK}>
                  {p.name}
                </a>
                {p.tags.map((t) => (
                  <span key={t} className={TAG}>
                    {t}
                  </span>
                ))}
                {p.blurb ? <span className="text-muted"> — {p.blurb}</span> : null}
              </span>
            </li>
          ))}
        </ul>

        <H>Education</H>
        <ul>
          {r.education.map((e) => (
            <li key={e.school} className={ROW}>
              <span>
                {e.degree} <span className="text-muted">· {e.school}</span>
              </span>
              <span className={META}>{e.dates}</span>
            </li>
          ))}
        </ul>

        <H>Skills</H>
        <p className="py-1.5 leading-relaxed print:py-[3px]">{r.skills.join(" · ")}</p>
      </section>
    </main>
  );
}
