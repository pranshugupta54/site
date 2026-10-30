"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SEASONS, SEASON_KEY, getSeason, pickSeason, type Season } from "@/data/seasons";

export const SKINS = ["editorial", "mono", "serif"] as const;
export type Skin = (typeof SKINS)[number];
export type Theme = "light" | "dark";

type Appearance = {
  skin: Skin;
  theme: Theme;
  season: Season | null;
  setSkin: (s: Skin) => void;
  setTheme: (t: Theme) => void;
  cycleSkin: () => void;
  toggleTheme: () => void;
  /** a season id or "off" pins it for this tab; "auto" goes back to the calendar */
  setSeason: (v: string) => void;
};

const AppearanceContext = createContext<Appearance | null>(null);

const SEASON_WINDOWS = JSON.stringify(SEASONS.map(({ id, start, end }) => ({ id, start, end })));

// Runs before paint to avoid a flash of the wrong skin/theme/season.
// ?season=<id>|off|auto previews a season off-calendar for the rest of the tab.
export const NO_FLASH_SCRIPT = `(function(){try{
  var d=document.documentElement;
  var s=localStorage.getItem('skin')||'editorial';
  var t=localStorage.getItem('theme');
  if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
  d.setAttribute('data-skin',s);
  d.setAttribute('data-theme',t);
}catch(e){
  document.documentElement.setAttribute('data-skin','editorial');
  document.documentElement.setAttribute('data-theme','light');
}
try{
  var q=new URLSearchParams(location.search).get('season');
  if(q==='auto')sessionStorage.removeItem('${SEASON_KEY}');
  else if(q)sessionStorage.setItem('${SEASON_KEY}',q);
  var o=null;try{o=sessionStorage.getItem('${SEASON_KEY}');}catch(e){}
  var id=(${pickSeason.toString()})(new Date(),${SEASON_WINDOWS},o);
  if(id)document.documentElement.setAttribute('data-season',id);
}catch(e){}})();`;

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("editorial");
  const [theme, setThemeState] = useState<Theme>("light");
  const [season, setSeasonState] = useState<Season | null>(null);

  // hydrate from what the no-flash script already applied
  useEffect(() => {
    const d = document.documentElement;
    setSkinState((d.getAttribute("data-skin") as Skin) || "editorial");
    setThemeState((d.getAttribute("data-theme") as Theme) || "light");
    setSeasonState(getSeason(d.getAttribute("data-season")));
  }, []);

  const setSkin = useCallback((s: Skin) => {
    document.documentElement.setAttribute("data-skin", s);
    localStorage.setItem("skin", s);
    setSkinState(s);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
    setThemeState(t);
  }, []);

  const setSeason = useCallback((v: string) => {
    try {
      if (v === "auto") sessionStorage.removeItem(SEASON_KEY);
      else sessionStorage.setItem(SEASON_KEY, v);
    } catch {
      /* storage blocked — still apply for this page */
    }
    const id = pickSeason(new Date(), SEASONS, v === "auto" ? null : v);
    const d = document.documentElement;
    if (id) d.setAttribute("data-season", id);
    else d.removeAttribute("data-season");
    setSeasonState(getSeason(id));
  }, []);

  const cycleSkin = useCallback(() => {
    setSkin(SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length]);
  }, [skin, setSkin]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <AppearanceContext.Provider
      value={{ skin, theme, season, setSkin, setTheme, cycleSkin, toggleTheme, setSeason }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
