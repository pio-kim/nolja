import { nightsBetween, type IsoDate, type Stay } from "./stay";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function fromIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toIsoDate(date: Date): IsoDate {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function shortDate(date: IsoDate): string {
  const d = fromIsoDate(date);
  return `${d.getMonth() + 1}.${d.getDate()}(${DAYS[d.getDay()]})`;
}

function longDate(date: IsoDate, withYear: boolean): string {
  const d = fromIsoDate(date);
  return `${withYear ? `${d.getFullYear()}년 ` : ""}${d.getMonth() + 1}월 ${d.getDate()}일(${DAYS[d.getDay()]})`;
}

export function formatStay(stay: Stay): string {
  return `${shortDate(stay.checkIn)} – ${shortDate(stay.checkOut)} · ${nightsBetween(stay)}박`;
}

export function formatStayLong(stay: Stay): string {
  return `${longDate(stay.checkIn, true)} – ${longDate(stay.checkOut, false)} · ${nightsBetween(stay)}박`;
}

export function formatGuests(adults: number, children: number, separator = " · "): string {
  return `성인 ${adults}${children > 0 ? `${separator}아동 ${children}` : ""}`;
}
