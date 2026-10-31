import { describe, expect, test } from "vitest";

import { fromGooglePlaces, sortPlaces } from "@/features/nearby";

const base = { lat: 37.0, lng: 127.0 };

// Shaped like a Places API (New) Nearby Search `places[]` entry.
function google(id: string, name: string, lng: number, rating?: number, reviews?: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    displayName: { text: name },
    location: { latitude: 37.0, longitude: lng },
    ...(rating !== undefined && { rating }),
    ...(reviews !== undefined && { userRatingCount: reviews }),
    googleMapsUri: `https://maps.google.com/?cid=${id}`,
    ...extra,
  };
}

describe("주변 음식점·카페", () => {
  test("평점순은 리뷰 20개 이상을 평점 높은 순으로 먼저, 20개 미만을 그다음, 평점 없는 곳을 맨 뒤에 둔다", () => {
    const places = fromGooglePlaces(
      [
        google("few", "리뷰 적은 맛집", 127.001, 4.9, 7),
        google("none", "평점 없는 집", 127.002),
        google("mid", "보통 맛집", 127.003, 4.2, 451),
        google("top", "인기 맛집", 127.004, 4.6, 207),
        google("far", "먼 맛집", 127.05, 5.0, 999), // about 4.4km
      ],
      base,
      "restaurant",
    );

    expect(sortPlaces(places, "rating").map((p) => p.id)).toEqual(["top", "mid", "few", "none"]);
  });

  test("거리순은 기준점에서 가까운 순이고 거리는 km 소수점 한 자리다", () => {
    const places = fromGooglePlaces(
      [google("b", "B", 127.02, 4.0, 30), google("a", "A", 127.005, 3.0, 30)],
      base,
      "cafe",
    );
    expect(sortPlaces(places, "distance").map((p) => [p.id, p.distanceKm])).toEqual([
      ["a", 0.4],
      ["b", 1.8],
    ]);
  });

  test("고른 반경 밖의 장소는 빼고, 반경을 넓히면 그 안의 먼 곳도 남긴다", () => {
    const raw = [google("near", "가까운 곳", 127.01), google("far", "먼 곳", 127.05)]; // 0.9km, 4.4km
    expect(fromGooglePlaces(raw, base, "cafe").map((p) => p.id)).toEqual(["near"]);
    expect(fromGooglePlaces(raw, base, "cafe", 10).map((p) => p.id)).toEqual(["near", "far"]);
  });
});
