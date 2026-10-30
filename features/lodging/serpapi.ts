// Server-only SerpApi Google Hotels calls. Parameters follow
// https://serpapi.com/google-hotels-api (checked 2026-10-29). There is no
// coordinate or radius parameter, so callers filter by distance afterwards.
import type { SerpProperty } from "./lodgings";
import { isFresh, type ResponseCache } from "./response-cache";
import type { SerpSellerPrice } from "./sellers";

const SERPAPI_URL = "https://serpapi.com/search.json";
const MAX_PAGES = 2;

export type LodgingStay = {
  query: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
};

export type SerpDeps = { apiKey: string; fetch?: typeof fetch; cache?: ResponseCache };

function baseParams(stay: LodgingStay, apiKey: string): URLSearchParams {
  return new URLSearchParams({
    engine: "google_hotels",
    check_in_date: stay.checkIn,
    check_out_date: stay.checkOut,
    adults: String(stay.adults),
    children: String(stay.children),
    currency: "KRW",
    gl: "kr",
    hl: "ko",
    api_key: apiKey,
  });
}

async function getJson<T>(params: URLSearchParams, deps: SerpDeps): Promise<T> {
  const doFetch = deps.fetch ?? fetch;
  // The key is left out so a new key still finds earlier responses.
  const keyParams = new URLSearchParams(params);
  keyParams.delete("api_key");
  const cacheKey = keyParams.toString();
  const cached = deps.cache ? await deps.cache.get(cacheKey) : null;
  if (cached && isFresh(cached)) return cached.body as T;

  try {
    const res = await doFetch(`${SERPAPI_URL}?${params}`);
    if (!res.ok) throw new Error(`SerpApi failed: ${res.status}`);
    const body = (await res.json()) as T;
    await deps.cache?.put(cacheKey, body);
    return body;
  } catch (error) {
    if (!cached) throw error;
    console.error(error, "— serving the cached SerpApi response");
    return cached.body as T;
  }
}

type SearchPage = { properties?: SerpProperty[]; serpapi_pagination?: { next_page_token?: string } };

export async function fetchLodgingProperties(stay: LodgingStay, deps: SerpDeps): Promise<SerpProperty[]> {
  const properties: SerpProperty[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = baseParams(stay, deps.apiKey);
    params.set("q", stay.query);
    params.set("sort_by", "3"); // lowest price
    if (pageToken) params.set("next_page_token", pageToken);
    const json = await getJson<SearchPage>(params, deps);
    properties.push(...(json.properties ?? []));
    pageToken = json.serpapi_pagination?.next_page_token;
    if (!pageToken) break;
  }
  return properties;
}

export async function fetchSellerPrices(
  propertyToken: string,
  stay: LodgingStay,
  deps: SerpDeps,
): Promise<SerpSellerPrice[]> {
  const params = baseParams(stay, deps.apiKey);
  params.set("q", stay.query);
  params.set("property_token", propertyToken);
  const json = await getJson<{ prices?: SerpSellerPrice[] }>(params, deps);
  return json.prices ?? [];
}
