"use client";

import { useCallback, useEffect, useState } from "react";

import type { LatLng, Lodging } from "./lodgings";
import type { LodgingStay } from "./serpapi";
import { toLodgingParams } from "./stay-params";

export type LodgingsState =
  | { status: "loading" }
  | { status: "error"; reason: "missing-key" | "failed" }
  | { status: "ready"; lodgings: Lodging[]; fetchedAt: string };

type Result = { key: string; state: LodgingsState };

export function useLodgings(stay: LodgingStay, origin: LatLng) {
  const params = toLodgingParams(stay);
  params.set("lat", String(origin.lat));
  params.set("lng", String(origin.lng));
  const key = params.toString();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const requestKey = `${key}#${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/lodgings?${key}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (res.status === 503) return { status: "error", reason: "missing-key" } as const;
        if (!res.ok) return { status: "error", reason: "failed" } as const;
        return { status: "ready", lodgings: json.lodgings as Lodging[], fetchedAt: json.fetchedAt as string } as const;
      })
      .catch((error: Error) =>
        error.name === "AbortError" ? null : ({ status: "error", reason: "failed" } as const),
      )
      .then((state) => state && setResult({ key: requestKey, state }));
    return () => controller.abort();
  }, [key, requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: LodgingsState = result?.key === requestKey ? result.state : { status: "loading" };
  return { state, retry };
}
