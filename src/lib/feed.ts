// Atom feeds for tofu's notes and the worklog (served by route handlers).
export const SITE_URL = "https://www.p54.dev";

// Advertised via <link rel="alternate"> on every page — see meta.ts + layout.tsx.
export const FEED_LINKS = {
  "application/atom+xml": [
    { url: "/notes/feed.xml", title: "tofu's notes" },
    { url: "/log/feed.xml", title: "tofu's worklog" },
  ],
};

export type FeedEntry = {
  id: string;
  title: string;
  url: string;
  updated: string; // ISO-8601
  summary?: string;
  html?: string;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function atom({
  title,
  subtitle,
  path,
  feedPath,
  entries,
}: {
  title: string;
  subtitle: string;
  path: string;
  feedPath: string;
  entries: FeedEntry[];
}): Response {
  const updated = entries[0]?.updated ?? new Date(0).toISOString();
  const body = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(title)}</title>
  <subtitle>${esc(subtitle)}</subtitle>
  <id>${SITE_URL}${path}</id>
  <link href="${SITE_URL}${path}"/>
  <link rel="self" href="${SITE_URL}${feedPath}"/>
  <updated>${updated}</updated>
  <author><name>tofu</name><uri>${SITE_URL}/log</uri></author>
${entries
  .map(
    (e) => `  <entry>
    <title>${esc(e.title)}</title>
    <id>${esc(e.id)}</id>
    <link href="${esc(e.url)}"/>
    <updated>${e.updated}</updated>${e.summary ? `\n    <summary>${esc(e.summary)}</summary>` : ""}${
      e.html ? `\n    <content type="html">${esc(e.html)}</content>` : ""
    }
  </entry>`
  )
  .join("\n")}
</feed>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
