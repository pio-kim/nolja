import { suggestPlaces } from "@/features/search/places";
import { googlePlacesApiKey } from "@/lib/env";

export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const input = params.get("input")?.trim() ?? "";
  const session = params.get("session") ?? "";
  if (!input) return Response.json({ suggestions: [] });

  try {
    const suggestions = await suggestPlaces(input, session, { apiKey });
    return Response.json({ suggestions });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
