"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

// Page content fades on navigation (old out, then new in); keyed by path so /skills → /skills/x fades too.
// Tofu, the shell and the season glyph live in the layout, outside this boundary; their own
// view-transition names keep them live and on top while the page fades. See globals.css.
// /wrapped/<slide> is one story whose url follows the slide (replaceState): keying on
// the full path would remount it, and lose its place, on every slide.
const transitionKey = (path: string) => (path === "/wrapped" || path.startsWith("/wrapped/") ? "/wrapped" : path);

export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <ViewTransition key={transitionKey(path)} enter="page-fade" exit="page-fade" default="none">
      {children}
    </ViewTransition>
  );
}
