import { placePhotoUri } from "@/features/nearby/server";
import { googlePlacesApiKey } from "@/lib/env";

// Redirects to a Place Photo so the server key never reaches the browser.
export async function GET(request: Request) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) return new Response(null, { status: 503 });

  const params = new URL(request.url).searchParams;
  const name = params.get("name") ?? "";
  const width = Math.min(Math.max(Number(params.get("w")) || 400, 1), 1600);
  if (!/^places\/[^/]+\/photos\/[^/]+$/.test(name)) return new Response(null, { status: 400 });

  const uri = await placePhotoUri(name, width, { apiKey });
  if (!uri) return new Response(null, { status: 404 });
  return Response.redirect(uri, 302);
}
