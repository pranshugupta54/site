// Single source of truth for site content. Edit here; everything reads from this.

export const SITE = {
  name: "Pranshu Gupta",
  first: "pranshu",
  handle: "pranshugupta54",
  role: "building @ Traycer AI",
  location: "India", // TODO: set your city if you want it shown
  timezone: "Asia/Kolkata",
  email: "pranshgupta54@gmail.com",
  dob: "2004-03-05", // 5 March 2004

  // README cycles these — used by the hero greeting rotator
  greetings: ["Namaste", "Hello", "Ciao", "Hola", "Bonjour"],

  // lead line; the word in <mark> gets the animated marker highlight
  lead: "I build {products} people want — backend that holds up, ui that feels good.",
  bio: "mainly backend, drawn to ui/ux and a bit of frontend. i care about things people actually use, and the small details most skip.",

  socials: {
    github: { label: "github", url: "https://github.com/pranshugupta54" },
    x: { label: "twitter / x", url: "https://x.com/pranshgupta54" },
    linkedin: { label: "linkedin", url: "https://linkedin.com/in/pranshu54" },
  },

  // Experience — work history with month/year dates
  experience: [
    { role: "building", org: "Traycer AI", stat: "100k+ devs", place: "california, us", start: "Jun 2024", end: "Present", href: "https://traycer.ai" },
    { role: "maintainer", org: "Palisadoes Foundation", place: "california, us", start: "Feb 2024", end: "Nov 2024", href: "https://github.com/PalisadoesFoundation" },
    { role: "DMP mentee", org: "Code for GovTech", place: "india", start: "Jun 2024", end: "Sep 2024", href: "https://www.codeforgovtech.in/" },
  ],

  // Competitive programming (from p54.dev)
  competitive: [
    { platform: "LeetCode", rating: "top 10% · max 1737", href: "https://leetcode.com/u/pranshgupta54/" },
    { platform: "CodeChef", rating: "3★ · max 1658", href: "https://www.codechef.com/users/pranshgupta54" },
    { platform: "Codeforces", rating: "pupil · max 1316", href: "https://codeforces.com/profile/pranshgupta54" },
    { platform: "Meta Hacker Cup '24", rating: "R2 · 1543 global · 273 in", href: "" },
  ],

  // Education
  education: [
    { degree: "B.Tech, Information Technology", school: "USICT", start: "2022", end: "2026" },
    { degree: "Senior Secondary", school: "The Vivekanand School", start: "2020", end: "2022" },
  ],

  // Projects — Digitomize is your flagship; star count fetched live (hidden if the fetch fails)
  projects: [
    {
      name: "digitomize",
      blurb: "open-source coding-contests + profiles platform",
      repo: "digitomize/digitomize",
      href: "https://github.com/digitomize/digitomize",
      users: "50k+ users",
      featured: true,
    },
    {
      name: "hertz",
      blurb: "native macOS menu-bar system monitor (swift)",
      href: "https://github.com/pranshugupta54/hertz",
    },
    {
      name: "more on github",
      // {repos} = live count of his own public repos (forks excluded); blurbOffline shows if the fetch fails
      blurb: "{repos} public repos and counting",
      blurbOffline: "the rest, in public",
      href: "https://github.com/pranshugupta54?tab=repositories",
    },
  ],

  skills: ["TypeScript", "JavaScript", "C++", "C", "Node", "Express", "React", "MongoDB", "Firebase", "Jest"],

  version: "1.0.0",
} as const;

export type Site = typeof SITE;

// Project blurb with {repos} filled from a live count; blurbOffline when there isn't one.
export function projectBlurb(p: (typeof SITE.projects)[number], repoCount?: number | null): string {
  if (!p.blurb.includes("{repos}")) return p.blurb;
  if (repoCount) return p.blurb.replace("{repos}", String(repoCount));
  return "blurbOffline" in p ? p.blurbOffline : "";
}
