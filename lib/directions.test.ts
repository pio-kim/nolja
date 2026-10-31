import { expect, test } from "vitest";

import { directionsUrl } from "@/lib/directions";

test("카카오맵 길찾기 링크는 목적지 이름과 좌표를 담고, 이름의 쉼표는 공백으로 바꾼다", () => {
  expect(directionsUrl("강릉중앙시장", 37.754, 128.899)).toBe(
    "https://map.kakao.com/link/to/%EA%B0%95%EB%A6%89%EC%A4%91%EC%95%99%EC%8B%9C%EC%9E%A5,37.754,128.899",
  );
  expect(directionsUrl("A,B", 1, 2)).toBe("https://map.kakao.com/link/to/A%20B,1,2");
});
