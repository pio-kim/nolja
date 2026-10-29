import { describe, expect, test } from "vitest";

import { defaultStay, todayInKorea, validateStay } from "@/features/search";

describe("숙박 일정", () => {
  test("오늘은 한국 시간 기준 날짜다", () => {
    expect(todayInKorea(new Date("2026-10-29T16:00:00Z"))).toBe("2026-10-30");
    expect(todayInKorea(new Date("2026-10-29T14:59:00Z"))).toBe("2026-10-29");
  });

  test("날짜를 고르지 않으면 체크인은 오늘, 체크아웃은 내일이다", () => {
    expect(defaultStay("2026-10-29")).toEqual({
      checkIn: "2026-10-29",
      checkOut: "2026-10-30",
    });
  });

  test("지난 날짜에 체크인할 수 없다", () => {
    expect(
      validateStay({ checkIn: "2026-10-28", checkOut: "2026-10-30" }, "2026-10-29"),
    ).toBe("past-check-in");
  });

  test("체크아웃은 체크인보다 뒤여야 한다", () => {
    expect(
      validateStay({ checkIn: "2026-10-31", checkOut: "2026-10-31" }, "2026-10-29"),
    ).toBe("check-out-not-after-check-in");
  });

  test("최대 30박까지 고를 수 있다", () => {
    const today = "2026-10-29";
    expect(validateStay({ checkIn: "2026-11-01", checkOut: "2026-12-01" }, today)).toBeNull();
    expect(validateStay({ checkIn: "2026-11-01", checkOut: "2026-12-02" }, today)).toBe(
      "too-many-nights",
    );
  });
});
