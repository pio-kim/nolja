"use client";

import { useCallback, useEffect, useState } from "react";

import { runLimited } from "./run-limited";
import type { LodgingStay } from "./serpapi";
import type { Seller } from "./sellers";
import { toLodgingParams } from "./stay-params";

export type SellersState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; taxIncluded: Seller[]; other: Seller[]; fetchedAt: string };

// Kept low: on HTTP/1.1 the browser opens only six connections to this origin,
// and the rest are needed for navigation, photos and the other tabs.
const CONCURRENCY = 2;

async function fetchSellers(stayKey: string, id: string, signal: AbortSignal): Promise<SellersState> {
  const params = new URLSearchParams(stayKey);
  params.set("token", id);
  try {
    const res = await fetch(`/api/lodgings/sellers?${params}`, { signal });
    if (!res.ok) return { status: "error" };
    const json = await res.json();
    return { status: "ready", taxIncluded: json.taxIncluded, other: json.other, fetchedAt: json.fetchedAt };
  } catch {
    return { status: "error" };
  }
}

// Looks up every listed lodging's seller prices in the background, a few at a
// time, so cards can name the cheapest seller and the detail sheet opens at once.
// The stay is fixed for the hook's lifetime; remount the caller for a new search.
// Leaving stops the queue and aborts its requests, so an old search does not
// hold connections the next screen needs.
export function useSellerPrefetch(ids: string[], stay: LodgingStay) {
  const [byId, setById] = useState<Record<string, SellersState>>({});
  const [queue] = useState(() => {
    const stayKey = toLodgingParams(stay).toString();
    return runLimited<string>(CONCURRENCY, async (id, signal) => {
      const state = await fetchSellers(stayKey, id, signal);
      if (!signal.aborted) setById((prev) => ({ ...prev, [id]: state }));
    });
  });

  const idsKey = ids.join(",");
  useEffect(() => {
    if (idsKey) queue.add(idsKey.split(","));
  }, [idsKey, queue]);
  useEffect(() => () => queue.stop(), [queue]);

  const prioritize = useCallback((id: string) => queue.prioritize(id), [queue]);
  const get = useCallback((id: string): SellersState => byId[id] ?? { status: "loading" }, [byId]);
  return { get, prioritize };
}
