// Server-only calls for nearby places. Request shapes follow the Google Maps
// Platform agent skill references (places:searchNearby, Place Photos) and the
// NAVER API HUB local search docs, all checked 2026-10-29.
import type { LatLng } from "@/lib/geo";

import type { NaverItem } from "./naver";
import { NEARBY_RADIUS_KM, type GooglePlace, type PlaceCategory } from "./places";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SOLUTION_ID = "gmp_git_agentskills_v1";
const NAVER_LOCAL_URL = "https://naverapihub.apigw.ntruss.com/search/v1/local";

const NEARBY_FIELDS = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.currentOpeningHours.openNow",
  "places.primaryTypeDisplayName",
  "places.photos",
  "places.googleMapsUri",
].join(",");

type FetchDep = { fetch?: typeof fetch };

export async function searchGoogleNearby(
  base: LatLng,
  category: PlaceCategory,
  deps: { apiKey: string } & FetchDep,
): Promise<GooglePlace[]> {
  const doFetch = deps.fetch ?? fetch;
  const res = await doFetch(`${PLACES_BASE}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": deps.apiKey,
      "X-Goog-FieldMask": NEARBY_FIELDS,
      "X-Goog-Maps-Solution-ID": SOLUTION_ID,
    },
    body: JSON.stringify({
      includedTypes: [category],
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      languageCode: "ko",
      regionCode: "kr",
      locationRestriction: {
        circle: { center: { latitude: base.lat, longitude: base.lng }, radius: NEARBY_RADIUS_KM * 1000 },
      },
    }),
  });
  if (!res.ok) throw new Error(`Nearby Search failed: ${res.status}`);
  return ((await res.json()) as { places?: GooglePlace[] }).places ?? [];
}

export async function searchNaverLocal(
  query: string,
  deps: { clientId: string; clientSecret: string } & FetchDep,
): Promise<NaverItem[]> {
  const doFetch = deps.fetch ?? fetch;
  const params = new URLSearchParams({ query, display: "5", start: "1", sort: "comment" });
  const res = await doFetch(`${NAVER_LOCAL_URL}?${params}`, {
    headers: { "X-NCP-APIGW-API-KEY-ID": deps.clientId, "X-NCP-APIGW-API-KEY": deps.clientSecret },
  });
  if (!res.ok) throw new Error(`NAVER local search failed: ${res.status}`);
  return ((await res.json()) as { items?: NaverItem[] }).items ?? [];
}

// Returns a short-lived image URL so the API key never reaches the browser.
export async function placePhotoUri(
  photoName: string,
  maxWidthPx: number,
  deps: { apiKey: string } & FetchDep,
): Promise<string | null> {
  const doFetch = deps.fetch ?? fetch;
  const params = new URLSearchParams({
    maxWidthPx: String(maxWidthPx),
    skipHttpRedirect: "true",
    key: deps.apiKey,
    solution_id: SOLUTION_ID,
  });
  const res = await doFetch(`${PLACES_BASE}/${photoName}/media?${params}`);
  if (!res.ok) return null;
  return ((await res.json()) as { photoUri?: string }).photoUri ?? null;
}
