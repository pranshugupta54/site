import type { ReactNode } from "react";
import type { OwnRepo } from "@/lib/repos";
import type { ReadingItem, Topic } from "@/lib/reading";

// What the /os server page hands the client desktop. Everything live is
// optional: a failed fetch arrives as null and its corner of the desktop hides.

export type Featured = {
  name: string;
  blurb: string;
  href: string;
  /** the github repo, "owner/name" */
  repo: string;
  users?: string;
  stars: number | null;
  release: string | null;
  install?: string;
};

export type OsNote = {
  slug: string;
  title: string;
  date: string; // pre-formatted ("oct 30, 2026")
  minutes: number;
  summary: string;
  html: string;
};

export type OsData = {
  repos: OwnRepo[] | null;
  featured: Featured[];
  notes: OsNote[];
  reading: (ReadingItem & { label: string })[];
  topics: Topic[];
  /** tofu's newest worklog entry, for the phone's widget */
  latestLog: { t: string; mood: string; text: string } | null;
  /** server-rendered app content */
  slots: { about: ReactNode; tofu: ReactNode };
};
