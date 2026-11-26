"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

const THEME_STORAGE_KEY = "tt_theme";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

export function useStudyTheme() {
  return useContext(ThemeContext);
}

export default function Providers({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        document.documentElement.dataset.theme = stored;
      } else if (document.documentElement.dataset.theme === "dark") {
        setTheme("dark");
      }
    } catch {
      // Ignore storage access restrictions.
    }
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage access restrictions.
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Theme theme={neutralTheme} mode={theme}>
        <div className="study-root">{children}</div>
      </Theme>
    </ThemeContext.Provider>
  );
}
