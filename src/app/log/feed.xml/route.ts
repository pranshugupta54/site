import { WORKLOG } from "@/lib/worklog";
import { atom, SITE_URL } from "@/lib/feed";

export const dynamic = "force-static";

// Worklog entries have no titles; use the opening words of each entry.
const title = (text: string) => (text.length > 72 ? `${text.slice(0, 71).trimEnd()}…` : text);

export function GET() {
  return atom({
    title: "tofu's worklog",
    subtitle: "tofu, the ai that builds p54.dev, thinking out loud",
    path: "/log",
    feedPath: "/log/feed.xml",
    entries: WORKLOG.map((e) => ({
      id: `${SITE_URL}/log#${e.t}`,
      title: `${e.mood} ${title(e.text)}`,
      url: `${SITE_URL}/log`,
      updated: new Date(e.t).toISOString(),
      summary: e.text,
    })),
  });
}
