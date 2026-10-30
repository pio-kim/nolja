"use client";

import Image from "next/image";
import { ArrowUpRightIcon, BedDoubleIcon, NavigationIcon, StarIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { directionsUrl } from "@/lib/directions";
import { cn } from "@/lib/utils";

import { bookingSearchLinks } from "./booking-links";
import { fetchedTime, taxLabel, TYPE_LABEL, won } from "./format";
import type { Lodging } from "./lodgings";
import { cheapestSeller } from "./sellers";
import type { SellersState } from "./use-seller-prefetch";
import type { LodgingsState } from "./use-lodgings";

export const DEFAULT_RADIUS_KM = 3;
export const WIDE_RADIUS_KM = 5;

export function visibleLodgings(state: LodgingsState, radiusKm: number): Lodging[] {
  return state.status === "ready" ? state.lodgings.filter((l) => l.distanceKm <= radiusKm) : [];
}

export function LodgingList({
  state,
  radiusKm,
  nights,
  query,
  hoveredId,
  selectedId,
  pickedId,
  sellersOf,
  onHover,
  onSelect,
  onWiden,
  onRetry,
}: {
  state: LodgingsState;
  radiusKm: number;
  nights: number;
  query: string;
  hoveredId: string | null;
  selectedId: string | null;
  pickedId: string | null; // picked on the map
  sellersOf: (id: string) => SellersState;
  onHover: (id: string | null) => void;
  onSelect: (lodging: Lodging) => void;
  onWiden: () => void;
  onRetry: () => void;
}) {
  if (state.status === "loading") return <LodgingSkeleton />;

  if (state.status === "error") {
    return (
      <div className="grid justify-items-center gap-5 rounded-2xl border bg-card px-6 py-10 text-center" role="alert">
        <span className="grid size-12 place-items-center rounded-full bg-muted">
          <BedDoubleIcon className="size-5" />
        </span>
        <div className="grid gap-2">
          <h3 className="font-heading text-xl">지금은 숙소 가격 비교를 불러올 수 없어요</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            <b className="font-semibold text-foreground">{query}</b> 근처 숙소는 아래 예약 사이트에서 바로 볼 수 있어요.
            날짜와 인원은 사이트에서 다시 골라 주세요.
          </p>
        </div>
        <div className="grid w-full max-w-xl gap-2 sm:grid-cols-3">
          <BookingSiteButtons query={query} />
        </div>
        {state.reason === "failed" && (
          <Button variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground" onClick={onRetry}>
            가격 비교 다시 불러오기
          </Button>
        )}
      </div>
    );
  }

  const lodgings = visibleLodgings(state, radiusKm);
  const canWiden = radiusKm < WIDE_RADIUS_KM && state.lodgings.some((l) => l.distanceKm <= WIDE_RADIUS_KM);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          반경 {radiusKm}km · 총액 낮은 순 · {lodgings.length}곳
        </span>
        <span className="text-xs">{fetchedTime(state.fetchedAt)} 조회 · 예약 사이트에서 가격이 달라질 수 있어요</span>
      </div>

      {lodgings.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
          <h3 className="font-heading text-xl">반경 {radiusKm}km 안에 예약 가능한 숙소가 없어요</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            이 날짜에 빈 방이 있는 숙소를 찾지 못했습니다. 범위를 넓히거나, 예약 사이트에서 근처 숙소를 직접 찾아보세요.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {canWiden && (
              <Button size="lg" className="rounded-full px-5" onClick={onWiden}>
                {WIDE_RADIUS_KM}km까지 넓혀 보기
              </Button>
            )}
            <BookingSiteButtons query={query} />
          </div>
          <p className="text-xs text-muted-foreground">예약 사이트에서는 날짜와 인원을 다시 선택해 주세요.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {lodgings.map((l) => (
            <li key={l.id}>
              <LodgingCard
                lodging={l}
                sellers={sellersOf(l.id)}
                nights={nights}
                active={l.id === hoveredId || l.id === selectedId}
                picked={l.id === pickedId}
                onHover={onHover}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ul>
      )}

      {lodgings.length > 0 && (
        <div className="mt-4 grid gap-3 rounded-2xl bg-muted p-6">
          <h4 className="font-heading text-lg">찾는 숙소가 없나요?</h4>
          <p className="text-sm text-muted-foreground">
            모텔처럼 여기에 나오지 않는 숙소는 예약 사이트에서 ‘{query}’ 근처로 직접 찾아보세요.
          </p>
          <div className="flex flex-wrap gap-2">
            <BookingSiteButtons query={query} />
          </div>
          <p className="text-xs text-muted-foreground">예약 사이트에서는 날짜와 인원을 다시 선택해 주세요.</p>
        </div>
      )}
    </div>
  );
}

function BookingSiteButtons({ query }: { query: string }) {
  return bookingSearchLinks(query).map((link) => (
    <a
      key={link.site}
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", size: "lg", className: "rounded-full px-4" })}
    >
      {link.site}에서 찾기 <ArrowUpRightIcon />
    </a>
  ));
}

function LodgingCard({
  lodging: l,
  sellers,
  nights,
  active,
  picked,
  onHover,
  onSelect,
}: {
  lodging: Lodging;
  sellers: SellersState;
  nights: number;
  active: boolean;
  picked: boolean;
  onHover: (id: string | null) => void;
  onSelect: (lodging: Lodging) => void;
}) {
  // The directions link sits beside the card button, since a link cannot sit inside it.
  return (
    <div data-item-id={l.id} className="relative">
      <button
        type="button"
        onClick={() => onSelect(l)}
        onMouseEnter={() => onHover(l.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(l.id)}
        onBlur={() => onHover(null)}
        className={cn(
          "group grid w-full overflow-hidden rounded-2xl border bg-card text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_14px_32px_rgba(0,0,0,0.08)] sm:grid-cols-[200px_1fr]",
          active && "-translate-y-0.5 border-foreground shadow-[0_14px_32px_rgba(0,0,0,0.08)]",
          picked && "border-foreground ring-2 ring-foreground",
        )}
      >
        <div className="relative h-44 overflow-hidden bg-muted sm:h-full sm:min-h-44">
          {picked && (
            <span className="absolute top-3 right-3 z-10 rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
              선택됨
            </span>
          )}
          {l.photo ? (
            <Image
              src={l.photo}
              alt=""
              fill
              sizes="(min-width: 640px) 200px, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <BedDoubleIcon className="size-6" />
            </div>
          )}
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 text-xs text-[#111]">
            {TYPE_LABEL[l.type]}
          </span>
        </div>
        <div className="grid content-start gap-2 p-4 sm:px-5">
          <h3 className="font-heading text-lg leading-snug">{l.name}</h3>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>{l.distanceKm.toFixed(1)}km</span>
            {l.rating !== null ? (
              <span className="flex items-center gap-1">
                <StarIcon className="size-3.5 fill-current" />
                <b className="font-semibold text-foreground">{l.rating.toFixed(1)}</b>({l.reviewCount.toLocaleString("ko-KR")})
              </span>
            ) : (
              <span>평점 없음</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2 border-t pt-3">
            <div className="text-xl font-bold tabular-nums">
              <span className="mr-1.5 text-sm font-normal text-muted-foreground">{nights}박 총액</span>
              {won(l.totalPrice)}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {[l.pricePerNight !== null && `1박 ${won(l.pricePerNight)}`, l.taxIncluded !== null && taxLabel(l.taxIncluded)]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <p className="pr-24 text-sm text-muted-foreground">
            <SellerLine sellers={sellers} />
          </p>
        </div>
      </button>
      <a
        href={directionsUrl(l.name, l.lat, l.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "absolute right-4 bottom-4 rounded-full bg-background px-3",
        })}
      >
        <NavigationIcon /> 길찾기
      </a>
    </div>
  );
}

function SellerLine({ sellers }: { sellers: SellersState }) {
  if (sellers.status === "loading") return <span className="animate-pulse">판매처 확인 중…</span>;
  const best = sellers.status === "ready" ? cheapestSeller(sellers) : null;
  if (!best) return <span>판매처는 숙소를 열어 확인해 주세요</span>;
  return (
    <span>
      최저가 <b className="font-semibold text-foreground">{best.source}</b> {won(best.total)} · {taxLabel(best.taxIncluded)}
    </span>
  );
}

function LodgingSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="숙소를 불러오는 중">
      <Skeleton className="h-4 w-48" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid overflow-hidden rounded-2xl border sm:grid-cols-[200px_1fr]">
          <Skeleton className="h-44 rounded-none" />
          <div className="grid content-start gap-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-6 h-7 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
