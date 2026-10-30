// When the `?` keyboard map may open or close. Pure, and no imports, so
// `node --test` can load it as-is.

export type KeyLike = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat: boolean;
  isComposing: boolean;
};

export type DocLike = {
  activeElement: { tagName: string; isContentEditable?: boolean } | null;
  querySelector: (selectors: string) => unknown;
};

// The heatmap snake renders these only while a game is on (playing or dead).
export const BOARD_SNAKE =
  '[aria-label="Snake game"], [aria-label="Quit snake and return to the heatmap"]';
// footer-shell marks its panel open; the shell's own snake runs inside it.
export const SHELL_OPEN = '[aria-label="Terminal shell"][data-open="true"]';

const TEXT_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

const plainQuestion = (e: KeyLike) =>
  e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat;

/** `?` opens the map unless something else owns the keyboard: a text field, the open shell, a snake game. */
export function opensKeymap(e: KeyLike, doc: DocLike): boolean {
  if (!plainQuestion(e) || e.isComposing) return false;
  const el = doc.activeElement;
  if (el && (TEXT_TAGS.includes(el.tagName) || el.isContentEditable)) return false;
  return !doc.querySelector(BOARD_SNAKE) && !doc.querySelector(SHELL_OPEN);
}

/** Esc or a fresh `?` closes it. Holding `?` doesn't flicker it shut on auto-repeat. */
export function closesKeymap(e: KeyLike): boolean {
  return e.key === "Escape" || plainQuestion(e);
}
