import { getPlace } from "@/features/search/places";
import { googlePlacesApiKey } from "@/lib/env";

export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const placeId = params.get("placeId") ?? "";
  const session = params.get("session") ?? "";
  if (!placeId) return Response.json({ error: "bad-request" }, { status: 400 });

  try {
    const place = await getPlace(placeId, session, { apiKey });
    if (!place) return Response.json({ error: "not-found" }, { status: 404 });
    return Response.json({ place });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
