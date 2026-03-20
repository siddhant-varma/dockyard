"use client";

/**
 * useTheme — smooth dark/light mode toggle with localStorage persistence.
 *
 * Reads initial state from localStorage or system preference.
 * Toggles the `dark` class on <html> for Tailwind dark mode.
 * Persists choice to localStorage as 'dockyard-theme'.
 *
 * The initial flash is prevented by the inline <script> in layout.tsx
 * that sets the class before React hydrates.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "dockyard-theme";

function getSnapshot(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

function subscribe(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Hook for managing the application theme.
 *
 * @returns Current theme, resolved isDark boolean, and setTheme function
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isDark =
    theme === "dark" ||
    (typeof window !== "undefined" &&
      theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY, newValue: newTheme })
    );
  }, []);

  const toggle = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  return { theme, isDark, setTheme, toggle };
}
