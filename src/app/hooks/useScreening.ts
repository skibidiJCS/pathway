import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadScreening,
  markSeen,
  markSkipped,
  SCREENING_KEY,
  skippedKey,
  storeScreening,
  type ScreenMap,
} from "../../../lib/screening";

/** Seen and skipped papers, remembered on this device. */
export function useScreening() {
  const [map, setMap] = useState<ScreenMap>(() => loadScreening());

  useEffect(() => storeScreening(map), [map]);

  const seen = useCallback((id: string) => setMap((current) => markSeen(current, id)), []);
  const skip = useCallback((id: string) => setMap((current) => markSkipped(current, id)), []);
  const unskip = useCallback(
    (id: string) =>
      setMap((current) => {
        if (current[id] !== "skipped") return current;
        return { ...current, [id]: "seen" };
      }),
    [],
  );
  // Rebuilt only when the skipped list changes, so seeing a paper does not
  // make every consumer of the skipped set recompute.
  const key = skippedKey(map);
  const skipped = useMemo(() => new Set(key ? key.split("\n") : []), [key]);

  // Keep two open tabs in step: adopt what another tab just wrote.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SCREENING_KEY) setMap(loadScreening());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { map, skipped, seen, skip, unskip };
}
