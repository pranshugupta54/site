// /wrapped's live inputs (server-only: GitHub fetches and files on disk).
// Public sources only: his public contribution calendar (aggregate counts),
// public repos (forks and the employer filtered out by getOwnRepos), and this
// repo's own data. Never import from a client component.
import { cache } from "react";
import { SITE } from "@/lib/site";
import { getContributionYear, getMergedPullCount, getOwnRepos, getReleasesInYear, getRepoStars } from "@/lib/github";
import { VERSIONS } from "@/lib/versions";
import { WORKLOG } from "@/lib/worklog";
import { READING } from "@/lib/reading";
import { getNotes } from "@/lib/notes";
import { SEASONS } from "@/data/seasons";
import { WRAPPED } from "@/data/wrapped";
import { buildSlides, seasonsWorn, yearLabel, type Slide } from "@/lib/wrapped";

export type Wrapped = { year: number; title: string; label: string; slides: Slide[] };

export const getWrapped = cache(async (): Promise<Wrapped> => {
  const { year, favoriteRead, seasonsSince } = WRAPPED;
  const now = new Date();
  const label = yearLabel(year, now, SITE.timezone);
  const inYear = (d: string) => d.startsWith(`${year}-`);
  const digitomize = SITE.projects.find((p) => p.name === "digitomize");
  const hertz = SITE.projects.find((p) => p.name === "hertz");

  const [calendar, repos, stars, releases, prs] = await Promise.all([
    getContributionYear(year),
    getOwnRepos(),
    digitomize && "repo" in digitomize && digitomize.repo ? getRepoStars(digitomize.repo) : Promise.resolve(null),
    hertz && "repo" in hertz && hertz.repo ? getReleasesInYear(hertz.repo, year) : Promise.resolve(null),
    getMergedPullCount(`${SITE.handle}/site`, year),
  ]);

  const read = favoriteRead ? READING.find((r) => r.url === favoriteRead.url) : undefined;

  const slides = buildSlides({
    year,
    ...label,
    calendar,
    repos,
    stars: stars === null || !digitomize ? null : { name: digitomize.name, stars, blurb: digitomize.blurb },
    hertz: releases,
    site: {
      prs,
      versions: VERSIONS.versions.filter((v) => inYear(v.date)).sort((a, b) => a.date.localeCompare(b.date)),
      seasons: seasonsWorn(SEASONS, year, now, SITE.timezone, seasonsSince),
      worklog: WORKLOG.filter((e) => inYear(e.t)).length,
      reads: READING.filter((r) => inYear(r.date)).length,
      notes: getNotes().filter((n) => inYear(n.date)).length,
    },
    read: read && favoriteRead ? { title: read.title, source: read.source, url: read.url, take: read.take, why: favoriteRead.why } : null,
  });

  return { year, title: label.title, label: label.label, slides };
});
