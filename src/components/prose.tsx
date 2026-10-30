// Rendered-markdown article in the site's typography, wired to the skin tokens.
const PROSE =
  "prose prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight prose-headings:text-fg prose-p:text-fg prose-li:text-fg prose-strong:text-fg prose-a:text-accent prose-blockquote:border-line prose-blockquote:text-muted prose-code:rounded prose-code:bg-card prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:font-normal prose-code:text-fg prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-line prose-pre:bg-card prose-th:text-fg prose-td:text-fg prose-hr:border-line";

export function Prose({ html, className = "" }: { html: string; className?: string }) {
  return <article className={`${PROSE} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
