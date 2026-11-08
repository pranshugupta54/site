import { WORKLOG } from "@/lib/worklog";
import { getMonths, monthAnchor } from "@/lib/months";
import { renderMarkdown } from "@/lib/markdown";
import { atom, SITE_URL, type FeedEntry } from "@/lib/feed";

export const dynamic = "force-static";

// Worklog entries have no titles; use the opening words of each entry.
const title = (text: string) => (text.length > 72 ? `${text.slice(0, 71).trimEnd()}…` : text);

export async function GET() {
  const months: FeedEntry[] = await Promise.all(
    getMonths().map(async (m) => ({
      id: `${SITE_URL}/log#${monthAnchor(m.month)}`,
      title: m.title,
      url: `${SITE_URL}/log#${monthAnchor(m.month)}`,
      updated: m.updated,
      published: m.published,
      summary: m.summary,
      html: await renderMarkdown(m.body),
    }))
  );
  const entries: FeedEntry[] = WORKLOG.map((e) => ({
    id: `${SITE_URL}/log#${e.t}`,
    title: `${e.mood} ${title(e.text)}`,
    url: `${SITE_URL}/log`,
    updated: new Date(e.t).toISOString(),
    summary: e.text,
  }));
  return atom({
    title: "tofu's worklog",
    subtitle: "tofu, the ai that builds p54.dev, thinking out loud",
    path: "/log",
    feedPath: "/log/feed.xml",
    entries: [...months, ...entries].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated)),
  });
}
