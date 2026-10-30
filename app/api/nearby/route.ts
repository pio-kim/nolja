import { fromGooglePlaces, fromNaverItems, mergePlaces, type PlaceCategory } from "@/features/nearby";
import { searchGoogleNearby, searchNaverLocal } from "@/features/nearby/server";
import { googlePlacesApiKey, naverSearchKeys } from "@/lib/env";

// NAVER supplement queries: "<base name> <keyword>", five results each.
const NAVER_KEYWORDS: Record<PlaceCategory, string[]> = {
  restaurant: ["맛집", "한식"],
  cafe: ["카페"],
  lodging: ["숙소", "모텔"],
  gas_station: ["주유소"],
  laundry: ["빨래방", "코인세탁"],
};

const isCategory = (value: string | null): value is PlaceCategory => value !== null && Object.hasOwn(NAVER_KEYWORDS, value);

export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const category = params.get("category");
  const name = params.get("name")?.trim() ?? "";
  const base = { lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  if (!isCategory(category) || !name || !Number.isFinite(base.lat) || !Number.isFinite(base.lng)) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  try {
    const google = fromGooglePlaces(await searchGoogleNearby(base, category, { apiKey }), base, category);

    let naver: ReturnType<typeof fromNaverItems> = [];
    const naverKeys = naverSearchKeys();
    if (naverKeys) {
      // The supplement is best effort: a NAVER failure leaves the Google results.
      const results = await Promise.allSettled(
        NAVER_KEYWORDS[category].map((keyword) => searchNaverLocal(`${name} ${keyword}`, naverKeys)),
      );
      for (const r of results) {
        if (r.status === "fulfilled") naver = naver.concat(fromNaverItems(r.value, base, category));
        else console.error(r.reason);
      }
    }

    return Response.json({ places: mergePlaces(google, naver), naver: naverKeys !== null });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
