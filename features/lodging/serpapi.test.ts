import { describe, expect, test } from "vitest";

import { fetchLodgingProperties, fetchSellerPrices } from "@/features/lodging/server";

const stay = { query: "강릉중앙시장", checkIn: "2026-10-31", checkOut: "2026-11-02", adults: 2, children: 1 };

function recordingFetch(pages: unknown[]) {
  const urls: URL[] = [];
  const fetch = async (url: string | URL | Request) => {
    urls.push(new URL(String(url)));
    return new Response(JSON.stringify(pages[urls.length - 1] ?? {}));
  };
  return { urls, fetch };
}

describe("SerpApi 숙소 조회", () => {
  test("원화·한국어·최저가순으로 숙박 조건을 넣어 조회하고 최대 2페이지까지 모은다", async () => {
    const { urls, fetch } = recordingFetch([
      { properties: [{ name: "A" }], serpapi_pagination: { next_page_token: "p2" } },
      { properties: [{ name: "B" }], serpapi_pagination: { next_page_token: "p3" } },
      { properties: [{ name: "C" }] },
    ]);

    const properties = await fetchLodgingProperties(stay, { apiKey: "k", fetch });

    expect(properties.map((p) => p.name)).toEqual(["A", "B"]);
    expect(urls).toHaveLength(2);
    expect(Object.fromEntries(urls[0].searchParams)).toMatchObject({
      engine: "google_hotels",
      q: "강릉중앙시장",
      check_in_date: "2026-10-31",
      check_out_date: "2026-11-02",
      adults: "2",
      children: "1",
      currency: "KRW",
      gl: "kr",
      hl: "ko",
      sort_by: "3",
      api_key: "k",
    });
    expect(urls[1].searchParams.get("next_page_token")).toBe("p2");
  });

  test("숙소를 열면 그 숙소의 판매처 가격을 같은 숙박 조건으로 조회한다", async () => {
    const { urls, fetch } = recordingFetch([{ prices: [{ source: "아고다" }] }]);

    const prices = await fetchSellerPrices("tok-1", stay, { apiKey: "k", fetch });

    expect(prices).toEqual([{ source: "아고다" }]);
    expect(urls[0].searchParams.get("property_token")).toBe("tok-1");
    expect(urls[0].searchParams.get("check_in_date")).toBe("2026-10-31");
  });
});
