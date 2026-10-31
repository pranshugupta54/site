// The footer shell's public commands and the site's keyboard shortcuts — one list,
// read by the shell's `help` and the `?` keyboard map. Hidden eggs stay out of both.
// No imports, so `node --test` can load it as-is.

export type CommandRow = { usage: string; desc?: string };

export const SHELL_COMMANDS: CommandRow[] = [
  { usage: "about · projects · writing · gh" },
  { usage: "resume", desc: "cv · --pdf to save one" },
  { usage: "snake", desc: "play snake on my commits" },
  { usage: "theme", desc: "toggle light / dark" },
  { usage: "skin", desc: "cycle editorial → mono → serif" },
  { usage: "funfact", desc: "a fun fact" },
  { usage: "season", desc: "what's on, or season <name|off|auto>" },
  { usage: "versions", desc: "this site's past lives" },
  { usage: "goto <x>", desc: "github · x · email" },
  { usage: "clock · clear · cowsay <msg> · sudo" },
];

/** The command list, plus the active season's egg commands when it has any. */
export function shellCommands(
  season?: { name: string; commands?: Record<string, string> } | null
): CommandRow[] {
  const eggs = Object.keys(season?.commands ?? {});
  if (!season || !eggs.length) return SHELL_COMMANDS;
  return [...SHELL_COMMANDS, { usage: eggs.join(" · "), desc: `it's ${season.name}` }];
}

/** `help` output: short usages pad into a column, long ones keep a fixed gap. */
export function helpText(rows: CommandRow[]): string {
  const row = ({ usage, desc }: CommandRow) =>
    !desc ? `  ${usage}` : usage.length < 10 ? `  ${usage.padEnd(10)} ${desc}` : `  ${usage}   ${desc}`;
  return ["commands:", ...rows.map(row)].join("\n");
}

export type Shortcut = { keys: string[]; desc: string };

export const SHORTCUTS: Shortcut[] = [
  { keys: ["/"], desc: "open the shell" },
  { keys: ["a–z"], desc: "just start typing — the shell opens mid-word" },
  { keys: ["esc"], desc: "close the shell, or this" },
  { keys: ["?"], desc: "this map" },
  { keys: ["↑", "↓"], desc: "shell history" },
  { keys: ["arrows", "wasd"], desc: "steer the snake" }, // ← → aren't in the mono font's latin subset
  { keys: ["q"], desc: "quit snake · enter restarts after a crash" },
];
