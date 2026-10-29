import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { WeatherReport } from "@/features/weather";
import { WeatherStripView } from "@/features/weather/ui";

const report: WeatherReport = {
  days: [
    {
      date: "2026-10-31",
      forecast: { kind: "day", source: "short", sky: "맑음", min: 7, max: 17, pop: 10 },
      air: { kind: "grade", grade: "good" },
    },
    {
      date: "2026-11-02",
      forecast: { kind: "ampm", source: "mid", min: 6, max: 14, am: { sky: "흐림", pop: 30 }, pm: { sky: "맑음", pop: 10 } },
      air: { kind: "none", availableFrom: "2026-10-30" },
    },
    { date: "2026-11-10", forecast: { kind: "none", availableFrom: "2026-10-31" }, air: { kind: "none", availableFrom: "2026-11-06" } },
  ],
  forecastSource: { name: "kma", shortIssuedAt: "2026-10-29T14:00", midIssuedAt: "2026-10-29T06:00" },
  airSource: "google",
  checkedAt: "2026-10-29T15:12",
};

describe("날씨 영역", () => {
  test("날짜별 하늘·기온·강수·미세먼지와 출처·발표 시각을 보여준다", () => {
    render(<WeatherStripView state={{ status: "ready", report }} onRetry={() => {}} />);

    expect(screen.getByText("10월 31일")).toBeInTheDocument();
    expect(screen.getByText("미세먼지 좋음")).toBeInTheDocument();
    expect(screen.getByText("월요일 · 중기예보")).toBeInTheDocument();
    expect(screen.getByText("흐림 · 강수 30%")).toBeInTheDocument();
    expect(screen.getByText("미세먼지 아직 예보 없음 · 10월 30일부터 확인 가능")).toBeInTheDocument();
    expect(screen.getByText("아직 예보 없음 · 10월 31일부터 확인 가능")).toBeInTheDocument();
    expect(
      screen.getByText(
        "기상청 단기예보 10월 29일 14:00 · 중기예보 10월 29일 06:00 발표 · 대기질 Google Air Quality(한국 기준 등급) 10월 29일 15:12 조회",
      ),
    ).toBeInTheDocument();
  });

  test("키 없는 대체 출처(Open-Meteo)를 쓰면 출처에 그렇게 보여준다", () => {
    render(
      <WeatherStripView
        state={{ status: "ready", report: { ...report, forecastSource: { name: "open-meteo" }, airSource: "open-meteo" } }}
        onRetry={() => {}}
      />,
    );
    expect(
      screen.getByText("날씨 Open-Meteo 10월 29일 15:12 조회 · 대기질 Open-Meteo(CAMS)(한국 기준 등급) 10월 29일 15:12 조회"),
    ).toBeInTheDocument();
  });

  test("실패하면 다른 결과는 그대로라고 알리고 다시 시도할 수 있다", () => {
    const onRetry = vi.fn();
    render(<WeatherStripView state={{ status: "error" }} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("날씨를 불러오지 못했어요.");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
