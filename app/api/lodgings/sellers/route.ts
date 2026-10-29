import { toSellers } from "@/features/lodging";
import { fetchSellerPrices, readLodgingStay } from "@/features/lodging/server";
import { serpApiKey } from "@/lib/env";

export async function GET(request: Request) {
  const apiKey = serpApiKey();
  if (!apiKey) return Response.json({ error: "missing-key" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const stay = readLodgingStay(params);
  const token = params.get("token");
  if (!stay || !token) return Response.json({ error: "bad-request" }, { status: 400 });

  try {
    const prices = await fetchSellerPrices(token, stay, { apiKey });
    return Response.json({ ...toSellers(prices), fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}
