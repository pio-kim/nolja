import { describe, expect, test } from "vitest";

import { fromGooglePlaces, fromNaverItems, mergePlaces } from "@/features/nearby";

const base = { lat: 37.0, lng: 127.0 };

// Shaped like a NAVER API HUB local search `items[]` entry.
function naver(title: string, mapx: string, mapy: string, category = "한식>칼국수") {
  return { title, link: "", category, address: "", roadAddress: "강원특별자치도 강릉시 어딘가", mapx, mapy };
}

describe("네이버 지역 검색 보강", () => {
  test("이름의 강조 태그를 지우고, 좌표가 10⁷배 정수이든 소수이든 위경도로 읽는다", () => {
    const places = fromNaverItems(
      [naver("강릉 <b>장칼국수</b>", "1270050000", "370000000"), naver("<b>카페</b> 하루", "127.01", "37.0", "카페,디저트>베이커리")],
      base,
      "restaurant",
    );

    expect(places.map((p) => [p.name, p.lat, p.lng, p.distanceKm, p.kind, p.rating, p.source])).toEqual([
      ["강릉 장칼국수", 37.0, 127.005, 0.4, "칼국수", null, "naver"],
      ["카페 하루", 37.0, 127.01, 0.9, "베이커리", null, "naver"],
    ]);
    expect(places[0].mapsUrl).toBe("https://map.naver.com/p/search/%EA%B0%95%EB%A6%89%20%EC%9E%A5%EC%B9%BC%EA%B5%AD%EC%88%98");
  });

  test("Google 결과와 이름이 같고(공백 무시) 50m 안이면 하나만 남기고, 정보가 많은 Google 쪽을 쓴다", () => {
    const google = fromGooglePlaces(
      [{ id: "g1", displayName: { text: "중앙시장 닭강정" }, location: { latitude: 37.0, longitude: 127.001 }, rating: 4.3, userRatingCount: 864 }],
      base,
      "restaurant",
    );
    const fromNaver = fromNaverItems(
      [naver("중앙시장<b>닭강정</b>", "1270013000", "370000000"), naver("다른 집", "1270020000", "370000000")],
      base,
      "restaurant",
    );

    expect(mergePlaces(google, fromNaver).map((p) => [p.name, p.source])).toEqual([
      ["중앙시장 닭강정", "google"],
      ["다른 집", "naver"],
    ]);
  });
});
