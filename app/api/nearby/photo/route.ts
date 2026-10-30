import { matchKakaoPhoto } from "@/features/nearby";
import { findOnKakaoMap } from "@/features/nearby/server";

// Returns the Kakao Map photo of a place that has no Google photo, or 404.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim() ?? "";
  const area = params.get("area")?.trim() ?? "";
  const target = { name, lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  if (!name || !Number.isFinite(target.lat) || !Number.isFinite(target.lng)) return new Response(null, { status: 400 });

  let photo: string | null;
  try {
    photo = await findOnKakaoMap(target, area, (places) => matchKakaoPhoto(places, target));
  } catch (error) {
    console.error(error);
    return new Response(null, { status: 502 });
  }
  if (!photo) return new Response(null, { status: 404 });

  // Served from here rather than redirected: browsers fail to load Kakao's CDN
  // image when it is reached through a redirect from this origin.
  const image = await fetch(photo);
  if (!image.ok) return new Response(null, { status: 502 });
  return new Response(image.body, {
    headers: {
      "Content-Type": image.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
