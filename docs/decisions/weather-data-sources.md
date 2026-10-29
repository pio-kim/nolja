# 날씨·대기질 데이터 출처

## Decisions

- 기온·강수·하늘 상태는 기상청 예보(공공데이터포털)로 받는다. 가까운 날은 단기예보, 그보다 뒤 날짜는 중기예보를 쓴다.
- 미세먼지는 Google Air Quality API로 받고, 한국 기준 등급(`kor_airkorea`)으로 보여준다.

## Boundaries

- 국내 위치에만 적용한다. 해외는 PRODUCT.md에서 제외했다.
- 예보가 없는 날짜의 값을 추정하거나 다른 출처로 대신 채우지 않는다.

## Why

Google Weather API는 공식 FAQ상 일본과 한국을 지원하지 않는다. 그래서 국내 기온·강수는 기상청 말고는 쓸 만한 공식 출처가 없다. 미세먼지는 에어코리아 예보도 쓸 수 있다. 하지만 시·도 단위로 묶여 있고 예보 기간이 짧다. Google Air Quality API는 좌표 지점 기준으로 최대 96시간 시간별 예보를 주고, 이미 쓰는 Google 키로 호출할 수 있어서 이쪽을 택했다.

## Reconsider when

- Google Weather API가 한국을 지원 국가에 넣을 때
- Google Air Quality API 요금이 사용량에 비해 부담이 되거나, 한국 지원이 빠질 때
- 에어코리아가 좌표 단위나 더 긴 기간의 미세먼지 예보를 제공할 때

## Still-rejected alternatives

- Google Weather API로 기온·강수 받기 — 한국 미지원이다. 지원 국가에 한국이 들어오면 다시 검토한다.
- 에어코리아 미세먼지 예보 — 무료지만 시·도 단위이고 예보 기간이 짧다. Google 요금이 문제가 되면 다시 검토한다.

## Evidence worth preserving

- 2026-10-29 Google Maps Platform Code Assist 조회 결과: Weather API FAQ에 "The Weather API supports all countries globally except Japan, Korea, and prohibited territories"라고 나온다. 같은 날 Air Quality API 지원 국가 표에는 대한민국(KR)의 기본 LAQI가 `kor_airkorea`로 나오고, 예보 엔드포인트는 최대 96시간이다.
- 2026-10-29 공공데이터포털 "기상청_단기예보 조회서비스" 소개: 단기예보는 글피까지 1시간 단위, 5km 격자, 읍·면·동 단위로 예보하고, 개발계정 트래픽은 10,000이다.
