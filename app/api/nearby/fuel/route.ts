import { fuelInfo, matchKakaoPlace } from "@/features/nearby";
import { findOnKakaoMap } from "@/features/nearby/server";

// The fuels a gas station sells, with prices, from its Kakao Map entry.
// { fuel: null } when Kakao has no fuel data for it.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const name = params.get("name")?.trim() ?? "";
  const area = params.get("area")?.trim() ?? "";
  const target = { name, lat: Number(params.get("lat")), lng: Number(params.get("lng")) };
  if (!name || !Number.isFinite(target.lat) || !Number.isFinite(target.lng)) {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  try {
    const fuel = await findOnKakaoMap(target, area, (places) => {
      const station = matchKakaoPlace(places, target, (p) => fuelInfo(p) !== null);
      return station && fuelInfo(station);
    });
    return Response.json({ fuel }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
