import { toSellers } from "@/features/lodging";
import { diskCache, fetchSellerPrices, readLodgingStay } from "@/features/lodging/server";
import { serpApiKey } from "@/lib/env";

const cache = diskCache();

export async function GET(request: Request) {
  const apiKey = serpApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const stay = readLodgingStay(params);
  const token = params.get("token");
  if (!stay || !token) return Response.json({ error: "bad-request" }, { status: 400 });

  try {
    const prices = await fetchSellerPrices(token, stay, { apiKey, cache });
    return Response.json({ ...toSellers(prices), fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
