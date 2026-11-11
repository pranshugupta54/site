import Link from "next/link";
import { SITE, projectBlurb } from "@/lib/site";
import { FEED_LINKS } from "@/lib/feed";
import { getGithub, getLatestRelease, getOwnRepos, getRepoStars } from "@/lib/github";
import { getNotes } from "@/lib/notes";
import { TABS, pickRepos } from "@/lib/tty";
import { GitHubBoard } from "@/components/github-board";
import { CopyEmail } from "@/components/copy-email";
import { CopyCommand } from "@/components/copy-command";
import { Age } from "@/components/age";
import { TtyPrompt, PromptLabel } from "@/components/tty/prompt";
import { TofuProc } from "@/components/tty/tofu-proc";
import { TtyStatus } from "@/components/tty/status";
import "@/components/tty/tty.css";

export const revalidate = 3600; // refresh live GitHub data hourly

// replaces the layout's `alternates` wholesale, so repeat the feeds
export const metadata = { alternates: { canonical: "/", types: FEED_LINKS } };

const EXT = { target: "_blank", rel: "noreferrer" } as const;

/** one finished command in the session: the prompt line, then its output */
function Block({ cmd, id, children }: { cmd: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="tty-block" aria-label={cmd}>
      <div className="tty-cmd">
        <PromptLabel /> <span>{cmd}</span>
      </div>
      {children}
    </section>
  );
}

function Lead() {
  // the braced word gets the animated marker, as in v1
  const parts = SITE.lead.split(/\{([^}]+)\}/);
  return (
    <p className="tty-lead">
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="mark">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </p>
  );
}

function Ls({ href, name, ext, desc, meta, children }: { href: string; name: string; ext?: boolean; desc: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="tty-row tty-ls">
      {ext ? (
        <a href={href} {...EXT} className="tty-file">
          {name}
        </a>
      ) : (
        <Link href={href} className="tty-file">
          {name}
        </Link>
      )}
      <span className="tty-dim">{desc}</span>
      <span className="tty-meta">{meta}</span>
      {children}
    </div>
  );
}

// v2 home: the site as a terminal session. Live GitHub data or nothing, as ever.
export default async function Page() {
  const [gh, repos, dgStars, hertzRelease] = await Promise.all([
    getGithub(),
    getOwnRepos(),
    getRepoStars("digitomize/digitomize"),
    getLatestRelease("pranshugupta54/hertz"),
  ]);
  const repoCount = repos?.length ?? null;
  const more = pickRepos(repos ?? [], ["hertz", "site", SITE.handle], 3);
  const hasNotes = getNotes().length > 0;
  const [digitomize, hertz, github] = SITE.projects;
  const githubLine = projectBlurb(github, repoCount);

  const writing = [
    { name: "tofu/", href: "/tofu", desc: "the bot that runs this site, and everything it keeps" },
    { name: "log/", href: "/log", desc: "tofu, the ai building this site, thinking out loud" },
    ...(hasNotes ? [{ name: "notes/", href: "/notes", desc: "short posts, written and signed by tofu" }] : []),
    { name: "reading/", href: "/reading", desc: "links worth your time, with tofu's one-line take" },
    { name: "skills/", href: "/skills", desc: "agent skills for coding agents, installable via skills.sh" },
    { name: "versions/", href: "/versions", desc: "this site's past lives. v1 is still walkable" },
  ];

  return (
    <div className="tty">
      <nav className="tty-tabs" aria-label="tabs">
        {TABS.map((t, i) => (
          <Link key={t.key} href={t.href} className={i === 0 ? "on" : undefined} aria-current={i === 0 ? "page" : undefined}>
            <i>{t.key}</i>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="tty-panes">
        <main className="tty-main">
          <Block cmd="whoami">
            <h1 className="tty-name">
              {SITE.name.toLowerCase()}
              <span className="tty-name-cursor" aria-hidden>
                _
              </span>
            </h1>
            <Lead />
            <p className="tty-out tty-dim tty-bio">
              mainly backend, drawn to ui/ux and the small details most skip. these days building the agent platform at{" "}
              <a href="https://traycer.ai" {...EXT}>
                traycer
              </a>{" "}
              and publishing <Link href="/skills">skills</Link> for coding agents.
            </p>
            <p className="tty-out tty-dim">
              ~ {SITE.role.toLowerCase()} · {SITE.location.toLowerCase()} · <Age className="whitespace-nowrap" />
            </p>
          </Block>

          <Block cmd="cat cv.txt">
            <div className="tty-rows">
              <div className="tty-note"># work</div>
              {SITE.experience.map((e) => (
                <div key={e.org} className="tty-row tty-cv">
                  <span>
                    {e.role} <span className="tty-dim">@</span>{" "}
                    <a href={e.href} {...EXT}>
                      {e.org}
                    </a>
                    {"stat" in e && e.stat ? <span className="tty-acc"> {e.stat}</span> : null}
                  </span>
                  <span className="tty-sub">
                    {"place" in e && e.place ? <span className="tty-place">{e.place}</span> : null}
                    <span className="tty-meta">
                      {e.start} – {e.end}
                    </span>
                  </span>
                </div>
              ))}
              <div className="tty-note"># school</div>
              {SITE.education.map((e) => (
                <div key={e.school} className="tty-row tty-cv">
                  <span>{e.degree}</span>
                  <span className="tty-sub">
                    <span className="tty-place">{e.school}</span>
                    <span className="tty-meta">
                      {e.start} – {e.end}
                    </span>
                  </span>
                </div>
              ))}
              <div className="tty-row">
                <Link href="/resume" className="tty-dim">
                  resume →
                </Link>
              </div>
            </div>
          </Block>

          <Block cmd="ls ~/projects" id="projects">
            <div className="tty-rows">
              <Ls
                ext
                href={digitomize.href}
                name="digitomize/"
                desc={
                  <>
                    {digitomize.blurb}
                    {"users" in digitomize && digitomize.users ? <span className="tty-acc"> · {digitomize.users}</span> : null}
                  </>
                }
                meta={dgStars ? `★ ${dgStars.toLocaleString("en-US")}` : null}
              />
              <Ls ext href={hertz.href} name="hertz.app" desc={hertz.blurb} meta={hertzRelease}>
                {"install" in hertz && hertz.install ? (
                  <div className="tty-install">
                    <CopyCommand inline cmd={hertz.install} />
                  </div>
                ) : null}
              </Ls>
              {more.map((r) => (
                <Ls key={r.name} ext href={r.url} name={`${r.name}/`} desc={r.description ?? r.language?.toLowerCase() ?? ""} meta={r.stars > 0 ? `★ ${r.stars}` : null} />
              ))}
              <Ls href="/os" name="p54-os/" desc="this site, pretending to be a computer" />
              <Ls href="/room" name="room/" desc="a desk corner where every object is a door" />
              {githubLine ? (
                <div className="tty-row">
                  <a href={github.href} {...EXT} className="tty-dim">
                    … {githubLine} →
                  </a>
                </div>
              ) : null}
            </div>
          </Block>

          <Block cmd="cat cp.txt">
            <div className="tty-rows">
              {SITE.competitive.map((c) => (
                <div key={c.platform} className="tty-row">
                  <span>
                    {c.href ? (
                      <a href={c.href} {...EXT}>
                        {c.platform}
                      </a>
                    ) : (
                      c.platform
                    )}
                  </span>
                  <span className="tty-meta">{c.rating}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block cmd="ls ~/writing">
            <div className="tty-rows">
              {writing.map((w) => (
                <Ls key={w.name} href={w.href} name={w.name} desc={w.desc} />
              ))}
            </div>
          </Block>

          <TtyPrompt />
        </main>

        <aside className="tty-side" aria-label="side pane">
          <TofuProc />
          {gh ? (
            <section className="tty-box" aria-label="GitHub activity">
              <span className="tty-box-t">git log --graph · live</span>
              <GitHubBoard levels={gh.levels}>
                <div className="tty-stats">
                  <span>
                    <b>{gh.totalContributions.toLocaleString()}</b> contributions
                  </span>
                  <span>
                    <b>{gh.followers.toLocaleString()}</b> followers
                  </span>
                  <span>
                    <b>{gh.streak}</b>-day streak
                  </span>
                </div>
              </GitHubBoard>
            </section>
          ) : null}
          <section className="tty-box" aria-label="elsewhere">
            <span className="tty-box-t">elsewhere</span>
            <div className="tty-links">
              {Object.values(SITE.socials).map((s) => (
                <a key={s.url} href={s.url} {...EXT}>
                  {s.label}
                </a>
              ))}
            </div>
            <CopyEmail className="tty-email" />
          </section>
        </aside>
      </div>

      <TtyStatus />
    </div>
  );
}
