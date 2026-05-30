"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const SKINS = ["editorial", "mono", "serif"] as const;
export type Skin = (typeof SKINS)[number];
export type Theme = "light" | "dark";

type Appearance = {
  skin: Skin;
  theme: Theme;
  setSkin: (s: Skin) => void;
  setTheme: (t: Theme) => void;
  cycleSkin: () => void;
  toggleTheme: () => void;
};

const AppearanceContext = createContext<Appearance | null>(null);

// Runs before paint to avoid a flash of the wrong skin/theme.
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
}})();`;

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkinState] = useState<Skin>("editorial");
  const [theme, setThemeState] = useState<Theme>("light");

  // hydrate from what the no-flash script already applied
  useEffect(() => {
    const d = document.documentElement;
    setSkinState((d.getAttribute("data-skin") as Skin) || "editorial");
    setThemeState((d.getAttribute("data-theme") as Theme) || "light");
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

  const cycleSkin = useCallback(() => {
    setSkin(SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length]);
  }, [skin, setSkin]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <AppearanceContext.Provider value={{ skin, theme, setSkin, setTheme, cycleSkin, toggleTheme }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider");
  return ctx;
}
