import { describe, expect, test } from "vitest";

import { parseSearchQuery, toSearchQuery, type SearchConditions } from "@/features/search";

const gangneung: SearchConditions = {
  place: {
    id: "ChIJ-gangneung-market",
    name: "강릉중앙시장",
    address: "강원특별자치도 강릉시 금성로 21",
    lat: 37.7545,
    lng: 128.8988,
  },
  stay: { checkIn: "2026-10-31", checkOut: "2026-11-02" },
  adults: 2,
  children: 1,
};

describe("검색 조건 주소", () => {
  test("검색 조건을 주소에 담았다가 그대로 되살린다", () => {
    const query = toSearchQuery(gangneung);
    expect(parseSearchQuery(new URLSearchParams(query))).toEqual(gangneung);
  });

  test("장소 좌표가 없거나 성인이 0명인 주소는 검색 조건으로 읽지 않는다", () => {
    const noCoords = new URLSearchParams(toSearchQuery(gangneung));
    noCoords.delete("lat");
    const noAdults = new URLSearchParams(toSearchQuery({ ...gangneung, adults: 0 }));

    expect(parseSearchQuery(noCoords)).toBeNull();
    expect(parseSearchQuery(noAdults)).toBeNull();
  });
});
