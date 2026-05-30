import { getGithub } from "@/lib/github";
import { GitHubBoard } from "@/components/github-board";

// Async server component. Hidden entirely if live GitHub data is unavailable
// (no token / API failure) — never shows fake data.
export async function GitHubPanel() {
  const gh = await getGithub();
  if (!gh) return null;

  return (
    <section aria-label="GitHub activity">
      <h2 className="mb-2.5 mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
        GitHub
      </h2>
      <GitHubBoard levels={gh.levels}>
        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] leading-none text-muted"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span>
            <span className="text-fg">{gh.totalContributions.toLocaleString()}</span> contributions
          </span>
          <span className="select-none text-line">·</span>
          <span>
            <span className="text-fg">{gh.followers.toLocaleString()}</span> followers
          </span>
          <span className="select-none text-line">·</span>
          <span>
            <span className="text-fg">{gh.streak}</span>-day streak
          </span>
        </div>
      </GitHubBoard>
    </section>
  );
}
