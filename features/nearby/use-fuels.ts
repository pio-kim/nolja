"use client";

import { useEffect, useState } from "react";

import type { FuelInfo } from "./kakao";
import type { Place } from "./places";

// Kept for the life of the page, so tabs and bases switched back show at once.
const loaded = new Map<string, Promise<FuelInfo | null>>();

function loadFuel(query: string): Promise<FuelInfo | null> {
  let fuel = loaded.get(query);
  if (!fuel) {
    fuel = fetch(`/api/nearby/fuel?${query}`)
      .then((res) => (res.ok ? res.json() : { fuel: null }))
      .then((json: { fuel: FuelInfo | null }) => json.fuel)
      .catch(() => {
        loaded.delete(query);
        return null;
      });
    loaded.set(query, fuel);
  }
  return fuel;
}

// The fuels each gas station sells, by place id. A missing id is still loading;
// null means Kakao has no fuel data for it.
export function useFuels(places: Place[], area: string | null): Record<string, FuelInfo | null> {
  const queries = places.map((p) => ({
    id: p.id,
    query: new URLSearchParams({ name: p.name, lat: String(p.lat), lng: String(p.lng), ...(area && { area }) }).toString(),
  }));
  const key = queries.map((q) => q.query).join("|");
  const [found, setFound] = useState<Record<string, FuelInfo | null>>({});

  useEffect(() => {
    let active = true;
    for (const query of key ? key.split("|") : []) {
      loadFuel(query).then((fuel) => active && setFound((prev) => (query in prev ? prev : { ...prev, [query]: fuel })));
    }
    return () => {
      active = false;
    };
  }, [key]);

  return Object.fromEntries(queries.filter((q) => q.query in found).map((q) => [q.id, found[q.query]]));
}
