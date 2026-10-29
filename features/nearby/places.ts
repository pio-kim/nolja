// Restaurants and cafes around a base point, from Google Places (New) Nearby
// Search and, for Korea, the NAVER local search as a supplement.
import { haversineKm, roundKm, type LatLng } from "@/lib/geo";

export type PlaceCategory = "restaurant" | "cafe";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  kind: string | null; // e.g. "한식", "카페"
  lat: number;
  lng: number;
  distanceKm: number;
  rating: number | null;
  reviewCount: number;
  priceLevel: string | null;
  openNow: boolean | null;
  photoName: string | null;
  photoCredit: string | null;
  mapsUrl: string;
  source: "google" | "naver";
};

export const NEARBY_RADIUS_KM = 3;
const MIN_REVIEWS_FOR_RANKING = 20;

export type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  currentOpeningHours?: { openNow?: boolean };
  primaryTypeDisplayName?: { text?: string };
  photos?: { name?: string; authorAttributions?: { displayName?: string }[] }[];
  googleMapsUri?: string;
};

const PRICE_LEVEL: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "₩",
  PRICE_LEVEL_MODERATE: "₩₩",
  PRICE_LEVEL_EXPENSIVE: "₩₩₩",
  PRICE_LEVEL_VERY_EXPENSIVE: "₩₩₩₩",
};

export function fromGooglePlaces(places: GooglePlace[], base: LatLng, category: PlaceCategory): Place[] {
  return places.flatMap((p) => {
    const lat = p.location?.latitude;
    const lng = p.location?.longitude;
    if (!p.id || !p.displayName?.text || lat === undefined || lng === undefined) return [];
    const km = haversineKm(base, { lat, lng });
    if (km > NEARBY_RADIUS_KM) return [];
    const photo = p.photos?.[0];
    return [
      {
        id: p.id,
        name: p.displayName.text,
        category,
        kind: p.primaryTypeDisplayName?.text ?? null,
        lat,
        lng,
        distanceKm: roundKm(km),
        rating: p.rating ?? null,
        reviewCount: p.userRatingCount ?? 0,
        priceLevel: (p.priceLevel && PRICE_LEVEL[p.priceLevel]) || null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        photoName: photo?.name ?? null,
        photoCredit: photo?.authorAttributions?.[0]?.displayName ?? null,
        mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        source: "google",
      },
    ];
  });
}

export type PlaceSort = "rating" | "distance";

// Rating order puts places with enough reviews first so a handful of perfect
// scores does not outrank well-reviewed places; unrated places go last.
function ratingTier(p: Place): number {
  if (p.rating === null) return 2;
  return p.reviewCount < MIN_REVIEWS_FOR_RANKING ? 1 : 0;
}

export function sortPlaces(places: Place[], sort: PlaceSort): Place[] {
  const byDistance = (a: Place, b: Place) => a.distanceKm - b.distanceKm;
  if (sort === "distance") return [...places].sort(byDistance);
  return [...places].sort(
    (a, b) => ratingTier(a) - ratingTier(b) || (b.rating ?? 0) - (a.rating ?? 0) || byDistance(a, b),
  );
}
