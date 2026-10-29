// Server-side secrets. Never import this from a client component.
export function googlePlacesApiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY || null;
}

export function serpApiKey(): string | null {
  return process.env.SERPAPI_API_KEY || null;
}
