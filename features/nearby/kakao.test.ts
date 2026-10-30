import { describe, expect, test } from "vitest";

import { areaOf, kakaoThumbnail, matchKakaoPhoto } from "@/features/nearby";

const target = { name: "엄지네포장마차 본점", lat: 37.76632, lng: 128.90701 };
const img = "http://t1.kakaocdn.net/local/kakaomapPhoto/review/abc?original";

describe("카카오맵 사진", () => {
  test("150m 안의 같은 업소 사진을 썸네일 주소로 쓰고, 이름이 같은 곳을 먼저 고른다", () => {
    const photo = matchKakaoPhoto(
      [
        { name: "옆집 식당", lat: 37.76633, lon: 128.90702, img: "http://t1.kakaocdn.net/other?original" },
        { name: "엄지네포장마차 본점", lat: "37.76640", lon: "128.90710", img },
      ],
      target,
    );
    expect(photo).toBe(kakaoThumbnail(img));
    expect(photo).toMatch(/^https:\/\/img1\.kakaocdn\.net\/cthumb\/local\/C320x320\.q50\/\?fname=https%3A/);
  });

  test("멀리 있는 같은 이름의 지점이나 사진 없는 결과는 쓰지 않는다", () => {
    expect(
      matchKakaoPhoto(
        [
          { name: "엄지네포장마차 본점", lat: 37.5665, lon: 126.978, img }, // 서울
          { name: "엄지네포장마차 본점", lat: 37.76632, lon: 128.90701 },
        ],
        target,
      ),
    ).toBeNull();
  });

  test("주소에서 시·군을 뽑아 검색을 좁힌다", () => {
    expect(areaOf("강원특별자치도 강릉시 금성로 21")).toBe("강릉시");
    expect(areaOf("경기도 성남시 분당구 판교역로 1")).toBe("성남시");
    expect(areaOf("서울특별시 중구 세종대로 110")).toBe("서울특별시");
    expect(areaOf("")).toBeNull();
  });
});
