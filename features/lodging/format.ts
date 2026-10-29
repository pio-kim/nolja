import type { LodgingType } from "./lodgings";

export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;

// Map labels: 238,400원 → 23.8만
export const manwon = (n: number) => `${(n / 10000).toFixed(1)}만`;

export const TYPE_LABEL: Record<LodgingType, string> = {
  motel: "모텔",
  hotel: "호텔",
  resort: "리조트",
  other: "숙소",
};

export function taxLabel(taxIncluded: boolean | null): string {
  if (taxIncluded === true) return "세금 포함";
  if (taxIncluded === false) return "세금 별도";
  return "세금 포함 여부 확인 필요";
}

export function fetchedTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
