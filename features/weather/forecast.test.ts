import { describe, expect, test } from "vitest";

import {
  buildReport,
  midIssueTime,
  nearestMidCity,
  openMeteoAirByDate,
  REACH_DAYS,
  shortBaseTime,
  summarizeMid,
  summarizeOpenMeteo,
  summarizeShort,
  toKmaGrid,
  worstAirByDate,
} from "@/features/weather";

// 2026-10-29 15:12 KST
const NOW = new Date("2026-10-29T06:12:00Z");

function shortItems(date: string, hours: Record<string, Record<string, string>>) {
  return Object.entries(hours).flatMap(([time, values]) =>
    Object.entries(values).map(([category, fcstValue]) => ({ category, fcstDate: date, fcstTime: time, fcstValue })),
  );
}

describe("기상청 조회 기준", () => {
  test("위경도를 단기예보 5km 격자로 바꾼다", () => {
    expect(toKmaGrid({ lat: 37.5665, lng: 126.978 })).toEqual({ nx: 60, ny: 127 });
  });

  test("단기예보는 발표 10분 뒤부터 쓰고, 02시 이전이면 전날 23시 발표를 쓴다", () => {
    expect(shortBaseTime(NOW)).toEqual({ baseDate: "20261029", baseTime: "1400" });
    expect(shortBaseTime(new Date("2026-10-29T05:05:00Z"))).toEqual({ baseDate: "20261029", baseTime: "1100" });
    expect(shortBaseTime(new Date("2026-10-28T16:30:00Z"))).toEqual({ baseDate: "20261028", baseTime: "2300" });
  });

  test("중기예보는 06시·18시 발표를 쓴다", () => {
    expect(midIssueTime(NOW)).toBe("202610290600");
    expect(midIssueTime(new Date("2026-10-28T20:00:00Z"))).toBe("202610281800");
  });

  test("가장 가까운 도시의 중기 기온·육상 예보 구역을 고른다", () => {
    expect(nearestMidCity({ lat: 37.754, lng: 128.899 })).toMatchObject({ tempRegId: "11D20501", landRegId: "11D20000" });
  });
});

describe("날짜별 요약", () => {
  test("단기예보는 하늘 상태, 최저·최고 기온, 최대 강수 확률로 묶는다", () => {
    const days = summarizeShort([
      ...shortItems("20261031", {
        "0600": { SKY: "1", PTY: "0", POP: "0", TMP: "8", TMN: "7.0" },
        "1200": { SKY: "1", PTY: "0", POP: "10", TMP: "16" },
        "1500": { SKY: "3", PTY: "0", POP: "10", TMP: "17", TMX: "17.0" },
      }),
      ...shortItems("20261101", {
        "0900": { SKY: "3", PTY: "0", POP: "30", TMP: "10" },
        "1200": { SKY: "3", PTY: "1", POP: "60", TMP: "14" },
        "1500": { SKY: "3", PTY: "0", POP: "30", TMP: "15" },
      }),
    ]);

    expect(days.get("2026-10-31")).toEqual({ kind: "day", source: "short", sky: "맑음", min: 7, max: 17, pop: 10 });
    expect(days.get("2026-11-01")).toMatchObject({ sky: "구름많음, 한때 비", min: 10, max: 15, pop: 60 });
  });

  test("영하 0도도 기온으로 남긴다", () => {
    const days = summarizeShort(shortItems("20261231", { "0600": { SKY: "1", PTY: "0", POP: "0", TMP: "0", TMN: "0" } }));
    expect(days.get("2026-12-31")).toMatchObject({ min: 0, max: 0 });
  });

  test("중기예보는 오전·오후로 나뉜 날과 하루 단위인 날을 구분한다", () => {
    const days = summarizeMid(
      "202610290600",
      { wf4Am: "흐림", wf4Pm: "맑음", rnSt4Am: 30, rnSt4Pm: 10, wf8: "구름많음", rnSt8: 20 },
      { taMin4: 6, taMax4: 14, taMin8: 5, taMax8: 13 },
    );

    expect(days.get("2026-11-02")).toEqual({
      kind: "ampm",
      source: "mid",
      min: 6,
      max: 14,
      am: { sky: "흐림", pop: 30 },
      pm: { sky: "맑음", pop: 10 },
    });
    expect(days.get("2026-11-06")).toEqual({ kind: "day", source: "mid", sky: "구름많음", min: 5, max: 13, pop: 20 });
  });

  test("미세먼지는 한국 기준 통합 등급으로, 그날 가장 나쁜 시간대를 쓴다", () => {
    const air = worstAirByDate([
      { dateTime: "2026-10-30T15:00:00Z", indexes: [{ code: "kor_airkorea", aqi: 40 }] }, // 10-31 00시 KST
      { dateTime: "2026-10-31T05:00:00Z", indexes: [{ code: "kor_airkorea", aqi: 120 }] },
      { dateTime: "2026-10-31T16:00:00Z", indexes: [{ code: "kor_airkorea", aqi: 70 }] }, // 11-01
    ]);
    expect(air.get("2026-10-31")).toBe("bad");
    expect(air.get("2026-11-01")).toBe("normal");
  });

  test("Open-Meteo 일별 예보는 WMO 코드를 하늘 상태로 바꾸고 값이 없는 날은 뺀다", () => {
    const days = summarizeOpenMeteo({
      time: ["2026-10-31", "2026-11-01", "2026-11-02"],
      weather_code: [1, 61, null],
      temperature_2m_max: [16.6, 14.2, null],
      temperature_2m_min: [6.8, -0.4, null],
      precipitation_probability_max: [10, 70, null],
    });
    expect(days.get("2026-10-31")).toEqual({ kind: "day", source: "open-meteo", sky: "맑음", min: 7, max: 17, pop: 10 });
    expect(days.get("2026-11-01")).toMatchObject({ sky: "비", min: -0, max: 14, pop: 70 });
    expect(days.has("2026-11-02")).toBe(false);
  });

  test("Open-Meteo 미세먼지는 PM10·PM2.5 한국 기준 중 나쁜 쪽을, 그날 가장 나쁜 시간대로 쓴다", () => {
    const air = openMeteoAirByDate({
      time: ["2026-10-31T00:00", "2026-10-31T12:00", "2026-11-01T00:00", "2026-11-02T00:00"],
      pm10: [20, 25, 90, null],
      pm2_5: [10, 20, 30, null],
    });
    expect(air.get("2026-10-31")).toBe("normal"); // PM2.5 20 → 보통
    expect(air.get("2026-11-01")).toBe("bad"); // PM10 90 → 나쁨
    expect(air.has("2026-11-02")).toBe(false);
  });
});

describe("숙박 기간 날씨", () => {
  const short = new Map([["2026-10-31", { kind: "day", source: "short", sky: "맑음", min: 7, max: 17, pop: 10 } as const]]);
  const kma = { name: "kma", shortIssuedAt: "2026-10-29T14:00", midIssuedAt: "2026-10-29T06:00" } as const;

  test("체크인 날부터 체크아웃 날까지 날짜마다 날씨를 두고, 없는 예보는 언제부터 볼 수 있는지 알려준다", () => {
    const report = buildReport({
      checkIn: "2026-10-31",
      checkOut: "2026-11-10",
      now: NOW,
      forecast: { days: short, reachDays: REACH_DAYS.kma, source: kma },
      air: { grades: new Map([["2026-10-31", "good" as const]]), reachDays: REACH_DAYS.google, source: "google" },
    });

    expect(report.days.map((d) => d.date)).toHaveLength(11);
    expect(report.days[0]).toMatchObject({ forecast: { sky: "맑음" }, air: { kind: "grade", grade: "good" } });
    expect(report.days[10]).toMatchObject({
      date: "2026-11-10",
      forecast: { kind: "none", availableFrom: "2026-10-31" },
      air: { kind: "none", availableFrom: "2026-11-06" },
    });
    expect(report.forecastSource).toEqual({ name: "kma", shortIssuedAt: "2026-10-29T14:00", midIssuedAt: null });
    expect(report.airSource).toBe("google");
    expect(report.checkedAt).toBe("2026-10-29T15:12");
  });

  test("미세먼지 조회가 실패해도 기온·강수는 그대로 둔다", () => {
    const report = buildReport({
      checkIn: "2026-10-31",
      checkOut: "2026-10-31",
      now: NOW,
      forecast: { days: short, reachDays: REACH_DAYS.kma, source: kma },
      air: null,
    });
    expect(report.days[0]).toMatchObject({ forecast: { sky: "맑음" }, air: { kind: "failed" } });
    expect(report.airSource).toBeNull();
  });

  test("Open-Meteo는 16일까지 예보하므로 그 뒤 날짜는 15일 전부터 확인 가능하다", () => {
    const report = buildReport({
      checkIn: "2026-11-14",
      checkOut: "2026-11-15",
      now: NOW,
      forecast: { days: new Map(), reachDays: REACH_DAYS["open-meteo"], source: { name: "open-meteo" } },
      air: { grades: new Map(), reachDays: REACH_DAYS["open-meteo-air"], source: "open-meteo" },
    });
    expect(report.days[1]).toMatchObject({
      forecast: { kind: "none", availableFrom: "2026-10-31" },
      air: { kind: "none", availableFrom: "2026-11-11" },
    });
    expect(report.forecastSource).toEqual({ name: "open-meteo" });
  });
});
