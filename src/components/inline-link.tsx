// Inline prose link with the target site's favicon — used in the hero bio.
// Favicons come from Google's s2 service; grayscale keeps them quiet in the
// editorial palette, dark-theme invert keeps dark logos (X, GitHub) visible.
export function InlineLink({
  href,
  domain,
  children,
}: {
  href: string;
  domain: string;
  children: React.ReactNode;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="whitespace-nowrap text-fg underline decoration-line decoration-1 underline-offset-[3px] transition-colors hover:text-accent hover:decoration-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        aria-hidden
        loading="lazy"
        className="mr-[3px] inline-block h-[13px] w-[13px] rounded-[3px] align-[-2px] grayscale dark:invert"
      />
      {children}
    </a>
  );
}
