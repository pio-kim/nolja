// Server-only calls for weather. KMA request shapes follow the 공공데이터포털
// short-term (VilageFcstInfoService_2.0) and mid-term (MidFcstInfoService)
// guides; air quality follows the Google Air Quality forecast:lookup reference;
// Open-Meteo follows its /v1/forecast and /v1/air-quality docs (no key needed).
import type { LatLng } from "@/lib/geo";

import {
  AIR_FORECAST_HOURS,
  OPEN_METEO_AIR_DAYS,
  OPEN_METEO_FORECAST_DAYS,
  type AirHour,
  type MidFields,
  type OpenMeteoDaily,
  type OpenMeteoHourly,
  type ShortItem,
} from "./forecast";

const KMA_BASE = "https://apis.data.go.kr/1360000";
const AIR_URL = "https://airquality.googleapis.com/v1/forecast:lookup";
const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

type FetchDep = { fetch?: typeof fetch };

type KmaBody<T> = {
  response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: T[] } | "" } };
};

// KMA answers errors such as an unregistered key with XML even when JSON is
// requested, so the body is parsed by hand.
async function kmaItems<T>(path: string, params: Record<string, string>, deps: { serviceKey: string } & FetchDep) {
  const doFetch = deps.fetch ?? fetch;
  const query = new URLSearchParams({ serviceKey: deps.serviceKey, pageNo: "1", dataType: "JSON", ...params });
  const res = await doFetch(`${KMA_BASE}/${path}?${query}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`KMA ${path} failed: ${res.status}`);
  let json: KmaBody<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`KMA ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
  const code = json.response?.header?.resultCode;
  if (code === "03") return []; // NO_DATA
  if (code !== "00") throw new Error(`KMA ${path} error ${code}: ${json.response?.header?.resultMsg}`);
  const items = json.response?.body?.items;
  return items && typeof items === "object" ? (items.item ?? []) : [];
}

export function fetchShortForecast(
  grid: { nx: number; ny: number },
  base: { baseDate: string; baseTime: string },
  deps: { serviceKey: string } & FetchDep,
): Promise<ShortItem[]> {
  return kmaItems<ShortItem>(
    "VilageFcstInfoService_2.0/getVilageFcst",
    { numOfRows: "2000", base_date: base.baseDate, base_time: base.baseTime, nx: String(grid.nx), ny: String(grid.ny) },
    deps,
  );
}

export async function fetchMidForecast(
  regions: { landRegId: string; tempRegId: string },
  tmFc: string,
  deps: { serviceKey: string } & FetchDep,
): Promise<{ land: MidFields; temps: MidFields }> {
  const [land, temps] = await Promise.all([
    kmaItems<MidFields>("MidFcstInfoService/getMidLandFcst", { numOfRows: "10", regId: regions.landRegId, tmFc }, deps),
    kmaItems<MidFields>("MidFcstInfoService/getMidTa", { numOfRows: "10", regId: regions.tempRegId, tmFc }, deps),
  ]);
  return { land: land[0] ?? {}, temps: temps[0] ?? {} };
}

export async function fetchAirForecast(point: LatLng, now: Date, deps: { apiKey: string } & FetchDep): Promise<AirHour[]> {
  const doFetch = deps.fetch ?? fetch;
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + (AIR_FORECAST_HOURS - 1) * 60 * 60 * 1000);

  const hours: AirHour[] = [];
  let pageToken: string | undefined;
  do {
    const res = await doFetch(AIR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": deps.apiKey },
      body: JSON.stringify({
        location: { latitude: point.lat, longitude: point.lng },
        period: { startTime: start.toISOString(), endTime: end.toISOString() },
        pageSize: AIR_FORECAST_HOURS,
        universalAqi: false,
        extraComputations: ["LOCAL_AQI"],
        languageCode: "ko",
        ...(pageToken && { pageToken }),
      }),
    });
    if (!res.ok) throw new Error(`Air Quality forecast failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { hourlyForecasts?: AirHour[]; nextPageToken?: string };
    hours.push(...(json.hourlyForecasts ?? []));
    pageToken = json.nextPageToken || undefined;
  } while (pageToken);
  return hours;
}

export async function fetchOpenMeteoForecast(point: LatLng, deps: FetchDep = {}): Promise<OpenMeteoDaily> {
  const doFetch = deps.fetch ?? fetch;
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Seoul",
    forecast_days: String(OPEN_METEO_FORECAST_DAYS),
  });
  const res = await doFetch(`${OPEN_METEO_FORECAST_URL}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  return ((await res.json()) as { daily: OpenMeteoDaily }).daily;
}

export async function fetchOpenMeteoAir(point: LatLng, deps: FetchDep = {}): Promise<OpenMeteoHourly> {
  const doFetch = deps.fetch ?? fetch;
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lng),
    hourly: "pm10,pm2_5",
    timezone: "Asia/Seoul",
    forecast_days: String(OPEN_METEO_AIR_DAYS),
  });
  const res = await doFetch(`${OPEN_METEO_AIR_URL}?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo air quality failed: ${res.status}`);
  return ((await res.json()) as { hourly: OpenMeteoHourly }).hourly;
}
