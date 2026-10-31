import type { LatLng } from "@/lib/geo";

// KMA short-term forecasts are looked up on a 5km Lambert conformal conic grid,
// not by latitude/longitude. Constants follow the KMA open API guide.
const RE = 6371.00877; // earth radius (km)
const GRID = 5.0; // grid spacing (km)
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43; // origin X (grid)
const YO = 136; // origin Y (grid)

export function toKmaGrid({ lat, lng }: LatLng): { nx: number; ny: number } {
  const rad = Math.PI / 180;
  const re = RE / GRID;
  const slat1 = SLAT1 * rad;
  const slat2 = SLAT2 * rad;
  const olon = OLON * rad;
  const olat = OLAT * rad;

  const sn =
    Math.log(Math.cos(slat1) / Math.cos(slat2)) /
    Math.log(Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5));
  const sf = (Math.tan(Math.PI * 0.25 + slat1 * 0.5) ** sn * Math.cos(slat1)) / sn;
  const ro = (re * sf) / Math.tan(Math.PI * 0.25 + olat * 0.5) ** sn;

  const ra = (re * sf) / Math.tan(Math.PI * 0.25 + lat * rad * 0.5) ** sn;
  let theta = lng * rad - olon;
  if (theta > Math.PI) theta -= 2 * Math.PI;
  if (theta < -Math.PI) theta += 2 * Math.PI;
  theta *= sn;

  return {
    nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5),
  };
}
