import { useEffect, useState } from "react";
import type { Theme } from "../app-types";

export function useInterfacePreferences() {
  const [compactSearchPlaceholder, setCompactSearchPlaceholder] = useState(
    () => window.matchMedia("(max-width: 620px)").matches,
  );
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pathway:theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 620px)");
    const updatePlaceholder = () =>
      setCompactSearchPlaceholder(media.matches);
    updatePlaceholder();
    media.addEventListener("change", updatePlaceholder);
    return () => media.removeEventListener("change", updatePlaceholder);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  return { compactSearchPlaceholder, theme, toggleTheme };
}
