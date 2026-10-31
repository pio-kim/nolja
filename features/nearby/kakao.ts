// Kakao Map place search results (the JSON map.kakao.com itself loads from
// search.map.kakao.com/mapsearch/map.daum). It is not a published API: it is
// used only for what Google Places returns nothing for in Korea, a place's map
// photo and a gas station's fuels. Fields checked 2026-10-30.
import { haversineKm, type LatLng } from "@/lib/geo";

export type KakaoPlace = {
  name?: string;
  lat?: number | string;
  lon?: number | string;
  img?: string;
  // Gas station prices in won per litre, "0" when not sold or unknown. The
  // order was read from live results, not documentation: an LPG-only station
  // fills only oil4, and a regular station fills oil1 and oil3.
  oil1?: string; // 휘발유
  oil2?: string; // 고급휘발유
  oil3?: string; // 경유
  oil4?: string; // LPG
  oilTime?: string; // "2026.10.29 09:34"
  oil_self?: string; // "Y" | "N" | ""
  oil_sel24?: string; // 24 hours, "Y" | "N" | ""
};

const SAME_PLACE_KM = 0.15;
const nameKey = (s: string) => s.replace(/\s/g, "").toLowerCase();

// The result for the same place among those `usable` accepts: within 150m,
// preferring an exact name match.
export function matchKakaoPlace(
  places: KakaoPlace[],
  target: { name: string } & LatLng,
  usable: (p: KakaoPlace) => boolean = () => true,
): KakaoPlace | null {
  const near = places.flatMap((p) => {
    const lat = Number(p.lat);
    const lng = Number(p.lon);
    if (!p.name || !usable(p) || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const km = haversineKm(target, { lat, lng });
    return km <= SAME_PLACE_KM ? [{ place: p, sameName: nameKey(p.name) === nameKey(target.name), km }] : [];
  });
  near.sort((a, b) => Number(b.sameName) - Number(a.sameName) || a.km - b.km);
  return near[0]?.place ?? null;
}

export function matchKakaoPhoto(places: KakaoPlace[], target: { name: string } & LatLng): string | null {
  const place = matchKakaoPlace(places, target, (p) => Boolean(p.img));
  return place?.img ? kakaoThumbnail(place.img) : null;
}

// Kakao's own thumbnail service; originals are often over 1MB.
export function kakaoThumbnail(img: string, size = 320): string {
  const original = img.replace(/^http:/, "https:");
  return `https://img1.kakaocdn.net/cthumb/local/C${size}x${size}.q50/?fname=${encodeURIComponent(original)}`;
}

export type Fuel = "gasoline" | "premium" | "diesel" | "lpg";

export type FuelInfo = {
  prices: Partial<Record<Fuel, number>>; // only the fuels on sale
  updatedAt: string | null; // "2026-10-29T09:34", Korea time
  self: boolean | null;
  open24: boolean | null;
};

const FUEL_FIELDS: [Fuel, "oil1" | "oil2" | "oil3" | "oil4"][] = [
  ["gasoline", "oil1"],
  ["premium", "oil2"],
  ["diesel", "oil3"],
  ["lpg", "oil4"],
];

const yesNo = (v: string | undefined) => (v === "Y" ? true : v === "N" ? false : null);

// Null when Kakao has no fuel prices for the place.
export function fuelInfo(place: KakaoPlace): FuelInfo | null {
  const prices: FuelInfo["prices"] = {};
  for (const [fuel, field] of FUEL_FIELDS) {
    const price = Number(place[field]);
    if (Number.isFinite(price) && price > 0) prices[fuel] = price;
  }
  if (Object.keys(prices).length === 0) return null;
  const time = place.oilTime?.match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})$/);
  return {
    prices,
    updatedAt: time ? `${time[1]}-${time[2]}-${time[3]}T${time[4]}:${time[5]}` : null,
    self: yesNo(place.oil_self),
    open24: yesNo(place.oil_sel24),
  };
}

// "강원특별자치도 강릉시 금성로 21" → "강릉시": the city or county narrows Kakao's
// search, which takes no coordinates and otherwise favors the user's region.
export function areaOf(address: string): string | null {
  const parts = address.split(/\s+/);
  return parts.find((p, i) => i > 0 && /(시|군)$/.test(p)) ?? parts.find((p) => /(시|군|구)$/.test(p)) ?? null;
}
