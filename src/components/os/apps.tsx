"use client";

import type { ReactNode } from "react";
import { ProjectDetail, ProjectsApp } from "./apps/projects";
import { TerminalApp } from "./apps/terminal";
import { NotesApp, ReadingApp } from "./apps/writing";
import type { OsData } from "./data";
import type { AppId, WinKind } from "./wm";

export const APPS: Record<AppId, { name: string; title: string }> = {
  projects: { name: "projects", title: "projects" },
  terminal: { name: "terminal", title: "terminal — ~/pranshu" },
  notes: { name: "notes", title: "notes — by tofu" },
  reading: { name: "reading", title: "reading — tofu's picks" },
  tofu: { name: "tofu", title: "tofu's room" },
  about: { name: "about", title: "about pranshu" },
};

export const DOCK_ORDER: AppId[] = ["about", "projects", "terminal", "notes", "reading", "tofu"];

export const titleOf = (kind: WinKind, arg?: string) => (kind === "project" ? (arg ?? "project") : APPS[kind].title);

export type AppCtx = {
  data: OsData;
  /** phone layout */
  compact: boolean;
  openApp: (id: AppId) => void;
  openProject: (name: string) => void;
  close: () => void;
  onSnake: (on: boolean) => void;
};

/** one window's (or phone screen's) content */
export function AppView({ kind, arg, ctx }: { kind: WinKind; arg?: string; ctx: AppCtx }): ReactNode {
  const { data } = ctx;
  switch (kind) {
    case "projects":
      return <ProjectsApp repos={data.repos} featured={data.featured} onOpen={ctx.openProject} compact={ctx.compact} />;
    case "project":
      return <ProjectDetail name={arg ?? ""} repos={data.repos} featured={data.featured} />;
    case "terminal":
      return <TerminalApp openApp={ctx.openApp} close={ctx.close} onSnake={ctx.onSnake} />;
    case "notes":
      return <NotesApp notes={data.notes} compact={ctx.compact} />;
    case "reading":
      return <ReadingApp reading={data.reading} topics={data.topics} />;
    case "tofu":
      return data.slots.tofu;
    case "about":
      return data.slots.about;
  }
}
