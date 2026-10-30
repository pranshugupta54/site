import { ViewTransition } from "react";

// The name on / and each page's heading share one view-transition name, so the
// heading slides into the next page's instead of fading with the page. See globals.css.
export function TitleMorph({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="page-title" share="auto" default="none">
      {children}
    </ViewTransition>
  );
}
