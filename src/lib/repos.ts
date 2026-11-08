// His own public repos, from GitHub's REST rows. Pure — `node --test` loads it as-is.

// One of his own public repos (forks never make it here — they aren't his work).
export type OwnRepo = {
  name: string;
  description: string | null;
  url: string;
  homepage: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  createdAt: string;
  pushedAt: string;
};

export type RawRepo = {
  name?: unknown;
  fork?: unknown;
  private?: unknown;
  description?: unknown;
  html_url?: unknown;
  homepage?: unknown;
  language?: unknown;
  stargazers_count?: unknown;
  topics?: unknown;
  created_at?: unknown;
  pushed_at?: unknown;
};

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

// One REST row → OwnRepo. Null for forks, private rows and malformed rows, and
// for anything naming his employer: site copy never goes past the public title.
export function toOwnRepo(r: RawRepo): OwnRepo | null {
  if (r.fork !== false || r.private === true) return null;
  const name = str(r.name);
  const url = str(r.html_url);
  if (!name || !url) return null;
  const description = str(r.description);
  if (/traycer/i.test(`${name} ${description ?? ""}`)) return null;
  const homepage = str(r.homepage);
  return {
    name,
    description,
    url,
    homepage: homepage && /^https:\/\//.test(homepage) ? homepage : null,
    language: str(r.language),
    stars: typeof r.stargazers_count === "number" ? r.stargazers_count : 0,
    topics: Array.isArray(r.topics) ? r.topics.filter((t): t is string => typeof t === "string") : [],
    createdAt: str(r.created_at) ?? "",
    pushedAt: str(r.pushed_at) ?? "",
  };
}
