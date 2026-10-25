"use client";

import { useEffect } from "react";

/**
 * Reads the persisted theme preference before first paint
 * to prevent the dark/light flash on page load.
 */
export function ThemeInitializer() {
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const theme = saved ?? "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return null;
}
