export type Season = "spring" | "summer" | "autumn" | "winter";

// date is a Korean calendar day written as YYYY-MM-DD.
export function seasonOf(date: string): Season {
  const month = Number(date.slice(5, 7));
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export type HeroPhoto = { src: string; alt: string; credit: string };

// Unsplash License photos, downloaded 2026-10-29 at 1920px.
export const HERO_PHOTOS: Record<Season, HeroPhoto[]> = {
  spring: [
    { src: "/hero/spring-1.jpg", alt: "강가에 핀 개나리와 다리", credit: "Jinhan Moon" },
    { src: "/hero/spring-2.jpg", alt: "노란 꽃밭 너머의 산", credit: "Taisia Karaseva" },
    { src: "/hero/spring-3.jpg", alt: "파란 하늘 아래 흰 꽃나무", credit: "hanbum yeo" },
  ],
  summer: [
    { src: "/hero/summer-1.jpg", alt: "바다 앞 빨간 등대", credit: "Minku Kang" },
    { src: "/hero/summer-2.jpg", alt: "바위 해안에서 바라본 바다와 섬", credit: "IRa Kang" },
    { src: "/hero/summer-3.jpg", alt: "초록 산과 계곡", credit: "Elliot Gouy" },
  ],
  autumn: [
    { src: "/hero/autumn-1.jpg", alt: "단풍 든 호숫가의 정자", credit: "Ken Cheung" },
    { src: "/hero/autumn-2.jpg", alt: "단풍 숲에 둘러싸인 호수", credit: "Minku Kang" },
    { src: "/hero/autumn-3.jpg", alt: "단풍 든 산", credit: "Michael Ahn" },
  ],
  winter: [
    { src: "/hero/winter-1.jpg", alt: "눈 덮인 한옥 마을", credit: "Clark Gu" },
    { src: "/hero/winter-2.jpg", alt: "눈 쌓인 산맥", credit: "IRa Kang" },
    { src: "/hero/winter-3.jpg", alt: "설산 전경", credit: "rawkkim" },
  ],
};
