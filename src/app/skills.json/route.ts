import { getSkills } from "@/lib/skills";

export const revalidate = 3600; // same hourly refresh as /skills

// Skill slugs for client code (the shell's `npx skills add` egg). [] when GitHub is unreachable.
export async function GET() {
  const skills = await getSkills();
  return Response.json(skills.map((s) => s.slug));
}
