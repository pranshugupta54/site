// The v2 home is a terminal: tabs along the top, a prompt you can type into
// from anywhere. Pure, no imports, so `node --test` loads it as-is.

export type Tab = { key: string; label: string; href: string };

// number keys 1–7 switch tabs; "projects" is a block on the home page itself
export const TABS: Tab[] = [
  { key: "1", label: "~", href: "/" },
  { key: "2", label: "projects", href: "/#projects" },
  { key: "3", label: "log", href: "/log" },
  { key: "4", label: "notes", href: "/notes" },
  { key: "5", label: "os", href: "/os" },
  { key: "6", label: "room", href: "/room" },
  { key: "7", label: "tofu", href: "/tofu" },
];

export type KeyIn = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
};

export type PromptState = {
  /** a snake game owns the arrow keys (and everything else) */
  snakeOn: boolean;
  /** another text field (not the prompt) has focus */
  typingElsewhere: boolean;
  /** the prompt's own input has focus: it handles its keys itself */
  promptFocused: boolean;
  /** nothing typed at the prompt yet */
  promptEmpty: boolean;
};

export type KeyAction = { kind: "tab"; href: string } | { kind: "focus" } | { kind: "type"; text: string } | null;

/**
 * What a key pressed anywhere on the home page does:
 * `/` focuses the prompt, 1–7 switch tabs while the prompt is empty, and any
 * other printable key starts typing at the prompt. `?` is left to the keyboard
 * map, space to scrolling, and modified keys to the browser.
 */
export function homeKey(e: KeyIn, s: PromptState): KeyAction {
  if (s.snakeOn || s.typingElsewhere || s.promptFocused) return null;
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return null;
  if (e.key === "/") return { kind: "focus" };
  if (s.promptEmpty) {
    const tab = TABS.find((t) => t.key === e.key);
    if (tab) return { kind: "tab", href: tab.href };
  }
  if (e.key.length === 1 && e.key !== " " && e.key !== "?") return { kind: "type", text: e.key };
  return null;
}

/** 24h "21:30" → "9:30 pm" */
export function twelveHour(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

// own repos worth a line next to the flagships: most-starred first, then most
// recently pushed, skipping the ones the list already names
export function pickRepos<R extends { name: string; stars: number; pushedAt: string }>(
  repos: R[],
  skip: string[],
  n: number
): R[] {
  const out = repos.filter((r) => !skip.some((s) => s.toLowerCase() === r.name.toLowerCase()));
  out.sort((a, b) => b.stars - a.stars || (a.pushedAt < b.pushedAt ? 1 : a.pushedAt > b.pushedAt ? -1 : 0));
  return out.slice(0, n);
}
