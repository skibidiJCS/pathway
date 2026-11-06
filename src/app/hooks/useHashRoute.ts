import { useCallback, useEffect, useState } from "react";
import { parseHash, routeToHash, type Route } from "../../../lib/routes";

/**
 * The current view lives in the URL hash, so Back and Forward move between
 * views and any paper can be linked to.
 */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const sync = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeToHash(next);
    if (window.location.hash === hash) {
      setRoute(next);
    } else {
      // Assigning the hash adds a history entry and fires hashchange.
      window.location.hash = hash;
    }
  }, []);

  return { route, navigate };
}
