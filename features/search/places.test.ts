import { describe, expect, test } from "vitest";

import { findPlacesByText, getPlace, suggestPlaces } from "@/features/search/places";

// Shaped like a Places API (New) Text Search response.
function googlePlace(id: string, name: string, address: string, country: string, lat = 37.75, lng = 128.9) {
  return {
    id,
    displayName: { text: name, languageCode: "ko" },
    formattedAddress: address,
    location: { latitude: lat, longitude: lng },
    addressComponents: [{ longText: country, shortText: country, types: ["country", "political"] }],
  };
}

function fakeFetch(places: unknown[]) {
  return async () => new Response(JSON.stringify({ places }), { status: 200 });
}

describe("추천 없이 검색한 장소 찾기", () => {
  test("국내 후보가 여러 곳이면 국내 후보만 모아 어느 곳인지 묻게 한다", async () => {
    const result = await findPlacesByText("중앙시장", {
      apiKey: "test",
      fetch: fakeFetch([
        googlePlace("a", "강릉중앙시장", "강원특별자치도 강릉시 금성로 21", "KR"),
        googlePlace("b", "중앙시장", "일본 오사카", "JP"),
        googlePlace("c", "대전 중앙시장", "대전광역시 동구 대전로 783", "KR", 36.33, 127.43),
      ]),
    });

    expect(result).toEqual({
      kind: "multiple",
      candidates: [
        { id: "a", name: "강릉중앙시장", address: "강원특별자치도 강릉시 금성로 21", lat: 37.75, lng: 128.9 },
        { id: "c", name: "대전 중앙시장", address: "대전광역시 동구 대전로 783", lat: 36.33, lng: 127.43 },
      ],
    });
  });

  test("국내 후보가 딱 1곳이면 묻지 않고 그곳을 쓴다", async () => {
    const result = await findPlacesByText("경포해변", {
      apiKey: "test",
      fetch: fakeFetch([googlePlace("g", "경포해변", "강원특별자치도 강릉시 창해로 514", "KR")]),
    });
    expect(result).toEqual({
      kind: "single",
      place: { id: "g", name: "경포해변", address: "강원특별자치도 강릉시 창해로 514", lat: 37.75, lng: 128.9 },
    });
  });

  test("국내 후보가 없으면 찾지 못한 것으로 본다", async () => {
    const result = await findPlacesByText("센트럴파크", {
      apiKey: "test",
      fetch: fakeFetch([googlePlace("n", "Central Park", "New York, NY, USA", "US")]),
    });
    expect(result).toEqual({ kind: "none" });
  });

  test("이름이 같고 1km 안에 있는 후보는 같은 장소로 보고 한 번만 셈한다", async () => {
    // Real response for "경포해변" (2026-10-29): the same beach came back three times.
    const result = await findPlacesByText("경포해변", {
      apiKey: "test",
      fetch: fakeFetch([
        googlePlace("a", "경포해변", "강릉시 경포해변", "KR", 37.8054863, 128.9078306),
        googlePlace("b", "경포해변", "강원특별자치도 강릉시 강문동 산1 경포해변", "KR", 37.8054757, 128.9078299),
        googlePlace("c", "경포 해변", "강원특별자치도 강릉시 경포동", "KR", 37.8084208, 128.9036564),
      ]),
    });
    expect(result).toEqual({
      kind: "single",
      place: { id: "a", name: "경포해변", address: "강릉시 경포해변", lat: 37.8054863, lng: 128.9078306 },
    });
  });

  test("후보 주소 앞의 국가 이름은 빼고 보여준다", async () => {
    const result = await findPlacesByText("양구 중앙시장", {
      apiKey: "test",
      fetch: fakeFetch([googlePlace("y", "중앙시장", "대한민국 양구군", "KR", 38.104, 127.989)]),
    });
    expect(result).toMatchObject({ kind: "single", place: { address: "양구군" } });
  });
});

describe("장소 추천 목록", () => {
  test("국내로 제한해 추천을 받고 이름과 주소를 보여줄 수 있게 돌려준다", async () => {
    let sentBody: Record<string, unknown> = {};
    const result = await suggestPlaces("강릉중앙", "session-1", {
      apiKey: "test",
      fetch: async (_url, init) => {
        sentBody = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            suggestions: [
              {
                placePrediction: {
                  placeId: "a",
                  text: { text: "대한민국 강원특별자치도 강릉시 금성로 21 강릉중앙시장" },
                  structuredFormat: {
                    mainText: { text: "강릉중앙시장" },
                    secondaryText: { text: "대한민국 강원특별자치도 강릉시 금성로 21" },
                  },
                },
              },
            ],
          }),
        );
      },
    });

    expect(sentBody).toMatchObject({ input: "강릉중앙", includedRegionCodes: ["kr"], sessionToken: "session-1" });
    expect(result).toEqual([{ placeId: "a", name: "강릉중앙시장", address: "강원특별자치도 강릉시 금성로 21" }]);
  });
});

describe("추천에서 고른 장소", () => {
  test("고른 장소의 좌표와 주소를 받아 검색 장소로 만든다", async () => {
    let calledUrl = "";
    const place = await getPlace("a", "session-1", {
      apiKey: "test",
      fetch: async (url) => {
        calledUrl = String(url);
        return new Response(
          JSON.stringify(googlePlace("a", "강릉중앙시장", "강원특별자치도 강릉시 금성로 21", "KR", 37.7545, 128.8988)),
        );
      },
    });

    expect(calledUrl).toContain("/places/a?");
    expect(calledUrl).toContain("sessionToken=session-1");
    expect(place).toEqual({
      id: "a",
      name: "강릉중앙시장",
      address: "강원특별자치도 강릉시 금성로 21",
      lat: 37.7545,
      lng: 128.8988,
    });
  });
});
