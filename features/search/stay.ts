// Dates are calendar days in Korea, written as YYYY-MM-DD.
import { addDays } from "@/lib/korea-date";

export { addDays, todayInKorea } from "@/lib/korea-date";

export type IsoDate = string;

export type Stay = { checkIn: IsoDate; checkOut: IsoDate };

export function defaultStay(today: IsoDate): Stay {
  return { checkIn: today, checkOut: addDays(today, 1) };
}

export const MAX_NIGHTS = 30;

export function nightsBetween(stay: Stay): number {
  const ms = Date.parse(`${stay.checkOut}T00:00:00Z`) - Date.parse(`${stay.checkIn}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export type StayError = "past-check-in" | "check-out-not-after-check-in" | "too-many-nights";

export function validateStay(stay: Stay, today: IsoDate): StayError | null {
  if (stay.checkIn < today) return "past-check-in";
  if (stay.checkOut <= stay.checkIn) return "check-out-not-after-check-in";
  if (nightsBetween(stay) > MAX_NIGHTS) return "too-many-nights";
  return null;
}
