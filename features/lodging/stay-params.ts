import type { LodgingStay } from "./serpapi";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Reads the stay a lodging request is for; null when the request is malformed.
export function readLodgingStay(params: URLSearchParams): LodgingStay | null {
  const query = params.get("query")?.trim();
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults"));
  const children = Number(params.get("children") ?? "0");
  if (!query || !ISO_DATE.test(checkIn) || !ISO_DATE.test(checkOut)) return null;
  if (!Number.isInteger(adults) || adults < 1 || !Number.isInteger(children) || children < 0) return null;
  return { query, checkIn, checkOut, adults, children };
}

export function toLodgingParams(stay: LodgingStay): URLSearchParams {
  return new URLSearchParams({
    query: stay.query,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
    children: String(stay.children),
  });
}
