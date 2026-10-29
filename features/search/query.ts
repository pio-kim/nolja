import type { IsoDate, Stay } from "./stay";

export type SearchPlace = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export type SearchConditions = {
  place: SearchPlace;
  stay: Stay;
  adults: number;
  children: number;
};

export function toSearchQuery(c: SearchConditions): string {
  return new URLSearchParams({
    placeId: c.place.id,
    name: c.place.name,
    address: c.place.address,
    lat: String(c.place.lat),
    lng: String(c.place.lng),
    checkIn: c.stay.checkIn,
    checkOut: c.stay.checkOut,
    adults: String(c.adults),
    children: String(c.children),
  }).toString();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function numberParam(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function dateParam(params: URLSearchParams, key: string): IsoDate | null {
  const raw = params.get(key);
  return raw && ISO_DATE.test(raw) ? raw : null;
}

// Reads conditions back from a results URL. Returns null when the URL cannot
// describe a search; whether the stay is still bookable is checked separately.
export function parseSearchQuery(params: URLSearchParams): SearchConditions | null {
  const id = params.get("placeId");
  const name = params.get("name");
  const lat = numberParam(params, "lat");
  const lng = numberParam(params, "lng");
  const checkIn = dateParam(params, "checkIn");
  const checkOut = dateParam(params, "checkOut");
  const adults = numberParam(params, "adults");
  const children = numberParam(params, "children") ?? 0;
  if (!id || !name || lat === null || lng === null || !checkIn || !checkOut) return null;
  if (adults === null || !Number.isInteger(adults) || adults < 1) return null;
  if (!Number.isInteger(children) || children < 0) return null;
  return {
    place: { id, name, address: params.get("address") ?? "", lat, lng },
    stay: { checkIn, checkOut },
    adults,
    children,
  };
}
