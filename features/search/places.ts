// Server-only Places API (New) calls for finding the search place.
// Request shapes follow the Google Maps Platform agent skill references
// (places:autocomplete, places:searchText, places/{id}), checked 2026-10-29.
import type { SearchPlace } from "./query";

const PLACES_BASE = "https://places.googleapis.com/v1";
const SOLUTION_ID = "gmp_git_agentskills_v1";

// Rough bounding box of South Korea; country code filtering below is the real gate.
const KOREA_BOUNDS = {
  rectangle: {
    low: { latitude: 33.0, longitude: 124.5 },
    high: { latitude: 38.7, longitude: 131.0 },
  },
};

export type PlacesDeps = { apiKey: string; fetch?: typeof fetch };

export type TextSearchResult =
  | { kind: "none" }
  | { kind: "single"; place: SearchPlace }
  | { kind: "multiple"; candidates: SearchPlace[] };

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: { shortText?: string; types?: string[] }[];
};

function isInKorea(p: GooglePlace): boolean {
  const country = p.addressComponents?.find((c) => c.types?.includes("country"));
  return country?.shortText === "KR";
}

function toSearchPlace(p: GooglePlace): SearchPlace | null {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!p.id || !p.displayName?.text || lat === undefined || lng === undefined) return null;
  return { id: p.id, name: p.displayName.text, address: p.formattedAddress ?? "", lat, lng };
}

function headers(apiKey: string, fieldMask: string) {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": fieldMask,
    "X-Goog-Maps-Solution-ID": SOLUTION_ID,
  };
}

export type PlaceSuggestion = { placeId: string; name: string; address: string };

type GoogleSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
  };
};

// Autocomplete returns the country name in front of Korean addresses.
function withoutCountry(address: string): string {
  return address.replace(/^대한민국\s*/, "");
}

export async function suggestPlaces(
  input: string,
  sessionToken: string,
  deps: PlacesDeps,
): Promise<PlaceSuggestion[]> {
  const doFetch = deps.fetch ?? fetch;
  const res = await doFetch(`${PLACES_BASE}/places:autocomplete`, {
    method: "POST",
    headers: headers(
      deps.apiKey,
      "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat",
    ),
    body: JSON.stringify({ input, includedRegionCodes: ["kr"], languageCode: "ko", sessionToken }),
  });
  if (!res.ok) throw new Error(`Autocomplete failed: ${res.status}`);
  const json = (await res.json()) as { suggestions?: GoogleSuggestion[] };
  return (json.suggestions ?? []).flatMap(({ placePrediction: p }) => {
    const name = p?.structuredFormat?.mainText?.text ?? p?.text?.text;
    if (!p?.placeId || !name) return [];
    return [{ placeId: p.placeId, name, address: withoutCountry(p.structuredFormat?.secondaryText?.text ?? "") }];
  });
}

export async function getPlace(placeId: string, sessionToken: string, deps: PlacesDeps): Promise<SearchPlace | null> {
  const doFetch = deps.fetch ?? fetch;
  const query = new URLSearchParams({ languageCode: "ko", regionCode: "kr", sessionToken });
  const res = await doFetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}?${query}`, {
    headers: headers(deps.apiKey, "id,displayName,formattedAddress,location"),
  });
  if (!res.ok) throw new Error(`Place Details failed: ${res.status}`);
  return toSearchPlace((await res.json()) as GooglePlace);
}

export async function findPlacesByText(text: string, deps: PlacesDeps): Promise<TextSearchResult> {
  const doFetch = deps.fetch ?? fetch;
  const res = await doFetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: headers(
      deps.apiKey,
      "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
    ),
    body: JSON.stringify({
      textQuery: text,
      languageCode: "ko",
      regionCode: "kr",
      locationRestriction: KOREA_BOUNDS,
      pageSize: 5,
    }),
  });
  if (!res.ok) throw new Error(`Text Search failed: ${res.status}`);
  const json = (await res.json()) as { places?: GooglePlace[] };
  const candidates = (json.places ?? [])
    .filter(isInKorea)
    .map(toSearchPlace)
    .filter((p): p is SearchPlace => p !== null);
  if (candidates.length === 0) return { kind: "none" };
  if (candidates.length === 1) return { kind: "single", place: candidates[0] };
  return { kind: "multiple", candidates };
}
