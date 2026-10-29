"use client";

import { useCallback, useEffect, useState } from "react";

import type { Place, PlaceCategory } from "./places";

export type NearbyBase = { name: string; lat: number; lng: number };

export type PlacesState =
  | { status: "loading" }
  | { status: "error"; reason: "missing-key" | "failed" }
  | { status: "ready"; places: Place[] };

// Loads one category around one base point; results are kept per base and
// category so switching tabs or bases back does not refetch.
export function usePlaces(base: NearbyBase, category: PlaceCategory, enabled: boolean) {
  const key = new URLSearchParams({
    category,
    name: base.name,
    lat: String(base.lat),
    lng: String(base.lng),
  }).toString();
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<string, PlacesState>>({});
  const requestKey = `${key}#${attempt}`;
  const done = results[requestKey];

  useEffect(() => {
    if (!enabled || done) return;
    const controller = new AbortController();
    fetch(`/api/nearby?${key}`, { signal: controller.signal })
      .then(async (res): Promise<PlacesState> => {
        if (res.status === 503) return { status: "error", reason: "missing-key" };
        if (!res.ok) return { status: "error", reason: "failed" };
        return { status: "ready", places: (await res.json()).places as Place[] };
      })
      .catch((error: Error): PlacesState | null =>
        error.name === "AbortError" ? null : { status: "error", reason: "failed" },
      )
      .then((state) => state && setResults((prev) => ({ ...prev, [requestKey]: state })));
    return () => controller.abort();
  }, [enabled, done, key, requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state: done ?? ({ status: "loading" } as PlacesState), retry };
}
