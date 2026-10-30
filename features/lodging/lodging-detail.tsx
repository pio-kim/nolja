"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ArrowUpRightIcon, NavigationIcon, StarIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { directionsUrl } from "@/lib/directions";
import { cn } from "@/lib/utils";

import { bookingSearchLinks } from "./booking-links";
import { fetchedTime, taxLabel, TYPE_LABEL, won } from "./format";
import type { Lodging } from "./lodgings";
import type { Seller } from "./sellers";
import type { SellersState } from "./use-seller-prefetch";

function useIsWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia("(min-width: 1024px)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export function LodgingDetail({
  lodging,
  sellersOf,
  nights,
  originName,
  onClose,
}: {
  lodging: Lodging | null;
  sellersOf: (id: string) => SellersState;
  nights: number;
  originName: string;
  onClose: () => void;
}) {
  const wide = useIsWide();
  // Keep showing the last lodging while the sheet animates closed.
  const [shown, setShown] = useState<Lodging | null>(lodging);
  if (lodging && lodging !== shown) setShown(lodging);
  const current = lodging ?? shown;

  return (
    <Sheet open={lodging !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        className={cn(
          "gap-0 overflow-y-auto bg-background p-0",
          wide ? "w-full sm:max-w-md" : "max-h-[85dvh] rounded-t-3xl",
        )}
      >
        {current && (
          <>
            {current.photo && (
              <div className="relative h-56 shrink-0 bg-muted">
                <Image src={current.photo} alt="" fill sizes="448px" className="object-cover" />
              </div>
            )}
            <SheetHeader className="gap-2 p-6 pb-2">
              <span className="text-sm text-muted-foreground">
                {TYPE_LABEL[current.type]} · {current.distanceKm.toFixed(1)}km · {originName}에서
              </span>
              <SheetTitle className="font-heading text-2xl font-normal">{current.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                {current.rating !== null ? (
                  <span className="flex items-center gap-1 text-foreground">
                    <StarIcon className="size-3.5 fill-current" />
                    <b>{current.rating.toFixed(1)}</b>({current.reviewCount.toLocaleString("ko-KR")})
                  </span>
                ) : (
                  <span>평점 없음</span>
                )}
                <span>Google 평점 · 리뷰는 예약 사이트에서 읽어 보세요</span>
              </SheetDescription>
              <a
                href={directionsUrl(current.name, current.lat, current.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit rounded-full px-3" })}
              >
                <NavigationIcon /> 카카오맵으로 길찾기
              </a>
            </SheetHeader>

            <section className="grid gap-3 p-6 pt-4">
              <h3 className="font-heading text-lg">
                판매처별 가격{" "}
                <span className="font-sans text-sm text-muted-foreground">{nights}박 총액 · 세금 포함 금액 낮은 순</span>
              </h3>
              <SellerSection state={sellersOf(current.id)} lodging={current} />
            </section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SellerSection({ state, lodging }: { state: SellersState; lodging: Lodging }) {
  if (state.status === "loading") {
    return (
      <div className="grid gap-2" aria-busy="true" aria-label="판매처 가격을 불러오는 중">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  const fallback = (
    <div className="flex flex-wrap gap-2">
      {bookingSearchLinks(lodging.name).map((link) => (
        <a
          key={link.site}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", className: "rounded-full" })}
        >
          {link.site}에서 찾기 <ArrowUpRightIcon />
        </a>
      ))}
    </div>
  );

  if (state.status === "error" || (state.taxIncluded.length === 0 && state.other.length === 0)) {
    return (
      <div className="grid gap-3 rounded-2xl border bg-card p-4" role="status">
        <div>
          <p className="font-semibold">
            {state.status === "error" ? "판매처 가격을 불러오지 못했어요." : "판매처 가격 정보가 없어요."}
          </p>
          <p className="text-sm text-muted-foreground">예약 사이트에서 ‘{lodging.name}’을(를) 직접 찾아보세요.</p>
        </div>
        {fallback}
      </div>
    );
  }

  return (
    <>
      {state.taxIncluded.length > 0 && (
        <ul className="grid gap-2">
          {state.taxIncluded.map((s, i) => (
            <SellerRow key={`${s.source}-${i}`} seller={s} best={i === 0} />
          ))}
        </ul>
      )}
      {state.other.length > 0 && (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.other.some((s) => s.taxIncluded === false)
              ? "세금 별도이거나 포함 여부를 알 수 없는 가격 · 결제 단계에서 세금과 봉사료가 더해질 수 있어요"
              : "세금 포함 여부를 알 수 없는 가격 · 판매처에서 최종 금액을 확인해 주세요"}
          </p>
          <ul className="grid gap-2">
            {state.other.map((s, i) => (
              <SellerRow key={`${s.source}-${i}`} seller={s} best={false} />
            ))}
          </ul>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        {fetchedTime(state.fetchedAt)} 조회 기준이에요. 예약 사이트에서 최종 금액과 객실을 확인해 주세요.
      </p>
    </>
  );
}

function SellerRow({ seller: s, best }: { seller: Seller; best: boolean }) {
  return (
    <li>
      <a
        href={s.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all duration-200 hover:translate-x-0.5 hover:border-foreground",
          best && "border-transparent bg-muted",
        )}
      >
        <span className="flex flex-wrap items-center gap-2 font-semibold">
          {s.source}
          {s.official && <span className="rounded-full bg-background px-2 py-0.5 text-xs font-normal">공식</span>}
          {best && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-normal text-primary-foreground">최저가</span>}
        </span>
        <span className="text-right tabular-nums">
          <b className="text-base">{won(s.total)}</b>
          <span className="block text-xs text-muted-foreground">{taxLabel(s.taxIncluded)}</span>
        </span>
        <ArrowUpRightIcon className="size-4 text-muted-foreground" />
      </a>
    </li>
  );
}
