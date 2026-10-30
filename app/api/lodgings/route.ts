import { toLodgings } from "@/features/lodging";
import { diskCache, fetchLodgingProperties, readLodgingStay } from "@/features/lodging/server";
import { serpApiKey } from "@/lib/env";

// Results within 5km are returned so the screen can widen from 3km without refetching.
const MAX_RADIUS_KM = 5;
const cache = diskCache();

export async function GET(request: Request) {
  const apiKey = serpApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const stay = readLodgingStay(params);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!stay || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  try {
    const properties = await fetchLodgingProperties(stay, { apiKey, cache });
    const lodgings = toLodgings(properties, { lat, lng }, MAX_RADIUS_KM);
    return Response.json({ lodgings, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
