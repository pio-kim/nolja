// Search deep links for lodgings the API does not cover (especially motels).
// Neither site's search URL is known to accept dates or guests, so users pick
// them again on the site. Formats checked on the live sites 2026-10-29.
export type BookingLink = { site: string; url: string };

export function bookingSearchLinks(query: string): BookingLink[] {
  const q = encodeURIComponent(query);
  return [
    {
      site: "야놀자",
      url: `https://nol.yanolja.com/discovery/list/search/PRODUCT_CATEGORY_KOREA_ACCOMMODATION?q=${q}`,
    },
    { site: "여기어때", url: `https://www.yeogi.com/domestic-accommodations?keyword=${q}` },
  ];
}
