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

const CONCURRENCY = 4;

async function fetchSellers(stayKey: string, id: string): Promise<SellersState> {
  const params = new URLSearchParams(stayKey);
  params.set("token", id);
  try {
    const res = await fetch(`/api/lodgings/sellers?${params}`);
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
export function useSellerPrefetch(ids: string[], stay: LodgingStay) {
  const [byId, setById] = useState<Record<string, SellersState>>({});
  const [queue] = useState(() => {
    const stayKey = toLodgingParams(stay).toString();
    return runLimited<string>(CONCURRENCY, async (id) => {
      const state = await fetchSellers(stayKey, id);
      setById((prev) => ({ ...prev, [id]: state }));
    });
  });

  const idsKey = ids.join(",");
  useEffect(() => {
    if (idsKey) queue.add(idsKey.split(","));
  }, [idsKey, queue]);

  const prioritize = useCallback((id: string) => queue.prioritize(id), [queue]);
  const get = useCallback((id: string): SellersState => byId[id] ?? { status: "loading" }, [byId]);
  return { get, prioritize };
}
