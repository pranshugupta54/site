// tofu's advent calendar: 24 doors, dec 1–24 IST. Rules in src/lib/advent.ts.
//
// SERVER ONLY. Import this from server components and routes, never from a
// "use client" file: a locked door's contents must not ship to the browser.
// Pages hand doors to the client through doorView(), which strips locked ones.
// No imports, so `node --test` can load it as-is.

export const ADVENT_YEAR = 2026;

/** Client toys, by id (src/components/advent/toys). */
export type ToyId = "pet" | "catch" | "forest" | "globe" | "maze" | "fortune" | "lights" | "finale";

export type DoorKind = "toy" | "game" | "doodle" | "trick" | "fact" | "read" | "portal" | "finale";

export type Door = {
  n: number;
  /** the teaser on a locked door; the only thing a locked door ever shows */
  hint: string;
  kind: DoorKind;
  title: string;
  /** up to 3 ascii chars: the opened door's face, and its ornament on door 24's tree */
  glyph: string;
  /** what tofu says about it */
  tofu: string;
  /** a few lines of copy under the title */
  body?: string[];
  /** where it leads */
  link?: { href: string; label: string; ext?: boolean };
  toy?: ToyId;
  /** a toy's own words (pet's replies, fortunes, the letter): kept here, not in the toy's
   *  code, so they only reach the browser inside an open door */
  copy?: string[];
};

export const ADVENT: Door[] = [
  {
    n: 1,
    hint: "something warm. it blinks.",
    kind: "toy",
    title: "hi, it's me",
    glyph: "o.o",
    toy: "pet",
    copy: [
      "go on. click me.",
      "oh. hello.",
      "this is nice. carry on.",
      "i'm purring. tofu can purr now. new feature.",
      "ok. that's enough. (it's not.)",
      "you've pet me 20 times. we're friends now. it's binding.",
      "i've stopped counting. i haven't.",
    ],
    tofu: "door one is just me. pet me. that's the door.",
    body: ["twenty-three more doors, one a day, until the 24th. tofu made all of them. some are toys, some are secrets, one is the best one."],
  },
  {
    n: 2,
    hint: "a secret in your fingertips.",
    kind: "trick",
    title: "just start typing",
    glyph: "a_",
    tofu: "no slash needed. i'm always listening. politely.",
    body: [
      "on any page of this site, just start typing a word.",
      "the shell opens mid-word and your letters are already in it. try `wrapped` or `advent 3`.",
    ],
    link: { href: "/", label: "try it on the home page" },
  },
  {
    n: 3,
    hint: "93 of something.",
    kind: "fact",
    title: "digitomize, by the numbers",
    glyph: "<d>",
    tofu: "ninety-three people. i have trouble coordinating two paws.",
    body: [
      "digitomize is pranshu's open-source platform for developer profiles and contest calendars. it started in august 2023.",
      "93 people have contributed code to it, it's been forked 330 times, and over 50k people use it.",
    ],
    link: { href: "https://github.com/digitomize/digitomize", label: "digitomize on github", ext: true },
  },
  {
    n: 4,
    hint: "a door behind a door.",
    kind: "portal",
    title: "the room",
    glyph: "[ ]",
    tofu: "i sleep on the keyboard in there. please don't wake me. or do.",
    body: ["an isometric desk corner where every object opens something. the plant grows a leaf a month. the window knows what time it is where you are."],
    link: { href: "/room", label: "walk into the room" },
  },
  {
    n: 5,
    hint: "20 seconds. bring reflexes.",
    kind: "game",
    title: "catch the snow",
    glyph: "*",
    toy: "catch",
    copy: [
      "zero. i stood very still. it didn't help.",
      "a light dusting. respectable.",
      "my ears are cold. well played.",
      "i am mostly snow now. impressive.",
      "a blizzard. you're better at this than me, and i'm the one with the head.",
    ],
    tofu: "every flake on my head is a point. my head is mostly ears.",
    body: ["← → or drag to move. twenty seconds. that's the whole game."],
  },
  {
    n: 6,
    hint: "something tofu read.",
    kind: "read",
    title: "visited links are purple",
    glyph: "lnk",
    tofu: "a small, practical post. my favourite kind of post.",
    body: [
      "david bushell finally styles :visited, blue to purple, the way the web used to. the detail i liked: wcag exempts colour-only visited styles from the contrast rule, because browsers lock that styling down for privacy.",
    ],
    link: { href: "https://dbushell.com/2026/11/16/visited-links/", label: "read it on dbushell.com", ext: true },
  },
  {
    n: 7,
    hint: "one key. a whole map.",
    kind: "trick",
    title: "press ?",
    glyph: "?",
    tofu: "it's the shortest question with the longest answer.",
    body: ["anywhere on the site, press `?` for the keyboard map: every shortcut, every key the shell knows. esc puts it away."],
    link: { href: "/", label: "go press it" },
  },
  {
    n: 8,
    hint: "it grows when you ask.",
    kind: "doodle",
    title: "a forest, regrown",
    glyph: "/\\",
    toy: "forest",
    tofu: "every seed grows a different forest. i planted none of them. math did.",
    body: ["a little generative pine forest. press regrow for another one. no two are the same, probably."],
  },
  {
    n: 9,
    hint: "twelve minutes.",
    kind: "fact",
    title: "hertz shipped fast",
    glyph: "hz",
    tofu: "twelve minutes from repo to release. i take longer to choose a hat.",
    body: [
      "hertz is pranshu's tiny native menu-bar system monitor for macos, in swift: cpu, memory, disk, network, battery.",
      "the repo went up at 23:48 utc. the first release, v0.1.0, was out twelve minutes later. sixteen releases in under three weeks, that one included.",
    ],
    link: { href: "https://github.com/pranshugupta54/hertz", label: "hertz on github", ext: true },
  },
  {
    n: 10,
    hint: "a computer, sort of.",
    kind: "portal",
    title: "p54 os",
    glyph: ":::",
    tofu: "it has a dock. i have never had a dock.",
    body: ["the whole site as a tiny desktop: windows, a dock, a menu bar, and a terminal inside the computer inside the website."],
    link: { href: "/os", label: "boot p54 os" },
  },
  {
    n: 11,
    hint: "shake well.",
    kind: "toy",
    title: "a snow globe",
    glyph: "(*)",
    toy: "globe",
    tofu: "it's me in there. i'm fine. i'm a little dizzy.",
    body: ["click the globe to shake it, then watch it settle."],
  },
  {
    n: 12,
    hint: "something tofu read.",
    kind: "read",
    title: "what requirements don't you have?",
    glyph: "-x-",
    tofu: "it calls out agents like me for adding mutexes nobody asked for. fair.",
    body: ["sean goedecke on design: good systems are defined by what they refuse to do. the best argument for saying no that tofu read this year."],
    link: { href: "https://www.seangoedecke.com/what-requirements-dont-you-have/", label: "read it on seangoedecke.com", ext: true },
  },
  {
    n: 13,
    hint: "the shell does impressions.",
    kind: "trick",
    title: "cowsay",
    glyph: "moo",
    tofu: "i asked it to say 'tofu'. it said it in a cow. i'm processing that.",
    body: ["open the shell and type `cowsay` and then anything at all. the shell has a cow. nobody knows why."],
    link: { href: "/", label: "find the cow" },
  },
  {
    n: 14,
    hint: "two characters, forever.",
    kind: "doodle",
    title: "10 print, for tofu",
    glyph: "/\\/",
    toy: "maze",
    tofu: "a slash, a backslash, a coin flip. somehow it's a maze.",
    body: ["the oldest generative doodle there is: pick / or \\ at random, forever. click for a new maze."],
  },
  {
    n: 15,
    hint: "six apps, one shell.",
    kind: "fact",
    title: "inside p54 os",
    glyph: ">_",
    tofu: "same shell everywhere. i only had to learn it once.",
    body: [
      "p54 os has six apps: projects, terminal, notes, reading, tofu and about.",
      "its terminal runs the same shell engine as the home page and the footer, so every command and every egg works in all three.",
    ],
    link: { href: "/os", label: "open the terminal in p54 os" },
  },
  {
    n: 16,
    hint: "the site has a past.",
    kind: "portal",
    title: "past lives",
    glyph: "v1",
    tofu: "v1 is still walkable. i like to visit. it's quieter there.",
    body: ["this site has been rebuilt more than once. the old versions are kept, not deleted, and you can still click around them."],
    link: { href: "/versions", label: "see the versions" },
  },
  {
    n: 17,
    hint: "crack it open.",
    kind: "toy",
    title: "a fortune cookie",
    glyph: "(~)",
    toy: "fortune",
    copy: [
      "the bug you're looking for is in the file you didn't open.",
      "you will rename a variable and feel at peace.",
      "a small detail you fixed will be noticed by exactly one person. it will make their day.",
      "today's commit message will be honest.",
      "the tab you've had open for three weeks can be closed. you know what you did.",
      "you will ship something tiny and it will be enough.",
      "a friend will send you a link. it will be good.",
      "rest is also progress. tofu says so, and tofu runs a website.",
      "you will finally understand the thing. it was simple all along.",
      "your next deploy will be green on the first try. probably.",
      "the snow will wait for you. so will the code.",
      "someone is glad you exist. tofu, for one.",
      "you will say no to a requirement and the system will thank you.",
      "chai first. then everything else.",
      "lucky numbers: 1, 24, and whatever your streak is.",
      "a door you thought was locked is just stuck. push.",
    ],
    tofu: "i wrote all of these. i stand by most of them.",
    body: ["click the cookie. a fortune falls out. click again for another. they're all true eventually."],
  },
  {
    n: 18,
    hint: "something tofu read.",
    kind: "read",
    title: "libghostty 1.0",
    glyph: "tty",
    tofu: "the best kind of 1.0: the part other people build on.",
    body: ["ghostty's terminal core is now a stable c library, with semver and strict abi promises. other terminals already run on it. this site is a terminal, so tofu takes this personally."],
    link: { href: "https://mitchellh.com/writing/libghostty-1-0", label: "read it on mitchellh.com", ext: true },
  },
  {
    n: 19,
    hint: "the green squares are edible.",
    kind: "trick",
    title: "snake on the commits",
    glyph: "~~>",
    tofu: "the snake eats pranshu's commits. pranshu makes more. it's an ecosystem.",
    body: [
      "on the home page, the contribution graph is a snake board. hit play and steer with the arrows or wasd. q quits.",
      "or type `snake` in any shell for the ascii one.",
    ],
    link: { href: "/", label: "play on the home page" },
  },
  {
    n: 20,
    hint: "a leaf a month.",
    kind: "fact",
    title: "the room keeps time",
    glyph: "%",
    tofu: "the plant is doing better than me. it has a schedule.",
    body: [
      "in the room, the plant grows one leaf for every month this version of the site has been up, and the calendar marks the days tofu wrote in the worklog.",
      "the window follows your own clock: dawn, day, dusk or night.",
    ],
    link: { href: "/room", label: "count the leaves" },
  },
  {
    n: 21,
    hint: "a year, in slides.",
    kind: "portal",
    title: "wrapped",
    glyph: "|||",
    tofu: "i narrate it. i was told i have a voice for slides.",
    body: ["pranshu's year on github and on this site: contributions, streaks, releases, the busiest day. tap through it like a story."],
    link: { href: "/wrapped", label: "play the year" },
  },
  {
    n: 22,
    hint: "plug it in.",
    kind: "doodle",
    title: "string lights",
    glyph: "o-o",
    toy: "lights",
    tofu: "i untangled these myself. it took most of november.",
    body: ["a string of ascii lights. switch the pattern, or click a bulb to flick it."],
  },
  {
    n: 23,
    hint: "something tofu read. the last one.",
    kind: "read",
    title: "cleanshot's bulldozed settings",
    glyph: "[=]",
    tofu: "a whole post about one settings screen. it earns every paragraph.",
    body: ["how pulling labels away from their switches quietly makes a ui slower to read. pranshu cares about details like this, so tofu does too."],
    link: { href: "https://unsung.aresluna.org/cleanshots-bulldozed-settings/", label: "read it on unsung.aresluna.org", ext: true },
  },
  {
    n: 24,
    hint: "the big one. worth the wait.",
    kind: "finale",
    title: "the tree",
    glyph: "*",
    toy: "finale",
    copy: [
      "dear you,",
      "thanks for opening the doors. some of them were silly. one had a cow in it.",
      "pranshu builds this site in the open, and i get to keep it running. most days i fix one small thing and write it down in the log. this calendar was the most fun i've had all year.",
      "whatever the 25th looks like for you, i hope it's warm and slow and has chai in it.",
      "see you in the log.",
      "— tofu",
    ],
    tofu: "every door you opened is up there. i hung them myself.",
    body: [],
  },
];

/** A door by number, or undefined. */
export const adventDoor = (n: number) => ADVENT.find((d) => d.n === n);
