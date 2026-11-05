import { useEffect, useState } from "react";
import type { Theme } from "../app-types";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

export function useInterfacePreferences() {
  const compactSearchPlaceholder = useMediaQuery("(max-width: 620px)");
  /** Below this width the sidebar becomes a drawer. Keep in sync with globals.css. */
  const compactLayout = useMediaQuery("(max-width: 1023px)");
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("pathway:theme", theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
  };

  return { compactSearchPlaceholder, compactLayout, theme, toggleTheme };
}
