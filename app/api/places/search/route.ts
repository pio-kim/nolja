import { findPlacesByText } from "@/features/search/places";
import { googlePlacesApiKey } from "@/lib/env";

export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const text = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!text) return Response.json({ error: "bad-request" }, { status: 400 });

  try {
    return Response.json(await findPlacesByText(text, { apiKey }));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
