import { BedDoubleIcon, CloudSunIcon, UtensilsIcon } from "lucide-react";

import { SearchForm } from "@/features/search";
import { SeasonalBackdrop } from "@/features/seasonal-hero";

const FEATURES = [
  {
    icon: BedDoubleIcon,
    title: "숙박 총액으로 비교",
    body: "1박 요금이 아니라 일정 전체의 총액으로, 세금 포함 여부까지 표시합니다.",
  },
  {
    icon: UtensilsIcon,
    title: "숙소 근처 먹을 곳",
    body: "숙소를 고르면 그 숙소 주변 음식점과 카페로 바로 다시 찾아드립니다.",
  },
  { icon: CloudSunIcon, title: "머무는 동안의 날씨", body: "기온, 비 소식, 미세먼지를 날짜별로 함께 보여드립니다." },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 md:px-6">
      <header className="flex h-18 items-center justify-between">
        <span className="font-heading text-[22px] tracking-[0.18em]">NOLJA</span>
        <span className="text-sm text-muted-foreground">국내 숙식 탐색</span>
      </header>

      <main className="flex-1">
        <section className="relative isolate flex min-h-[600px] flex-col justify-end overflow-visible rounded-3xl px-5 pt-20 pb-8 text-white md:min-h-[620px] md:px-12 md:pb-12">
          <SeasonalBackdrop className="rounded-3xl" />
          <p className="mb-4 text-xs tracking-[0.24em] text-white/85">STAY · DINE · WEATHER</p>
          <h1 className="font-heading mb-3 max-w-[14em] text-[34px] leading-tight drop-shadow-sm md:text-6xl">
            머무를 곳과 먹을 곳을,
            <br />한 번에.
          </h1>
          <p className="mb-8 max-w-[34em] text-[15px] text-white/90 md:mb-10 md:text-[17px]">
            장소 이름만 입력하세요. 근처 숙소를 총액이 낮은 순으로, 주변 음식점과 카페, 그 기간의 날씨까지 함께
            찾아드립니다.
          </p>
          <SearchForm />
        </section>

        <section className="my-16 grid gap-4 md:my-20 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-2xl bg-muted p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-card hover:shadow-[0_14px_32px_rgba(0,0,0,0.08)]"
            >
              <span className="mb-4 grid size-10 place-items-center rounded-full bg-background transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h2 className="font-heading mb-2 text-[22px]">{title}</h2>
              <p className="text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="flex flex-wrap justify-between gap-4 border-t py-8 text-xs text-muted-foreground">
        <span>결제와 예약은 각 예약 사이트에서 진행됩니다.</span>
        <span>장소 정보 Google · 배경 사진 Unsplash</span>
      </footer>
    </div>
  );
}
