"use client";

import { useCallback, useEffect, useState } from "react";

import type { WeatherReport } from "./forecast";

export type WeatherQuery = { lat: number; lng: number; checkIn: string; checkOut: string };

export type WeatherState =
  | { status: "loading" }
  | { status: "error"; reason: "missing-key" | "failed" }
  | { status: "ready"; report: WeatherReport };

export function useWeather(query: WeatherQuery) {
  const key = new URLSearchParams({
    lat: String(query.lat),
    lng: String(query.lng),
    checkIn: query.checkIn,
    checkOut: query.checkOut,
  }).toString();
  const [attempt, setAttempt] = useState(0);
  const [results, setResults] = useState<Record<string, WeatherState>>({});
  const requestKey = `${key}#${attempt}`;
  const done = results[requestKey];

  useEffect(() => {
    if (done) return;
    const controller = new AbortController();
    fetch(`/api/weather?${key}`, { signal: controller.signal })
      .then(async (res): Promise<WeatherState> => {
        if (res.status === 503) return { status: "error", reason: "missing-key" };
        if (!res.ok) return { status: "error", reason: "failed" };
        return { status: "ready", report: (await res.json()) as WeatherReport };
      })
      .catch((error: Error): WeatherState | null =>
        error.name === "AbortError" ? null : { status: "error", reason: "failed" },
      )
      .then((state) => state && setResults((prev) => ({ ...prev, [requestKey]: state })));
    return () => controller.abort();
  }, [done, key, requestKey]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state: done ?? ({ status: "loading" } as WeatherState), retry };
}
