import { placeAt } from "@/features/search/places";
import { googlePlacesApiKey } from "@/lib/env";

export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!params.get("lat") || !params.get("lng") || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  try {
    const place = await placeAt(lat, lng, { apiKey });
    if (!place) return Response.json({ error: "outside-korea" }, { status: 404 });
    return Response.json({ place });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
