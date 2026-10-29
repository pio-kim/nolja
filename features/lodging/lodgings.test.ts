import { describe, expect, test } from "vitest";

import { toLodgings } from "@/features/lodging";

const origin = { lat: 37.0, lng: 127.0 };

// Shaped like a SerpApi Google Hotels `properties[]` entry.
function property(token: string, name: string, lat: number, lng: number, total: number, extra: Record<string, unknown> = {}) {
  return {
    type: "hotel",
    name,
    property_token: token,
    gps_coordinates: { latitude: lat, longitude: lng },
    rate_per_night: { extracted_lowest: total / 2, extracted_before_taxes_fees: total / 2 / 1.1 },
    total_rate: { extracted_lowest: total, extracted_before_taxes_fees: Math.round(total / 1.1) },
    prices: [{ source: "아고다", rate_per_night: { extracted_lowest: total / 2 } }],
    overall_rating: 4.2,
    reviews: 120,
    images: [{ thumbnail: `https://img/${token}.jpg` }],
    ...extra,
  };
}

describe("숙소 목록", () => {
  test("검색 장소에서 3km 안의 숙소만 숙박 총액이 낮은 순으로 남긴다", () => {
    const lodgings = toLodgings(
      [
        property("far", "멀리 있는 호텔", 37.05, 127.0, 90000), // about 5.6km
        property("b", "비싼 호텔", 37.01, 127.0, 300000), // about 1.1km
        property("a", "싼 모텔", 37.0, 127.02, 120000), // about 1.8km
      ],
      origin,
      3,
    );

    expect(lodgings.map((l) => [l.id, l.distanceKm, l.totalPrice])).toEqual([
      ["a", 1.8, 120000],
      ["b", 1.1, 300000],
    ]);
  });

  test("총액이 세금 전 금액보다 크면 세금 포함, 같으면 포함 여부를 알 수 없다고 본다", () => {
    const [included, unknown] = toLodgings(
      [
        property("in", "호텔 A", 37.0, 127.001, 110000),
        property("eq", "호텔 B", 37.0, 127.002, 200000, {
          total_rate: { extracted_lowest: 200000, extracted_before_taxes_fees: 200000 },
        }),
      ],
      origin,
      3,
    );
    expect(included.taxIncluded).toBe(true);
    expect(unknown.taxIncluded).toBeNull();
  });

  test("판매처 중 1박 요금이 가장 낮은 곳을 최저가 출처로 보여준다", () => {
    const [lodging] = toLodgings(
      [
        property("s", "호텔 C", 37.0, 127.001, 100000, {
          prices: [
            { source: "Trip.com", rate_per_night: { extracted_lowest: 52000 } },
            { source: "야놀자", rate_per_night: { extracted_lowest: 49000 } },
          ],
        }),
      ],
      origin,
      3,
    );
    expect(lodging.lowestSource).toBe("야놀자");
  });

  test("이름으로 모텔·리조트를 구분하고 나머지 숙박 시설은 기타로 둔다", () => {
    const types = toLodgings(
      [
        property("m", "강릉 라온 모텔", 37.0, 127.001, 50000),
        property("r", "그랜드 경포 리조트", 37.0, 127.002, 60000),
        property("h", "호텔 솔바람", 37.0, 127.003, 70000),
        property("v", "바다 앞 독채", 37.0, 127.004, 80000, { type: "vacation rental" }),
        // Real Google Hotels results (2026-10-29) list these with type "hotel".
        property("g", "강릉게스트하우스 중앙점", 37.0, 127.005, 90000),
        property("s", "강릉숙소 스테이 북앤타이프", 37.0, 127.006, 100000),
      ],
      origin,
      3,
    ).map((l) => [l.id, l.type]);
    expect(types).toEqual([
      ["m", "motel"],
      ["r", "resort"],
      ["h", "hotel"],
      ["v", "other"],
      ["g", "other"],
      ["s", "other"],
    ]);
  });

  test("여러 페이지에 같은 숙소가 나와도 한 번만 보여준다", () => {
    const lodgings = toLodgings(
      [property("dup", "호텔 D", 37.0, 127.001, 90000), property("dup", "호텔 D", 37.0, 127.001, 95000)],
      origin,
      3,
    );
    expect(lodgings.map((l) => [l.id, l.totalPrice])).toEqual([["dup", 90000]]);
  });
});
