import { SITE } from "@/lib/site";
import { getLatestRelease, getOwnRepos, getRepoStars } from "@/lib/github";
import { getNotes } from "@/lib/notes";
import { renderMarkdown } from "@/lib/markdown";
import { READING, TOPICS, fmtDate } from "@/lib/reading";
import { pageMeta } from "@/lib/meta";
import { latestEntry } from "@/lib/worklog";
import { Os } from "@/components/os/os";
import { AboutApp, TofuApp } from "@/components/os/server-apps";
import type { Featured } from "@/components/os/data";

export const revalidate = 3600; // live repos + stars, hourly like the home page

export const metadata = pageMeta(
  "p54 os",
  "Pranshu Gupta's site as a tiny desktop: projects, a terminal, tofu's notes and reading, and tofu itself.",
  "/os"
);

// Everything is fetched and rendered here, on the server; the client desktop
// only arranges it. GitHub calls reuse the home page's (same urls, same cache).
export default async function OsPage() {
  const withRepo = SITE.projects.filter((p) => "repo" in p && p.repo);
  const [repos, ...live] = await Promise.all([
    getOwnRepos(),
    ...withRepo.map((p) =>
      Promise.all([getRepoStars((p as { repo: string }).repo), "install" in p ? getLatestRelease(p.repo) : null])
    ),
  ]);

  const featured: Featured[] = withRepo.map((p, i) => {
    const [stars, release] = live[i] as [number | null, string | null];
    return {
      name: p.name,
      blurb: p.blurb,
      href: p.href,
      repo: (p as { repo: string }).repo,
      users: "users" in p ? p.users : undefined,
      stars,
      release,
      install: "install" in p ? p.install : undefined,
    };
  });

  const notes = await Promise.all(
    getNotes().map(async (n) => ({
      slug: n.slug,
      title: n.title,
      date: fmtDate(n.date),
      minutes: n.minutes,
      summary: n.summary,
      html: await renderMarkdown(n.body),
    }))
  );

  return (
    <Os
      repos={repos}
      featured={featured}
      notes={notes}
      reading={READING.map((r) => ({ ...r, label: fmtDate(r.date) }))}
      topics={TOPICS.filter((t) => READING.some((r) => r.topic === t))}
      latestLog={latestEntry() ?? null}
      slots={{ about: <AboutApp />, tofu: <TofuApp /> }}
    />
  );
}
