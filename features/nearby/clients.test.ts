import { describe, expect, test } from "vitest";

import { searchGoogleNearby, searchNaverLocal } from "@/features/nearby/server";

describe("주변 장소 조회 요청", () => {
  test("Google 주변 검색은 기준점 반경 3km, 종류, 인기순, 한국어로 요청한다", async () => {
    let body: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    const places = await searchGoogleNearby({ lat: 37.75, lng: 128.9 }, "cafe", {
      apiKey: "k",
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        headers = init?.headers as Record<string, string>;
        return new Response(JSON.stringify({ places: [{ id: "p" }] }));
      },
    });

    expect(places).toEqual([{ id: "p" }]);
    expect(body).toMatchObject({
      includedTypes: ["cafe"],
      maxResultCount: 20,
      rankPreference: "POPULARITY",
      languageCode: "ko",
      locationRestriction: { circle: { center: { latitude: 37.75, longitude: 128.9 }, radius: 3000 } },
    });
    expect(headers["X-Goog-FieldMask"]).toContain("places.rating");
  });

  test("편의점은 Google 장소 종류 convenience_store로 요청한다", async () => {
    let body: Record<string, unknown> = {};
    await searchGoogleNearby({ lat: 37.75, lng: 128.9 }, "convenience_store", {
      apiKey: "k",
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({}));
      },
    });

    expect(body).toMatchObject({ includedTypes: ["convenience_store"] });
  });

  test("네이버 지역 검색은 리뷰 많은 순으로 5개를 API HUB 인증 헤더와 함께 요청한다", async () => {
    let url = "";
    let headers: Record<string, string> = {};
    const items = await searchNaverLocal("강릉중앙시장 맛집", {
      clientId: "id",
      clientSecret: "secret",
      fetch: async (u, init) => {
        url = String(u);
        headers = init?.headers as Record<string, string>;
        return new Response(JSON.stringify({ items: [{ title: "a" }] }));
      },
    });

    expect(items).toEqual([{ title: "a" }]);
    expect(url).toContain("https://naverapihub.apigw.ntruss.com/search/v1/local?");
    expect(Object.fromEntries(new URL(url).searchParams)).toMatchObject({ query: "강릉중앙시장 맛집", display: "5", sort: "comment" });
    expect(headers).toMatchObject({ "X-NCP-APIGW-API-KEY-ID": "id", "X-NCP-APIGW-API-KEY": "secret" });
  });
});
