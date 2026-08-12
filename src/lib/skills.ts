// Agent skills, pulled live from the pranshugupta54/skills repo (server-only).
// Returns [] on any failure — the page renders the header and install block regardless.
import matter from "gray-matter";

export const SKILLS_REPO = "pranshugupta54/skills";
export const INSTALL_CMD = `npx skills add ${SKILLS_REPO}`;

export type Skill = {
  name: string;
  description: string;
  href: string; // GitHub link to the SKILL.md
};

type DirEntry = { name?: string; type?: string };

const HEADERS = {
  "User-Agent": "pranshugupta54-portfolio",
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

export async function getSkills(): Promise<Skill[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${SKILLS_REPO}/contents/skills`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const entries = (await res.json()) as DirEntry[];
    const dirs = entries.filter((e) => e.type === "dir" && e.name);

    const skills = await Promise.all(
      dirs.map(async (d): Promise<Skill | null> => {
        try {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${SKILLS_REPO}/main/skills/${d.name}/SKILL.md`,
            { next: { revalidate: 3600 } }
          );
          if (!raw.ok) return null;
          const { data } = matter(await raw.text());
          if (!data.name || !data.description) return null;
          return {
            name: String(data.name),
            description: String(data.description),
            href: `https://github.com/${SKILLS_REPO}/blob/main/skills/${d.name}/SKILL.md`,
          };
        } catch {
          return null;
        }
      })
    );
    return skills.filter((s): s is Skill => s !== null);
  } catch {
    return [];
  }
}
