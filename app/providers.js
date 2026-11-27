"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { SUBJECT_BG_MAP } from "@/lib/landing-data";
import {
  prefersReducedMotion,
  readFocusSubject,
  writeFocusSubject,
} from "@/lib/motion";

const THEME_STORAGE_KEY = "tt_theme";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => "light",
  focusSubject: "ALL",
  setFocusSubject: () => "ALL",
});

export function useStudyTheme() {
  return useContext(ThemeContext);
}

export default function Providers({ children }) {
  const [theme, setTheme] = useState("light");
  const [focusSubject, setFocusSubjectState] = useState("ALL");
  const themeRef = useRef("light");
  const activeTransitionRef = useRef(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        themeRef.current = stored;
        setTheme(stored);
        document.documentElement.dataset.theme = stored;
      } else if (document.documentElement.dataset.theme === "dark") {
        themeRef.current = "dark";
        setTheme("dark");
      }
    } catch {
      // Ignore storage access restrictions.
    }
    setFocusSubjectState(readFocusSubject());
  }, []);

  function setFocusSubject(code) {
    const next = writeFocusSubject(code);
    setFocusSubjectState(next);
    return next;
  }

  function toggleTheme(originRect) {
    const next = themeRef.current === "light" ? "dark" : "light";

    const applyTheme = () => {
      themeRef.current = next;
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage access restrictions.
      }
      setTheme(next);
    };

    if (
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !prefersReducedMotion()
    ) {
      const root = document.documentElement;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect =
        originRect && originRect.width > 0
          ? originRect
          : { top: 10, right: vw - 16, bottom: 54, left: vw - 60 };
      root.style.setProperty("--vt-t", `${Math.max(0, Math.round(rect.top))}px`);
      root.style.setProperty(
        "--vt-r",
        `${Math.max(0, Math.round(vw - rect.right))}px`
      );
      root.style.setProperty(
        "--vt-b",
        `${Math.max(0, Math.round(vh - rect.bottom))}px`
      );
      root.style.setProperty(
        "--vt-l",
        `${Math.max(0, Math.round(rect.left))}px`
      );

      try {
        activeTransitionRef.current?.skipTransition?.();
      } catch {
        // Ignore already skipped transitions.
      }

      const vt = document.startViewTransition(() => {
        flushSync(applyTheme);
      });
      activeTransitionRef.current = vt;
      vt.finished.catch(() => {}).finally(() => {
        if (activeTransitionRef.current === vt) {
          activeTransitionRef.current = null;
        }
      });
      return next;
    }

    applyTheme();
    return next;
  }

  const focusBg =
    focusSubject !== "ALL" ? SUBJECT_BG_MAP[focusSubject] : undefined;

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, focusSubject, setFocusSubject }}
    >
      <Theme theme={neutralTheme} mode={theme}>
        <div
          className="study-root"
          data-focus-subject={focusSubject !== "ALL" ? focusSubject : undefined}
          style={focusBg ? { "--focus-subj-bg": focusBg } : undefined}
        >
          {children}
        </div>
      </Theme>
    </ThemeContext.Provider>
  );
}
