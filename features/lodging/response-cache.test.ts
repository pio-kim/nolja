import { describe, expect, test } from "vitest";

import { fetchSellerPrices, type ResponseCache } from "@/features/lodging/server";

const stay = { query: "강릉중앙시장", checkIn: "2026-10-31", checkOut: "2026-11-02", adults: 2, children: 0 };

function memoryCache(savedAt: number): ResponseCache & { keys: string[] } {
  const entries = new Map<string, { savedAt: number; body: unknown }>();
  return {
    keys: [],
    async get(key) {
      return entries.get(key) ?? null;
    },
    async put(key, body) {
      this.keys.push(key);
      entries.set(key, { savedAt, body });
    },
  };
}

const prices = { prices: [{ source: "Agoda", total_rate: { extracted_lowest: 90000 } }] };

describe("SerpApi 응답 저장", () => {
  test("저장된 응답이 새것이면 SerpApi를 다시 부르지 않고, 키가 바뀌어도 같은 응답을 찾는다", async () => {
    const cache = memoryCache(Date.now());
    let calls = 0;
    const fetch = async () => {
      calls++;
      return new Response(JSON.stringify(prices));
    };

    await fetchSellerPrices("t1", stay, { apiKey: "old", fetch, cache });
    const again = await fetchSellerPrices("t1", stay, { apiKey: "new", fetch, cache });

    expect(calls).toBe(1);
    expect(again).toEqual(prices.prices);
    expect(cache.keys[0]).not.toContain("old");
  });

  test("한도 초과 같은 실패에는 오래된 저장 응답이라도 보여주고, 저장된 게 없으면 실패한다", async () => {
    const cache = memoryCache(Date.now() - 24 * 60 * 60 * 1000);
    await cache.put(
      "engine=google_hotels&check_in_date=2026-10-31&check_out_date=2026-11-02&adults=2&children=0&currency=KRW&gl=kr&hl=ko&q=%EA%B0%95%EB%A6%89%EC%A4%91%EC%95%99%EC%8B%9C%EC%9E%A5&property_token=t1",
      prices,
    );
    const quotaUsedUp = async () => new Response("{}", { status: 429 });

    expect(await fetchSellerPrices("t1", stay, { apiKey: "k", fetch: quotaUsedUp, cache })).toEqual(prices.prices);
    await expect(fetchSellerPrices("t2", stay, { apiKey: "k", fetch: quotaUsedUp, cache })).rejects.toThrow("429");
  });
});
