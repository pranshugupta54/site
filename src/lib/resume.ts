import { SITE, projectBlurb } from "@/lib/site";

// Compact CV derived from SITE — shared by the shell's `resume` command and the
// /resume page. Public site content only: no dob/age, nothing that isn't on the site.

// Live numbers, fetched server-side by the /resume page. The shell has none,
// so there they hide — live or hidden, never a stale count.
export type ResumeLive = { stars?: Record<string, number | null>; repos?: number | null };

const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

// floored like the projects section — "★ 500+", never a falsely precise count
const starsLabel = (n: number) => `★ ${Math.floor(n / 100) * 100}+`;

const present = (xs: (string | null)[]) => xs.filter((x): x is string => Boolean(x));

export function resume(live: ResumeLive = {}) {
  return {
    name: SITE.name,
    role: SITE.role,
    location: SITE.location.toLowerCase(),
    email: SITE.email,
    links: (["github", "x", "linkedin"] as const).map((key) => ({
      key,
      url: SITE.socials[key].url,
      label: shortUrl(SITE.socials[key].url),
    })),
    experience: SITE.experience.map((e) => ({
      role: e.role,
      org: e.org,
      href: e.href,
      stat: "stat" in e ? e.stat : null,
      place: "place" in e ? e.place : null,
      dates: `${e.start} – ${e.end}`,
    })),
    projects: SITE.projects.map((p) => {
      const stars = "repo" in p ? live.stars?.[p.repo] : null;
      return {
        name: p.name,
        href: p.href,
        blurb: projectBlurb(p, live.repos),
        tags: present(["users" in p ? p.users : null, stars ? starsLabel(stars) : null]),
      };
    }),
    education: SITE.education.map((e) => ({ degree: e.degree, school: e.school, dates: `${e.start} – ${e.end}` })),
    skills: [...SITE.skills],
  };
}

// ─── terminal text ───────────────────────────────────────────────────────────

const COLS = 40; // fits the shell on a 375px phone without soft-wrapping

// greedy-pack tokens into lines of at most COLS, each prefixed with `indent`
function pack(tokens: string[], sep: string, indent = ""): string {
  const lines: string[] = [];
  let cur = "";
  for (const t of tokens) {
    if (cur && indent.length + cur.length + sep.length + t.length > COLS) {
      lines.push(indent + cur);
      cur = t;
    } else cur = cur ? cur + sep + t : t;
  }
  if (cur) lines.push(indent + cur);
  return lines.join("\n");
}

const dots = (parts: (string | null)[], indent = "") => pack(present(parts), " · ", indent);
const prose = (s: string, indent = "") => pack(s.split(" "), " ", indent);

// label column with the value beside it; a label too wide for the column puts
// its value on the next line instead
function field(label: string, value: string, col: number): string {
  const pad = " ".repeat(col);
  return label.length < col
    ? label.padEnd(col) + prose(value, pad).slice(col)
    : `${label}\n${prose(value, pad)}`;
}

export type ResumeLine = { kind: "head" | "body"; text: string };

export function resumeLines(live: ResumeLive = {}): ResumeLine[] {
  const r = resume(live);
  const section = (title: string, rows: string[]): ResumeLine[] => [
    { kind: "head", text: `\n${title}` },
    { kind: "body", text: rows.join("\n") },
  ];
  return [
    { kind: "head", text: r.name },
    { kind: "body", text: [dots([r.role, r.location]), r.email].join("\n") },
    ...section(
      "experience",
      r.experience.map((e) => `${dots([`${e.role} @ ${e.org}`, e.stat])}\n${dots([e.dates, e.place], "  ")}`)
    ),
    ...section(
      "projects",
      r.projects.map((p) => (p.blurb ? `${dots([p.name, ...p.tags])}\n${prose(p.blurb, "  ")}` : dots([p.name, ...p.tags])))
    ),
    ...section(
      "education",
      r.education.map((e) => `${prose(e.degree)}\n${dots([e.school, e.dates], "  ")}`)
    ),
    ...section("skills", [pack(r.skills, " · ")]),
    ...section("links", r.links.map((l) => field(l.key, l.label, 10))),
  ];
}
