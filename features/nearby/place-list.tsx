"use client";

import {
  ArrowUpRightIcon,
  BedDoubleIcon,
  CoffeeIcon,
  FuelIcon,
  NavigationIcon,
  StarIcon,
  UtensilsIcon,
  WashingMachineIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { directionsUrl } from "@/lib/directions";
import { cn } from "@/lib/utils";

import { sortPlaces, type Place, type PlaceCategory, type PlaceSort } from "./places";
import type { NearbyBase, PlacesState } from "./use-places";

export const CATEGORY_LABEL: Record<PlaceCategory, string> = {
  restaurant: "음식점",
  cafe: "카페",
  lodging: "숙소",
  gas_station: "주유소",
  laundry: "빨래방",
};
const CATEGORY_ICON = {
  restaurant: UtensilsIcon,
  cafe: CoffeeIcon,
  lodging: BedDoubleIcon,
  gas_station: FuelIcon,
  laundry: WashingMachineIcon,
};

export function visiblePlaces(state: PlacesState, sort: PlaceSort): Place[] {
  return state.status === "ready" ? sortPlaces(state.places, sort) : [];
}

export function PlaceList({
  state,
  category,
  base,
  baseIsLodging,
  area,
  notice,
  sort,
  hoveredId,
  selectedId,
  onSort,
  onHover,
  onResetBase,
  onRetry,
}: {
  state: PlacesState;
  category: PlaceCategory;
  base: NearbyBase;
  baseIsLodging: boolean;
  area: string | null; // city or county of the search place, for finding map photos
  notice?: ReactNode; // replaces the base-point banner
  sort: PlaceSort;
  hoveredId: string | null;
  selectedId: string | null; // picked on the map
  onSort: (sort: PlaceSort) => void;
  onHover: (id: string | null) => void;
  onResetBase: () => void;
  onRetry: () => void;
}) {
  const places = visiblePlaces(state, sort);

  return (
    <div className="flex flex-col gap-4">
      {notice ?? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm",
            baseIsLodging ? "border border-foreground bg-card" : "bg-muted",
          )}
        >
          <span>
            <b>{base.name}</b> 기준 ·{" "}
            {baseIsLodging ? `숙소 근처 ${CATEGORY_LABEL[category]}` : "숙소를 고르면 그 숙소 근처로 바뀌어요"}
          </span>
          {baseIsLodging && (
            <button type="button" onClick={onResetBase} className="font-medium underline underline-offset-4">
              검색한 장소 기준으로 돌아가기
            </button>
          )}
        </div>
      )}

      {state.status === "loading" && <PlaceSkeleton />}

      {state.status === "error" && (
        <div className="rounded-2xl border bg-card p-8 text-center" role="alert">
          <h3 className="font-heading text-xl">{CATEGORY_LABEL[category]}을(를) 불러오지 못했어요</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.reason === "missing-key" ? "장소 검색 키가 설정되지 않았어요." : "잠시 후 다시 시도해 주세요."}
          </p>
          {state.reason === "failed" && (
            <Button size="lg" className="mt-4 rounded-full px-5" onClick={onRetry}>
              다시 시도
            </Button>
          )}
        </div>
      )}

      {state.status === "ready" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>반경 3km · {places.length}곳</span>
            <div role="group" aria-label="정렬" className="inline-flex rounded-full bg-muted p-1">
              {(["rating", "distance"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sort === s}
                  onClick={() => onSort(s)}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors duration-200",
                    sort === s ? "bg-background font-semibold text-foreground shadow-sm" : "hover:text-foreground",
                  )}
                >
                  {s === "rating" ? "평점순" : "거리순"}
                </button>
              ))}
            </div>
          </div>

          {places.length === 0 ? (
            <div className="grid justify-items-center gap-2 rounded-2xl border bg-card px-6 py-12 text-center">
              <h3 className="font-heading text-xl">반경 3km 안에 {CATEGORY_LABEL[category]}이(가) 없어요</h3>
              <p className="text-sm text-muted-foreground">
                {baseIsLodging
                  ? "검색한 장소 기준으로 돌아가 보거나, 다른 탭을 확인해 보세요."
                  : "다른 탭을 확인하거나 검색 장소를 바꿔 보세요."}
              </p>
            </div>
          ) : (
            <ul className="grid gap-3">
              {places.map((p) => (
                <li key={p.id}>
                  <PlaceCard
                    place={p}
                    area={area}
                    active={p.id === hoveredId}
                    selected={p.id === selectedId}
                    onHover={onHover}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function PlaceCard({
  place: p,
  area,
  active,
  selected,
  onHover,
}: {
  place: Place;
  area: string | null;
  active: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
}) {
  const Icon = CATEGORY_ICON[p.category];
  // Google gives no place photos in Korea, so most cards use the place's
  // Kakao Map photo; the icon stays when neither exists.
  const [photo, setPhoto] = useState<"loading" | "shown" | "none">("loading");
  const src = p.photoName
    ? `/api/places/photo?${new URLSearchParams({ name: p.photoName, w: "320" })}`
    : `/api/nearby/photo?${new URLSearchParams({ name: p.name, lat: String(p.lat), lng: String(p.lng), ...(area && { area }) })}`;
  const credit = photo !== "shown" ? null : p.photoName ? p.photoCredit : "카카오맵";
  // The directions link sits beside the card link, since links cannot nest.
  return (
    <div data-item-id={p.id} className="relative">
      <a
        href={p.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => onHover(p.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(p.id)}
        onBlur={() => onHover(null)}
        className={cn(
          "group grid grid-cols-[96px_1fr] overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-transparent hover:shadow-[0_14px_32px_rgba(0,0,0,0.08)] sm:grid-cols-[128px_1fr]",
          active && "-translate-y-0.5 border-foreground shadow-[0_14px_32px_rgba(0,0,0,0.08)]",
          selected && "border-foreground ring-2 ring-foreground",
        )}
      >
        <div className="relative min-h-28 overflow-hidden bg-muted">
          {selected && (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
              선택됨
            </span>
          )}
          {photo !== "shown" && (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <Icon className="size-5" />
            </div>
          )}
          {photo !== "none" && (
            // eslint-disable-next-line @next/next/no-img-element -- served through our photo redirect routes
            <img
              src={src}
              alt=""
              onLoad={() => setPhoto("shown")}
              onError={() => setPhoto("none")}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105",
                photo !== "shown" && "invisible",
              )}
            />
          )}
        </div>
        <div className="grid content-start gap-1.5 p-3 pb-12 sm:px-4">
          <h3 className="flex items-start justify-between gap-2 font-heading text-base leading-snug">
            <span className="line-clamp-2 break-all" title={p.name}>
              {p.name}
            </span>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.kind && <span>{p.kind}</span>}
            <span>{p.distanceKm.toFixed(1)}km</span>
            {p.priceLevel && <span>{p.priceLevel}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.rating !== null ? (
              <span className="flex items-center gap-1">
                <StarIcon className="size-3.5 fill-current" />
                <b className="font-semibold text-foreground">{p.rating.toFixed(1)}</b>({p.reviewCount.toLocaleString("ko-KR")})
              </span>
            ) : (
              <span>평점 없음</span>
            )}
            {p.reviewCount > 0 && p.reviewCount < 20 && <span>리뷰 적음</span>}
            {p.openNow === true && <span className="text-[#2F6B45]">● 영업 중</span>}
            {p.openNow === false && <span>영업 종료</span>}
            <span>{p.source === "naver" ? "네이버" : "Google"}</span>
          </div>
          {credit && <span className="text-[11px] text-muted-foreground">사진 · {credit}</span>}
        </div>
      </a>
      <a
        href={directionsUrl(p.name, p.lat, p.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: "absolute right-3 bottom-3 rounded-full bg-background px-3",
        })}
      >
        <NavigationIcon /> 길찾기
      </a>
    </div>
  );
}

function PlaceSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="장소를 불러오는 중">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-[96px_1fr] overflow-hidden rounded-2xl border sm:grid-cols-[128px_1fr]">
          <Skeleton className="h-28 rounded-none" />
          <div className="grid content-start gap-2 p-4">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
