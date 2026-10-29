import { expect, test } from "vitest";

import { bookingSearchLinks } from "@/features/lodging";

test("야놀자·여기어때에서 같은 검색어로 숙소를 찾는 링크를 만든다", () => {
  expect(bookingSearchLinks("강릉 중앙시장")).toEqual([
    {
      site: "야놀자",
      url: "https://nol.yanolja.com/discovery/list/search/PRODUCT_CATEGORY_KOREA_ACCOMMODATION?q=%EA%B0%95%EB%A6%89%20%EC%A4%91%EC%95%99%EC%8B%9C%EC%9E%A5",
    },
    {
      site: "여기어때",
      url: "https://www.yeogi.com/domestic-accommodations?keyword=%EA%B0%95%EB%A6%89%20%EC%A4%91%EC%95%99%EC%8B%9C%EC%9E%A5",
    },
  ]);
});
