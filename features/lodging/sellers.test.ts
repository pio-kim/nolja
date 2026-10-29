import { describe, expect, test } from "vitest";

import { cheapestSeller, toSellers } from "@/features/lodging";

// Shaped like SerpApi Google Hotels property details `prices[]`.
function price(source: string, total: Record<string, number>, extra: Record<string, unknown> = {}) {
  return { source, link: `https://book/${source}`, official: false, total_rate: total, ...extra };
}

describe("판매처별 가격", () => {
  test("세금 포함 가격은 낮은 순으로 먼저, 세금 별도이거나 모르는 가격은 따로 모은다", () => {
    const sellers = toSellers([
      price("야놀자", { extracted_lowest: 241000, extracted_before_taxes_fees: 219000, extracted_after_taxes_fees: 241000 }),
      price("Trip.com", { extracted_lowest: 229900, extracted_before_taxes_fees: 229900 }),
      price("아고다", { extracted_lowest: 238400, extracted_before_taxes_fees: 216700, extracted_after_taxes_fees: 238400 }),
      price("공식 사이트", { extracted_lowest: 252000, extracted_after_taxes_fees: 252000 }, { official: true }),
    ]);

    expect(sellers.taxIncluded.map((s) => [s.source, s.total, s.official])).toEqual([
      ["아고다", 238400, false],
      ["야놀자", 241000, false],
      ["공식 사이트", 252000, true],
    ]);
    expect(sellers.other.map((s) => [s.source, s.total])).toEqual([["Trip.com", 229900]]);
    expect(sellers.taxIncluded[0].link).toBe("https://book/아고다");
  });

  test("예약 링크나 금액이 없는 판매처는 보여주지 않는다", () => {
    const sellers = toSellers([
      { source: "링크 없음", total_rate: { extracted_after_taxes_fees: 100000 } },
      { source: "금액 없음", link: "https://book/x" },
    ]);
    expect(sellers).toEqual({ taxIncluded: [], other: [] });
  });

  test("카드에는 세금 포함 최저가 판매처를, 없으면 포함 여부를 모르는 최저가 판매처를 보여준다", () => {
    const withIncluded = toSellers([
      price("Trip.com", { extracted_lowest: 90000 }),
      price("아고다", { extracted_lowest: 99000, extracted_after_taxes_fees: 99000 }),
    ]);
    const unknownOnly = toSellers([
      price("Bluepillow.mx", { extracted_lowest: 85341 }),
      price("Creatrip", { extracted_lowest: 75425 }),
    ]);

    expect(cheapestSeller(withIncluded)?.source).toBe("아고다");
    expect(cheapestSeller(unknownOnly)?.source).toBe("Creatrip");
    expect(cheapestSeller({ taxIncluded: [], other: [] })).toBeNull();
  });
});
