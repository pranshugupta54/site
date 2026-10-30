"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

// Page content cross-fades on navigation; keyed by path so /skills → /skills/x fades too.
// Tofu, the shell and the season glyph live in the layout, outside this boundary; their own
// view-transition names keep them live and on top while the page fades. See globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <ViewTransition key={path} enter="page-fade" exit="page-fade" default="none">
      {children}
    </ViewTransition>
  );
}
