// Kakao Map place search results (the JSON map.kakao.com itself loads from
// search.map.kakao.com/mapsearch/map.daum). It is not a published API: it is
// used only to show a place's map photo where Google Places returns none,
// since Google gives no place photos for Korea. Fields checked 2026-10-30.
import { haversineKm, type LatLng } from "@/lib/geo";

export type KakaoPlace = { name?: string; lat?: number | string; lon?: number | string; img?: string };

const SAME_PLACE_KM = 0.15;
const nameKey = (s: string) => s.replace(/\s/g, "").toLowerCase();

// The result for the same place: within 150m, preferring an exact name match.
export function matchKakaoPhoto(places: KakaoPlace[], target: { name: string } & LatLng): string | null {
  const near = places.flatMap((p) => {
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    if (!p.img || !p.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const km = haversineKm(target, { lat, lng });
    return km <= SAME_PLACE_KM ? [{ img: p.img, sameName: nameKey(p.name) === nameKey(target.name), km }] : [];
  });
  near.sort((a, b) => Number(b.sameName) - Number(a.sameName) || a.km - b.km);
  return near[0] ? kakaoThumbnail(near[0].img) : null;
}

// Kakao's own thumbnail service; originals are often over 1MB.
export function kakaoThumbnail(img: string, size = 320): string {
  const original = img.replace(/^http:/, "https:");
  return `https://img1.kakaocdn.net/cthumb/local/C${size}x${size}.q50/?fname=${encodeURIComponent(original)}`;
}

// "강원특별자치도 강릉시 금성로 21" → "강릉시": the city or county narrows Kakao's
// search, which takes no coordinates and otherwise favors the user's region.
export function areaOf(address: string): string | null {
  const parts = address.split(/\s+/);
  return parts.find((p, i) => i > 0 && /(시|군)$/.test(p)) ?? parts.find((p) => /(시|군|구)$/.test(p)) ?? null;
}
