import { addDays } from "@/lib/korea-date";

// Pure conversion from KMA short/mid-term forecasts and Google Air Quality
// hourly forecasts into one summary per stay date. Nothing here estimates a
// missing forecast: dates without data say when they become available.
export type IsoDate = string; // YYYY-MM-DD, a calendar day in Korea

export type AirGrade = "good" | "normal" | "bad" | "very-bad";

export type Slot = { sky: string; pop: number | null };

export type DayForecast =
  | { kind: "day"; source: "short" | "mid"; sky: string; min: number | null; max: number | null; pop: number | null }
  | { kind: "ampm"; source: "mid"; min: number | null; max: number | null; am: Slot; pm: Slot }
  | { kind: "none"; availableFrom: IsoDate | null };

export type DayAir = { kind: "grade"; grade: AirGrade } | { kind: "none"; availableFrom: IsoDate | null } | { kind: "failed" };

export type WeatherDay = { date: IsoDate; forecast: DayForecast; air: DayAir };

export type WeatherReport = {
  days: WeatherDay[];
  shortIssuedAt: string; // KMA issue times, ISO in KST (YYYY-MM-DDTHH:mm)
  midIssuedAt: string | null; // null when no stay date uses the mid-term forecast
  airCheckedAt: string | null; // null when the air quality lookup failed
};

// ── dates in Korea ──
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function stayDates(checkIn: IsoDate, checkOut: IsoDate): IsoDate[] {
  const dates: IsoDate[] = [];
  for (let d = checkIn; d <= checkOut; d = addDays(d, 1)) dates.push(d);
  return dates;
}

// Korea wall-clock parts for a UTC instant.
export function koreaClock(now: Date): { date: IsoDate; minutes: number; iso: string } {
  const iso = new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 16);
  return { date: iso.slice(0, 10), minutes: Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)), iso };
}

const compact = (date: IsoDate) => date.replaceAll("-", "");
const fromCompact = (yyyymmdd: string): IsoDate => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

// ── issue times ──
// Short-term forecasts are issued at 02, 05, ..., 23 and published about ten
// minutes later. Mid-term forecasts are issued at 06 and 18.
const SHORT_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23];
const PUBLISH_DELAY_MIN = 10;

export function shortBaseTime(now: Date): { baseDate: string; baseTime: string } {
  const { date, minutes } = koreaClock(now);
  const hour = [...SHORT_BASE_HOURS].reverse().find((h) => h * 60 + PUBLISH_DELAY_MIN <= minutes);
  if (hour === undefined) return { baseDate: compact(addDays(date, -1)), baseTime: "2300" };
  return { baseDate: compact(date), baseTime: `${String(hour).padStart(2, "0")}00` };
}

export function midIssueTime(now: Date): string {
  const { date, minutes } = koreaClock(now);
  if (minutes >= 18 * 60 + PUBLISH_DELAY_MIN) return `${compact(date)}1800`;
  if (minutes >= 6 * 60 + PUBLISH_DELAY_MIN) return `${compact(date)}0600`;
  return `${compact(addDays(date, -1))}1800`;
}

// ── KMA short-term (getVilageFcst) ──
export type ShortItem = { category: string; fcstDate: string; fcstTime: string; fcstValue: string };

const SKY_LABEL: Record<string, string> = { "1": "맑음", "3": "구름많음", "4": "흐림" };
const PTY_LABEL: Record<string, string> = { "1": "비", "2": "비/눈", "3": "눈", "4": "소나기" };

function mostFrequent(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  for (const [v, n] of counts) if (best === null || n > counts.get(best)!) best = v;
  return best;
}

function skyLabel(skies: string[], ptys: string[]): string | null {
  const sky = mostFrequent(skies);
  const wet = ptys.filter((p) => p !== "0");
  const precip = mostFrequent(wet);
  if (precip) {
    const label = PTY_LABEL[precip] ?? "비";
    if (wet.length * 2 >= ptys.length || !sky) return label;
    return `${SKY_LABEL[sky] ?? "구름많음"}, 한때 ${label}`;
  }
  return sky ? (SKY_LABEL[sky] ?? null) : null;
}

export function summarizeShort(items: ShortItem[]): Map<IsoDate, DayForecast> {
  const byDate = new Map<string, ShortItem[]>();
  for (const item of items) byDate.set(item.fcstDate, [...(byDate.get(item.fcstDate) ?? []), item]);

  const days = new Map<IsoDate, DayForecast>();
  for (const [yyyymmdd, dayItems] of byDate) {
    const values = (category: string) => dayItems.filter((i) => i.category === category).map((i) => i.fcstValue);
    const numbers = (category: string) => values(category).map(Number).filter(Number.isFinite);
    const sky = skyLabel(values("SKY"), values("PTY"));
    if (!sky) continue;
    const temps = numbers("TMP");
    const [tmn] = numbers("TMN");
    const [tmx] = numbers("TMX");
    const pops = numbers("POP");
    days.set(fromCompact(yyyymmdd), {
      kind: "day",
      source: "short",
      sky,
      // TMN/TMX are the day's official low/high; the hourly range stands in
      // only when they were issued before this forecast (e.g. today's low).
      min: rounded(tmn ?? (temps.length ? Math.min(...temps) : null)),
      max: rounded(tmx ?? (temps.length ? Math.max(...temps) : null)),
      pop: pops.length ? Math.max(...pops) : null,
    });
  }
  return days;
}

const rounded = (n: number | null) => (n === null ? null : Math.round(n));

// ── KMA mid-term (getMidLandFcst + getMidTa) ──
// Fields are numbered by days after the issue date: wf4Am/wf4Pm/rnSt4Am/...
// for split days and wf8/rnSt8 for whole days; taMin4/taMax4 for temperature.
export type MidFields = Record<string, string | number | null | undefined>;

export function summarizeMid(tmFc: string, land: MidFields, temps: MidFields): Map<IsoDate, DayForecast> {
  const issueDate = fromCompact(tmFc.slice(0, 8));
  const text = (key: string) => {
    const v = land[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const num = (fields: MidFields, key: string) => {
    const v = fields[key];
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const days = new Map<IsoDate, DayForecast>();
  for (let n = 1; n <= 11; n++) {
    const date = addDays(issueDate, n);
    const min = num(temps, `taMin${n}`);
    const max = num(temps, `taMax${n}`);
    const am = text(`wf${n}Am`);
    const pm = text(`wf${n}Pm`);
    const whole = text(`wf${n}`);
    if (am && pm) {
      days.set(date, {
        kind: "ampm",
        source: "mid",
        min,
        max,
        am: { sky: am, pop: num(land, `rnSt${n}Am`) },
        pm: { sky: pm, pop: num(land, `rnSt${n}Pm`) },
      });
    } else if (whole) {
      days.set(date, { kind: "day", source: "mid", sky: whole, min, max, pop: num(land, `rnSt${n}`) });
    }
  }
  return days;
}

// ── Google Air Quality (forecast:lookup, LOCAL_AQI = kor_airkorea) ──
export type AirHour = { dateTime: string; indexes?: { code?: string; aqi?: number }[] };

export const AIR_FORECAST_HOURS = 96;

// Korean CAI bands: 0–50 좋음, 51–100 보통, 101–250 나쁨, 251– 매우나쁨.
export function airGrade(aqi: number): AirGrade {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "normal";
  if (aqi <= 250) return "bad";
  return "very-bad";
}

// The worst hour of each day sets that day's grade.
export function worstAirByDate(hours: AirHour[]): Map<IsoDate, AirGrade> {
  const worst = new Map<IsoDate, number>();
  for (const hour of hours) {
    const aqi = hour.indexes?.find((i) => i.code === "kor_airkorea")?.aqi;
    if (typeof aqi !== "number") continue;
    const date = koreaClock(new Date(hour.dateTime)).date;
    worst.set(date, Math.max(worst.get(date) ?? -1, aqi));
  }
  return new Map([...worst].map(([date, aqi]) => [date, airGrade(aqi)]));
}

// ── assembling the stay ──
// Mid-term forecasts reach 10 days after the issue date; air quality 96 hours.
const MID_REACH_DAYS = 10;
const AIR_REACH_DAYS = AIR_FORECAST_HOURS / 24;

const laterThan = (today: IsoDate) => (date: IsoDate) => (date > today ? date : null);

export function buildReport(input: {
  checkIn: IsoDate;
  checkOut: IsoDate;
  now: Date;
  short: Map<IsoDate, DayForecast>;
  mid: Map<IsoDate, DayForecast>;
  air: Map<IsoDate, AirGrade> | null; // null when the lookup failed
  shortIssuedAt: string;
  midIssuedAt: string;
}): WeatherReport {
  const today = koreaClock(input.now).date;
  const after = laterThan(today);
  const days = stayDates(input.checkIn, input.checkOut).map((date): WeatherDay => {
    const forecast = input.short.get(date) ??
      input.mid.get(date) ?? { kind: "none", availableFrom: after(addDays(date, -MID_REACH_DAYS)) };
    const grade = input.air?.get(date);
    const air: DayAir = !input.air
      ? { kind: "failed" }
      : grade
        ? { kind: "grade", grade }
        : { kind: "none", availableFrom: after(addDays(date, -AIR_REACH_DAYS)) };
    return { date, forecast, air };
  });
  const usesMid = days.some((d) => d.forecast.kind !== "none" && d.forecast.source === "mid");
  return {
    days,
    shortIssuedAt: input.shortIssuedAt,
    midIssuedAt: usesMid ? input.midIssuedAt : null,
    airCheckedAt: input.air ? koreaClock(input.now).iso : null,
  };
}

// "202610291400" → "2026-10-29T14:00"
export function issueIso(yyyymmddhhmm: string): string {
  return `${fromCompact(yyyymmddhhmm.slice(0, 8))}T${yyyymmddhhmm.slice(8, 10)}:${yyyymmddhhmm.slice(10, 12)}`;
}
