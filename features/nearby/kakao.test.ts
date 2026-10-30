import { describe, expect, test } from "vitest";

import { areaOf, fuelInfo, kakaoThumbnail, matchKakaoPhoto, matchKakaoPlace } from "@/features/nearby";

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

describe("주유소 연료", () => {
  test("휘발유·고급휘발유·경유·LPG 중 가격이 있는 것만 판매 연료로 보고, 갱신 시각과 셀프·24시를 읽는다", () => {
    expect(
      fuelInfo({ oil1: "1810", oil2: "0", oil3: "1799", oil4: "0", oilTime: "2026.10.29 09:34", oil_self: "Y", oil_sel24: "N" }),
    ).toEqual({ prices: { gasoline: 1810, diesel: 1799 }, updatedAt: "2026-10-29T09:34", self: true, open24: false });
    expect(fuelInfo({ oil1: "0", oil2: "0", oil3: "0", oil4: "1181", oilTime: "", oil_self: "" })).toEqual({
      prices: { lpg: 1181 },
      updatedAt: null,
      self: null,
      open24: null,
    });
  });

  test("가격이 하나도 없으면 연료 정보가 없는 것으로 본다", () => {
    expect(fuelInfo({ oil1: "0", oil2: "0", oil3: "0", oil4: "0" })).toBeNull();
    expect(fuelInfo({})).toBeNull();
  });

  test("같은 자리의 결과 중 연료 정보가 있는 곳을 고른다", () => {
    const station = { name: "교동주유소", lat: 37.76632, lon: 128.90701, oil1: "1810" };
    const carWash = { name: "교동주유소 세차장", lat: 37.76633, lon: 128.90702 };
    expect(matchKakaoPlace([carWash, station], target, (p) => fuelInfo(p) !== null)).toBe(station);
  });
});
