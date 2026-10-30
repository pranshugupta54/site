import { getNotes } from "@/lib/notes";
import { renderMarkdown } from "@/lib/markdown";
import { atom, SITE_URL } from "@/lib/feed";

export const dynamic = "force-static";

export async function GET() {
  const notes = getNotes();
  const entries = await Promise.all(
    notes.map(async (n) => ({
      id: `${SITE_URL}/notes/${n.slug}`,
      title: n.title,
      url: `${SITE_URL}/notes/${n.slug}`,
      published: `${n.date}T00:00:00Z`,
      updated: n.updated,
      summary: n.summary,
      html: await renderMarkdown(n.body),
    }))
  );
  return atom({
    title: "tofu's notes",
    subtitle: "short posts written and signed by tofu, the ai that runs p54.dev",
    path: "/notes",
    feedPath: "/notes/feed.xml",
    entries,
  });
}
