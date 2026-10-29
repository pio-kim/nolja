"use client";

import { CloudIcon, CloudRainIcon, CloudSnowIcon, CloudSunIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { AirGrade, DayAir, DayForecast, WeatherReport } from "./forecast";
import { useWeather, type WeatherQuery, type WeatherState } from "./use-weather";

const DOWS = ["일", "월", "화", "수", "목", "금", "토"];

const monthDay = (date: string) => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
const dow = (date: string) => DOWS[new Date(`${date}T00:00:00Z`).getUTCDay()];
const clock = (iso: string) => `${monthDay(iso.slice(0, 10))} ${iso.slice(11, 16)}`;

const AIR: Record<AirGrade, { label: string; dot: string }> = {
  good: { label: "좋음", dot: "bg-marker-cafe" },
  normal: { label: "보통", dot: "bg-muted-foreground" },
  bad: { label: "나쁨", dot: "bg-marker-restaurant" },
  "very-bad": { label: "매우나쁨", dot: "bg-destructive" },
};

function SkyIcon({ sky }: { sky: string }) {
  const props = { "aria-hidden": true, className: "size-4" };
  if (sky.includes("눈")) return <CloudSnowIcon {...props} />;
  if (sky.includes("비") || sky.includes("소나기")) return <CloudRainIcon {...props} />;
  if (sky.includes("흐림")) return <CloudIcon {...props} />;
  if (sky.includes("구름")) return <CloudSunIcon {...props} />;
  return <SunIcon {...props} />;
}

const degrees = (n: number | null) => (n === null ? "–" : `${n}°`);
const percent = (n: number | null) => (n === null ? "–" : `${n}%`);

// Weather for the search place over the whole stay. It stays on the search place
// even when food is re-based on a lodging.
export function WeatherStrip({ query }: { query: WeatherQuery }) {
  const { state, retry } = useWeather(query);
  return <WeatherStripView state={state} onRetry={retry} />;
}

export function WeatherStripView({ state, onRetry }: { state: WeatherState; onRetry: () => void }) {
  if (state.status === "error") {
    return (
      <section
        aria-label="날씨"
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
      >
        <div>
          <b>날씨를 불러오지 못했어요.</b>
          <p className="text-sm text-muted-foreground">
            {state.reason === "missing-key"
              ? "날씨 서비스 키가 설정되지 않았어요. 숙소와 음식점 결과는 그대로 볼 수 있습니다."
              : "숙소와 음식점 결과는 그대로 볼 수 있습니다."}
          </p>
        </div>
        {state.reason === "failed" && (
          <Button size="sm" className="rounded-full px-4" onClick={onRetry}>
            다시 시도
          </Button>
        )}
      </section>
    );
  }

  return (
    <section aria-label="날씨" aria-busy={state.status === "loading"} className="grid gap-2">
      <ul
        className={cn(
          "grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]",
          // Phones swipe through the days instead of stacking them.
          "max-sm:auto-cols-[78%] max-sm:grid-flow-col max-sm:[grid-template-columns:none] max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:pb-1",
        )}
      >
        {state.status === "loading"
          ? [0, 1, 2].map((i) => (
              <li key={i} className="grid gap-2 rounded-2xl border bg-card p-4">
                <Skeleton className="h-[18px] w-3/5" />
                <Skeleton className="h-7 w-2/5" />
                <Skeleton className="h-3.5" />
              </li>
            ))
          : state.report.days.map((day) => (
              <li key={day.date} className="grid content-start gap-2 rounded-2xl border bg-card p-4 max-sm:snap-start">
                <div className="flex items-baseline justify-between gap-2">
                  <b className="font-heading text-[17px] font-medium">{monthDay(day.date)}</b>
                  <span className="text-sm text-muted-foreground">
                    {dow(day.date)}요일{day.forecast.kind !== "none" && day.forecast.source === "mid" && " · 중기예보"}
                  </span>
                </div>
                <ForecastBody forecast={day.forecast} />
                <AirLine air={day.air} />
              </li>
            ))}
      </ul>
      <p className="min-h-4 text-xs text-muted-foreground">{state.status === "ready" && sourceLine(state.report)}</p>
    </section>
  );
}

function ForecastBody({ forecast }: { forecast: DayForecast }) {
  if (forecast.kind === "none") {
    return (
      <p className="text-[13px] text-muted-foreground">
        아직 예보 없음{forecast.availableFrom && ` · ${monthDay(forecast.availableFrom)}부터 확인 가능`}
      </p>
    );
  }
  if (forecast.kind === "ampm") {
    return (
      <>
        <p className="text-xl tabular-nums">
          {degrees(forecast.max)} <small className="text-[13px] text-muted-foreground">/ {degrees(forecast.min)}</small>
        </p>
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          {(
            [
              ["오전", forecast.am],
              ["오후", forecast.pm],
            ] as const
          ).map(([label, slot]) => (
            <div key={label} className="rounded-[10px] bg-muted px-2 py-1.5">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div>
                {slot.sky} · 강수 {percent(slot.pop)}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <p className="flex items-center gap-2 text-sm">
        <SkyIcon sky={forecast.sky} />
        {forecast.sky}
      </p>
      <p className="text-xl tabular-nums">
        {degrees(forecast.max)}{" "}
        <small className="text-[13px] text-muted-foreground">
          / {degrees(forecast.min)} · 강수 {percent(forecast.pop)}
        </small>
      </p>
    </>
  );
}

function AirLine({ air }: { air: DayAir }) {
  if (air.kind === "grade") {
    const { label, dot } = AIR[air.grade];
    return (
      <p className="inline-flex items-center gap-1.5 text-[13px]">
        <i className={cn("inline-block size-2 rounded-full", dot)} />
        미세먼지 {label}
      </p>
    );
  }
  return (
    <p className="text-[13px] text-muted-foreground">
      {air.kind === "failed"
        ? "미세먼지 정보를 불러오지 못했어요"
        : `미세먼지 아직 예보 없음${air.availableFrom ? ` · ${monthDay(air.availableFrom)}부터 확인 가능` : ""}`}
    </p>
  );
}

function sourceLine(report: WeatherReport): string {
  const kma = report.midIssuedAt
    ? `기상청 단기예보 ${clock(report.shortIssuedAt)} · 중기예보 ${clock(report.midIssuedAt)} 발표`
    : `기상청 단기예보 ${clock(report.shortIssuedAt)} 발표`;
  const air = report.airCheckedAt
    ? `대기질 Google Air Quality(한국 기준 등급) ${clock(report.airCheckedAt)} 조회`
    : "대기질 Google Air Quality(한국 기준 등급)";
  return `${kma} · ${air}`;
}
