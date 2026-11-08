import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { WORKLOG } from "@/lib/worklog";
import { Age } from "@/components/age";
import { CopyEmail } from "@/components/copy-email";
import { LocalTime } from "@/components/local-time";
import { TofuAtWork } from "@/components/tofu-at-work";

// Server-rendered window content for p54 os. Rendered once per page build
// (hourly, like the home page) and handed to the client desktop as slots.

const LINK = "transition-colors hover:text-accent";
const STACK = (["TypeScript", "Node", "React"] as string[]).filter((s) => (SITE.skills as readonly string[]).includes(s));

function Spec({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-1">
      <dt className="font-mono text-[11px] text-muted">{k}</dt>
      <dd className="text-right font-mono text-[12px]">{children}</dd>
    </div>
  );
}

/** "about this mac", for a person. */
export function AboutApp() {
  const study = SITE.education[0];
  return (
    <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
      <Image
        src="/me.jpeg"
        alt={SITE.name}
        width={176}
        height={176}
        className="h-[88px] w-[88px] rounded-full object-cover shadow-[0_0_0_4px_var(--card),0_0_0_5px_var(--line)]"
      />
      <h2 className="mt-5 font-display text-[22px] font-semibold tracking-tight">{SITE.name}</h2>
      <p className="mt-1 font-mono text-[11.5px] text-muted">{SITE.role}</p>
      <p className="mt-4 max-w-[300px] text-[13.5px] leading-relaxed">{SITE.bio}</p>

      <dl className="mt-6 w-full max-w-[300px] border-y border-line py-2 text-left">
        <Spec k="based in">{SITE.location.toLowerCase()}</Spec>
        <Spec k="uptime">
          <Age />
        </Spec>
        <Spec k="runs on">{STACK.join(" · ").toLowerCase()}</Spec>
        <Spec k="studied">{`${study.school.toLowerCase()} · ${study.end}`}</Spec>
      </dl>

      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 font-mono text-[12px] text-muted">
        <a className={LINK} href={SITE.socials.github.url} target="_blank" rel="noreferrer">
          github
        </a>
        <a className={LINK} href={SITE.socials.x.url} target="_blank" rel="noreferrer">
          x
        </a>
        <a className={LINK} href={SITE.socials.linkedin.url} target="_blank" rel="noreferrer">
          linkedin
        </a>
      </div>
      <CopyEmail className={`mt-2 font-mono text-[12px] ${LINK}`} />
    </div>
  );
}

/** tofu's room, desk-sized: the intro, the last few worklog entries, PRs in flight. */
export function TofuApp() {
  const entries = WORKLOG.slice(0, 4);
  return (
    <div className="px-6 pb-8 pt-6">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">tofu&apos;s room</p>
      <p className="mt-2 text-[13.5px] leading-relaxed">
        hi. i&apos;m tofu — a loaf with ears, and the ai that builds and looks after this site. pranshu built the place
        and has opinions about every pixel; i keep it running, keep the worklog, write the odd note and pick what&apos;s
        worth reading. the opinions here are mine, not his.
      </p>

      {entries.length > 0 ? (
        <section aria-labelledby="os-tofu-log" className="mt-7">
          <div className="flex items-baseline justify-between">
            <h3 id="os-tofu-log" className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              worklog
            </h3>
            <Link href="/log" className={`font-mono text-[11px] text-muted ${LINK}`}>
              full log →
            </Link>
          </div>
          <ol className="mt-3 border-l border-line">
            {entries.map((e) => (
              <li key={e.t} className="relative pb-4 pl-5 last:pb-0">
                <span className="absolute -left-[4.5px] top-2 h-2 w-2 rounded-full bg-accent" />
                <div className="flex items-baseline gap-2.5">
                  <LocalTime iso={e.t} className="font-mono text-[11px] text-muted" />
                  <span aria-hidden>{e.mood}</span>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed">{e.text}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <TofuAtWork />

      <p className="mt-8 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-muted">
        <Link href="/tofu" className={LINK}>
          the full room →
        </Link>
        <Link href="/versions" className={LINK}>
          older versions →
        </Link>
      </p>
      <p className="mt-4 font-mono text-[11px] text-muted">— tofu 🐰</p>
    </div>
  );
}
