import { haversineKm, type LatLng } from "@/lib/geo";

// Mid-term forecasts are issued per wide land region (sky, precipitation) and
// per city (temperature). The search place uses the nearest listed city and that
// city's land region. Codes follow the KMA mid-term forecast API guide.
type MidCity = { name: string; tempRegId: string; landRegId: string } & LatLng;

const CAPITAL = "11B00000";
const GANGWON_WEST = "11D10000";
const GANGWON_EAST = "11D20000";
const CHUNGBUK = "11C10000";
const CHUNGNAM = "11C20000";
const JEONBUK = "11F10000";
const JEONNAM = "11F20000";
const GYEONGBUK = "11H10000";
const GYEONGNAM = "11H20000";
const JEJU = "11G00000";

const MID_CITIES: MidCity[] = [
  { name: "서울", tempRegId: "11B10101", landRegId: CAPITAL, lat: 37.57, lng: 126.98 },
  { name: "인천", tempRegId: "11B20201", landRegId: CAPITAL, lat: 37.46, lng: 126.71 },
  { name: "수원", tempRegId: "11B20601", landRegId: CAPITAL, lat: 37.26, lng: 127.03 },
  { name: "파주", tempRegId: "11B20305", landRegId: CAPITAL, lat: 37.76, lng: 126.78 },
  { name: "이천", tempRegId: "11B20701", landRegId: CAPITAL, lat: 37.27, lng: 127.44 },
  { name: "춘천", tempRegId: "11D10301", landRegId: GANGWON_WEST, lat: 37.88, lng: 127.73 },
  { name: "원주", tempRegId: "11D10401", landRegId: GANGWON_WEST, lat: 37.34, lng: 127.92 },
  { name: "강릉", tempRegId: "11D20501", landRegId: GANGWON_EAST, lat: 37.75, lng: 128.9 },
  { name: "속초", tempRegId: "11D20401", landRegId: GANGWON_EAST, lat: 38.21, lng: 128.59 },
  { name: "청주", tempRegId: "11C10301", landRegId: CHUNGBUK, lat: 36.64, lng: 127.49 },
  { name: "충주", tempRegId: "11C10101", landRegId: CHUNGBUK, lat: 36.99, lng: 127.93 },
  { name: "대전", tempRegId: "11C20401", landRegId: CHUNGNAM, lat: 36.35, lng: 127.38 },
  { name: "세종", tempRegId: "11C20404", landRegId: CHUNGNAM, lat: 36.48, lng: 127.29 },
  { name: "천안", tempRegId: "11C20301", landRegId: CHUNGNAM, lat: 36.81, lng: 127.15 },
  { name: "서산", tempRegId: "11C20101", landRegId: CHUNGNAM, lat: 36.78, lng: 126.45 },
  { name: "홍성", tempRegId: "11C20104", landRegId: CHUNGNAM, lat: 36.6, lng: 126.66 },
  { name: "전주", tempRegId: "11F10201", landRegId: JEONBUK, lat: 35.82, lng: 127.15 },
  { name: "군산", tempRegId: "21F10501", landRegId: JEONBUK, lat: 35.97, lng: 126.74 },
  { name: "광주", tempRegId: "11F20501", landRegId: JEONNAM, lat: 35.16, lng: 126.85 },
  { name: "목포", tempRegId: "21F20801", landRegId: JEONNAM, lat: 34.81, lng: 126.39 },
  { name: "여수", tempRegId: "11F20401", landRegId: JEONNAM, lat: 34.76, lng: 127.66 },
  { name: "대구", tempRegId: "11H10701", landRegId: GYEONGBUK, lat: 35.87, lng: 128.6 },
  { name: "안동", tempRegId: "11H10501", landRegId: GYEONGBUK, lat: 36.57, lng: 128.73 },
  { name: "포항", tempRegId: "11H10201", landRegId: GYEONGBUK, lat: 36.02, lng: 129.34 },
  { name: "부산", tempRegId: "11H20201", landRegId: GYEONGNAM, lat: 35.18, lng: 129.08 },
  { name: "울산", tempRegId: "11H20101", landRegId: GYEONGNAM, lat: 35.54, lng: 129.31 },
  { name: "창원", tempRegId: "11H20301", landRegId: GYEONGNAM, lat: 35.23, lng: 128.68 },
  { name: "진주", tempRegId: "11H20701", landRegId: GYEONGNAM, lat: 35.18, lng: 128.11 },
  { name: "통영", tempRegId: "11H20401", landRegId: GYEONGNAM, lat: 34.85, lng: 128.43 },
  { name: "제주", tempRegId: "11G00201", landRegId: JEJU, lat: 33.5, lng: 126.53 },
  { name: "서귀포", tempRegId: "11G00401", landRegId: JEJU, lat: 33.25, lng: 126.56 },
];

export function nearestMidCity(point: LatLng): MidCity {
  let best = MID_CITIES[0];
  let bestKm = Infinity;
  for (const city of MID_CITIES) {
    const km = haversineKm(point, city);
    if (km < bestKm) [best, bestKm] = [city, km];
  }
  return best;
}
