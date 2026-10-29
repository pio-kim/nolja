// Seller prices from SerpApi Google Hotels property details (`property_token`).
// Field names follow https://serpapi.com/google-hotels-property-details (checked 2026-10-29).
import { isTaxIncluded } from "./lodgings";

export type Seller = {
  source: string;
  link: string;
  official: boolean;
  total: number;
  taxIncluded: boolean | null;
};

export type SerpSellerPrice = {
  source?: string;
  link?: string;
  official?: boolean;
  total_rate?: {
    extracted_lowest?: number;
    extracted_before_taxes_fees?: number;
    extracted_after_taxes_fees?: number;
  };
};

function toSeller(p: SerpSellerPrice): Seller | null {
  if (!p.source || !p.link) return null;
  const afterTax = p.total_rate?.extracted_after_taxes_fees;
  const total = afterTax ?? p.total_rate?.extracted_lowest;
  if (total === undefined) return null;
  return {
    source: p.source,
    link: p.link,
    official: p.official === true,
    total,
    taxIncluded: afterTax !== undefined ? true : isTaxIncluded(p.total_rate),
  };
}

// Tax-inclusive prices are compared with each other; the rest are listed apart
// because their checkout total may be higher than shown.
export function toSellers(prices: SerpSellerPrice[]): { taxIncluded: Seller[]; other: Seller[] } {
  const sellers = prices.map(toSeller).filter((s): s is Seller => s !== null);
  const byTotal = (a: Seller, b: Seller) => a.total - b.total;
  return {
    taxIncluded: sellers.filter((s) => s.taxIncluded === true).sort(byTotal),
    other: sellers.filter((s) => s.taxIncluded !== true).sort(byTotal),
  };
}

// The seller a lodging card names: the cheapest tax-inclusive one, otherwise the
// cheapest whose tax status is unknown.
export function cheapestSeller(sellers: { taxIncluded: Seller[]; other: Seller[] }): Seller | null {
  return sellers.taxIncluded[0] ?? sellers.other[0] ?? null;
}
