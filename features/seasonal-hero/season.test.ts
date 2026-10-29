import { describe, expect, test } from "vitest";

import { seasonOf } from "@/features/seasonal-hero/season";

describe("계절 배경", () => {
  test("한국 날짜의 달로 계절을 정한다 (봄 3–5월, 여름 6–8월, 가을 9–11월, 겨울 12–2월)", () => {
    expect(seasonOf("2026-03-01")).toBe("spring");
    expect(seasonOf("2026-05-31")).toBe("spring");
    expect(seasonOf("2026-06-01")).toBe("summer");
    expect(seasonOf("2026-08-31")).toBe("summer");
    expect(seasonOf("2026-10-29")).toBe("autumn");
    expect(seasonOf("2026-12-01")).toBe("winter");
    expect(seasonOf("2027-02-28")).toBe("winter");
  });
});
