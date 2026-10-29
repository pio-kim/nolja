import {
  buildReport,
  issueIso,
  midIssueTime,
  nearestMidCity,
  shortBaseTime,
  summarizeMid,
  summarizeShort,
  toKmaGrid,
  worstAirByDate,
} from "@/features/weather";
import { fetchAirForecast, fetchMidForecast, fetchShortForecast } from "@/features/weather/server";
import { googlePlacesApiKey, kmaServiceKey } from "@/lib/env";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const serviceKey = kmaServiceKey();
  if (!serviceKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const point = { lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !DATE.test(checkIn) || !DATE.test(checkOut) || checkOut < checkIn) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const now = new Date();
  const base = shortBaseTime(now);
  const tmFc = midIssueTime(now);
  const googleKey = googlePlacesApiKey();

  // Air quality is best effort: its failure leaves the KMA forecast in place.
  const air = googleKey
    ? fetchAirForecast(point, now, { apiKey: googleKey }).then(worstAirByDate, (error) => {
        console.error(error);
        return null;
      })
    : Promise.resolve(null);

  try {
    const [short, mid] = await Promise.all([
      fetchShortForecast(toKmaGrid(point), base, { serviceKey }),
      fetchMidForecast(nearestMidCity(point), tmFc, { serviceKey }),
    ]);
    const report = buildReport({
      checkIn,
      checkOut,
      now,
      short: summarizeShort(short),
      mid: summarizeMid(tmFc, mid.land, mid.temps),
      air: await air,
      shortIssuedAt: issueIso(`${base.baseDate}${base.baseTime}`),
      midIssuedAt: issueIso(tmFc),
    });
    return Response.json(report);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
