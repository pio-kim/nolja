# 예약 사이트 자동 조회

## Decisions

- 예약 사이트(야놀자, 여기어때 등)를 Playwright 같은 자동 접근으로 조회하는 기능은 만들지 않는다.
- API에 없는 숙소는 예약 사이트 검색 딥링크와, 숙소별 판매처 예약 링크로 사용자가 직접 찾게 한다.

## Boundaries

- 사용자가 링크를 눌러 예약 사이트로 이동하는 것은 이 결정의 대상이 아니다.
- 공식 API나 제휴 피드처럼 사이트가 명시적으로 허용한 경로는 이 결정과 별개로 검토할 수 있다.

## Why

2026-10-29 확인 결과, 자동 조회를 해도 되는 국내 숙소 사이트가 없었다. 야놀자·여기어때·아고다·트립비토즈는 robots.txt가 검색 페이지를 막는다. 아고다는 약관에서 자동 조회와 스크래핑도 명시적으로 금지한다. 네이버 지도는 AI 크롤러를 차단한다. 해외 검색을 제외하면서 Booking.com·Expedia 같은 해외 사이트도 대상에서 빠졌다. 대상이 없는 상태에서 틀만 만들면 위험만 남는다. API에 없는 숙소를 찾는 길은 딥링크로 충분히 보완된다. 사용자가 직접 제외를 정했다.

## Reconsider when

- 국내 숙소 사이트가 robots.txt와 약관에서 검색 결과 자동 조회를 허용하는 것이 확인될 때
- 딥링크만으로는 국내 모텔을 찾지 못한다는 사용자 불편이 반복해서 확인될 때

## Still-rejected alternatives

- 허용 사이트 없이 어댑터 틀과 설정 스위치만 미리 만들기 — 켤 대상이 없어 사용자 가치가 없고 유지 부담만 생긴다. 허용 사이트가 생기면 다시 검토한다.
- 인터파크 한 곳만 대상으로 만들기 — robots.txt는 전체 허용이지만 약관을 확인하지 않았다. 약관에서 허용이 확인되면 다시 검토한다.

## Evidence worth preserving

- 2026-10-29 robots.txt 확인 결과
  - `nol.yanolja.com`: `/search/`, `/discovery/` 차단
  - `www.yeogi.com`: `?keyword=` 차단
  - `www.agoda.com`: `/search` 차단, 약관에서 robot·spider·scraper·자동 수단 접근 금지
  - `www.tripbtoz.com`: `/search`, `/detail` 차단
  - `map.naver.com`: GPTBot, ClaudeBot 등 AI 크롤러 전체 차단
  - `travel.interpark.com`: `Allow: /`
