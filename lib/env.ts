// Server-side secrets. Never import this from a client component.
export function googlePlacesApiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

export function serpApiKey(): string | null {
  return process.env.SERPAPI_API_KEY || null;
}

export function naverSearchKeys(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

// 공공데이터포털 서비스 키(Decoding). Used for KMA short and mid-term forecasts.
export function kmaServiceKey(): string | null {
  return process.env.KMA_SERVICE_KEY || null;
}
