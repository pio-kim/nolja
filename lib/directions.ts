// Kakao Map's documented link URL for directions to a place
// (https://apis.map.kakao.com/web/guide/#routeurl). It starts from the user's
// current location and offers car, transit and walking routes in Korea, which
// Google Maps does not.
export function directionsUrl(name: string, lat: number, lng: number): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(name.replace(/,/g, " "))},${lat},${lng}`;
}
