import {
  buildReport,
  issueIso,
  mergeKma,
  midIssueTime,
  nearestMidCity,
  openMeteoAirByDate,
  REACH_DAYS,
  shortBaseTime,
  summarizeMid,
  summarizeOpenMeteo,
  summarizeShort,
  toKmaGrid,
  worstAirByDate,
  type AirGrade,
  type AirSource,
  type DayForecast,
  type ForecastSource,
} from "@/features/weather";
import {
  fetchAirForecast,
  fetchMidForecast,
  fetchOpenMeteoAir,
  fetchOpenMeteoForecast,
  fetchShortForecast,
} from "@/features/weather/server";
import { googlePlacesApiKey, kmaServiceKey } from "@/lib/env";
import type { LatLng } from "@/lib/geo";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Forecast = { days: Map<string, DayForecast>; reachDays: number; source: ForecastSource };
type Air = { grades: Map<string, AirGrade>; reachDays: number; source: AirSource };

// KMA first when a service key is set; Open-Meteo (no key) otherwise or when KMA fails.
async function loadForecast(point: LatLng, now: Date): Promise<Forecast> {
  const serviceKey = kmaServiceKey();
  if (serviceKey) {
    try {
      const base = shortBaseTime(now);
      const tmFc = midIssueTime(now);
      const [short, mid] = await Promise.all([
        fetchShortForecast(toKmaGrid(point), base, { serviceKey }),
        fetchMidForecast(nearestMidCity(point), tmFc, { serviceKey }),
      ]);
      return {
        days: mergeKma(summarizeShort(short), summarizeMid(tmFc, mid.land, mid.temps)),
        reachDays: REACH_DAYS.kma,
        source: { name: "kma", shortIssuedAt: issueIso(`${base.baseDate}${base.baseTime}`), midIssuedAt: issueIso(tmFc) },
      };
    } catch (error) {
      console.error(error);
    }
  }
  return {
    days: summarizeOpenMeteo(await fetchOpenMeteoForecast(point)),
    reachDays: REACH_DAYS["open-meteo"],
    source: { name: "open-meteo" },
  };
}

// Google Air Quality first when its key works; Open-Meteo otherwise. Air quality
// is best effort: when both fail the forecast is still shown.
async function loadAir(point: LatLng, now: Date): Promise<Air | null> {
  const apiKey = googlePlacesApiKey();
  if (apiKey) {
    try {
      const grades = worstAirByDate(await fetchAirForecast(point, now, { apiKey }));
      return { grades, reachDays: REACH_DAYS.google, source: "google" };
    } catch (error) {
      console.error(error);
    }
  }
  try {
    const grades = openMeteoAirByDate(await fetchOpenMeteoAir(point));
    return { grades, reachDays: REACH_DAYS["open-meteo-air"], source: "open-meteo" };
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const point = { lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !DATE.test(checkIn) || !DATE.test(checkOut) || checkOut < checkIn) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const now = new Date();
  const air = loadAir(point, now);
  try {
    const forecast = await loadForecast(point, now);
    return Response.json(buildReport({ checkIn, checkOut, now, forecast, air: await air }));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
