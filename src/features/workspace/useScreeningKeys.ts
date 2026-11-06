import { useEffect, useRef } from "react";

interface ScreeningKeys {
  onUp: () => void;
  onDown: () => void;
  onSave: () => void;
  onSkip: () => void;
  onFollow: () => void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/** Arrow keys move, S saves, X skips, F follows. Never while typing. */
export function useScreeningKeys(handlers: ScreeningKeys, enabled = true) {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (isTyping(event.target)) return;
      const actions: Record<string, () => void> = {
        ArrowUp: latest.current.onUp,
        ArrowDown: latest.current.onDown,
        s: latest.current.onSave,
        x: latest.current.onSkip,
        f: latest.current.onFollow,
      };
      const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
