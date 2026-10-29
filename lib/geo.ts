export type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

// Great-circle (haversine) distance in kilometres.
export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// Distances are shown with one decimal place.
export const roundKm = (km: number) => Math.round(km * 10) / 10;
