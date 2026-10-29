// Turns SerpApi Google Hotels results into the lodging list the results screen shows.
// Field names follow https://serpapi.com/google-hotels-api (checked 2026-10-29).

export type LatLng = { lat: number; lng: number };

export type LodgingType = "motel" | "hotel" | "resort" | "other";

export type Lodging = {
  id: string; // SerpApi property_token
  name: string;
  type: LodgingType;
  lat: number;
  lng: number;
  distanceKm: number;
  totalPrice: number;
  pricePerNight: number | null;
  taxIncluded: boolean | null;
  lowestSource: string | null;
  rating: number | null;
  reviewCount: number;
  photo: string | null;
};

type Rate = { extracted_lowest?: number; extracted_before_taxes_fees?: number };

export type SerpProperty = {
  type?: string;
  name?: string;
  property_token?: string;
  gps_coordinates?: { latitude?: number; longitude?: number };
  rate_per_night?: Rate;
  total_rate?: Rate;
  prices?: { source?: string; rate_per_night?: Rate }[];
  overall_rating?: number;
  reviews?: number;
  images?: { thumbnail?: string; original_image?: string }[];
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

const roundKm = (km: number) => Math.round(km * 10) / 10;

function lodgingType(p: SerpProperty): LodgingType {
  const name = p.name ?? "";
  if (/모텔|motel/i.test(name)) return "motel";
  if (/리조트|resort/i.test(name)) return "resort";
  // Google lists guesthouses and stays as hotels; they read as plain lodging here.
  if (/게스트하우스|guest ?house|스테이|stay|펜션|민박|한옥/i.test(name)) return "other";
  if (p.type === "hotel") return "hotel";
  return "other";
}

// The total is tax-inclusive when it is larger than the pre-tax amount; equal
// amounts can mean either no tax or a pre-tax display, so it stays unknown.
export function isTaxIncluded(rate: Rate | undefined): boolean | null {
  const total = rate?.extracted_lowest;
  const beforeTax = rate?.extracted_before_taxes_fees;
  if (total === undefined || beforeTax === undefined) return null;
  return total > beforeTax ? true : null;
}

function lowestSource(p: SerpProperty): string | null {
  let best: { source: string; rate: number } | null = null;
  for (const price of p.prices ?? []) {
    const rate = price.rate_per_night?.extracted_lowest;
    if (!price.source || rate === undefined) continue;
    if (!best || rate < best.rate) best = { source: price.source, rate };
  }
  return best?.source ?? null;
}

function toLodging(p: SerpProperty, origin: LatLng, radiusKm: number): Lodging | null {
  const lat = p.gps_coordinates?.latitude;
  const lng = p.gps_coordinates?.longitude;
  const total = p.total_rate?.extracted_lowest;
  if (!p.property_token || !p.name || lat === undefined || lng === undefined || total === undefined) return null;
  const exactKm = haversineKm(origin, { lat, lng });
  if (exactKm > radiusKm) return null;
  return {
    id: p.property_token,
    name: p.name,
    type: lodgingType(p),
    lat,
    lng,
    distanceKm: roundKm(exactKm),
    totalPrice: total,
    pricePerNight: p.rate_per_night?.extracted_lowest ?? null,
    taxIncluded: isTaxIncluded(p.total_rate),
    lowestSource: lowestSource(p),
    rating: p.overall_rating ?? null,
    reviewCount: p.reviews ?? 0,
    photo: p.images?.[0]?.thumbnail ?? null,
  };
}

export function toLodgings(properties: SerpProperty[], origin: LatLng, radiusKm: number): Lodging[] {
  return properties
    .map((p) => toLodging(p, origin, radiusKm))
    .filter((l): l is Lodging => l !== null)
    .sort((a, b) => a.totalPrice - b.totalPrice)
    .filter((l, i, all) => all.findIndex((o) => o.id === l.id) === i);
}
