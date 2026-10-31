// NAVER API HUB local search results (GET /search/v1/local), used only as a
// Korean supplement. Fields follow api.ncloud-docs.com (2026-09-17): no rating,
// photo or opening hours; mapx/mapy are WGS84 longitude/latitude.
import { haversineKm, roundKm, type LatLng } from "@/lib/geo";

import { NEARBY_RADIUS_KM, type Place, type PlaceCategory } from "./places";

export type NaverItem = {
  title?: string;
  link?: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
};

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "").trim();

// The docs only say WGS84 and the real format is not confirmed yet (확인 필요),
// so both 10^7-scaled integers and plain decimals are accepted.
function coordinate(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) > 1000 ? n / 1e7 : n;
}

export function fromNaverItems(
  items: NaverItem[],
  base: LatLng,
  category: PlaceCategory,
  radiusKm: number = NEARBY_RADIUS_KM,
): Place[] {
  return items.flatMap((item) => {
    const name = stripTags(item.title ?? "");
    const lng = coordinate(item.mapx);
    const lat = coordinate(item.mapy);
    if (!name || lat === null || lng === null) return [];
    const km = haversineKm(base, { lat, lng });
    if (km > radiusKm) return [];
    return [
      {
        id: `naver:${name}:${item.mapx}:${item.mapy}`,
        name,
        category,
        kind: item.category?.split(">").pop()?.trim() || null,
        lat,
        lng,
        distanceKm: roundKm(km),
        rating: null,
        reviewCount: 0,
        priceLevel: null,
        openNow: null,
        photoName: null,
        photoCredit: null,
        mapsUrl: `https://map.naver.com/p/search/${encodeURIComponent(name)}`,
        source: "naver",
      },
    ];
  });
}

const SAME_PLACE_KM = 0.05;
const nameKey = (p: Place) => p.name.replace(/\s/g, "");

// Google entries come first and win: they carry ratings, photos and hours.
export function mergePlaces(google: Place[], naver: Place[]): Place[] {
  const merged = [...google];
  for (const p of naver) {
    const duplicate = merged.some((q) => nameKey(q) === nameKey(p) && haversineKm(q, p) <= SAME_PLACE_KM);
    if (!duplicate) merged.push(p);
  }
  return merged;
}
