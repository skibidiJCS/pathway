import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadScreening,
  markSeen,
  markSkipped,
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
  const skipped = useMemo(
    () =>
      new Set(
        Object.entries(map)
          .filter(([, state]) => state === "skipped")
          .map(([id]) => id),
      ),
    [map],
  );

  return { map, skipped, seen, skip, unskip };
}
