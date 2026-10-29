import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  formatGuests,
  formatStayLong,
  nightsBetween,
  parseSearchQuery,
  ResultsSummary,
  toSearchQuery,
} from "@/features/search";

import { ResultsView } from "./results-view";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string") params.set(key, value);
  const conditions = parseSearchQuery(params);

  if (!conditions) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="font-heading text-3xl">검색 조건을 읽지 못했어요</h1>
        <p className="text-muted-foreground">주소가 잘렸거나 바뀐 것 같아요. 처음부터 다시 검색해 주세요.</p>
        <Link href="/" className={buttonVariants({ size: "lg", className: "rounded-full px-5" })}>
          새로 검색하기
        </Link>
      </main>
    );
  }

  const { place, stay, adults, children } = conditions;
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1360px] flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:gap-6 md:px-6">
          <Link href="/" className="font-heading pt-2 text-xl tracking-[0.18em]">
            NOLJA
          </Link>
          <ResultsSummary key={toSearchQuery(conditions)} conditions={conditions} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-16 md:px-6">
        <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-[0.08em] text-muted-foreground">검색 장소 기준</p>
            <h1 className="font-heading text-3xl leading-tight md:text-4xl">{place.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{place.address}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatStayLong(stay)} · {formatGuests(adults, children, ", ")}
          </p>
        </section>

        <ResultsView
          key={toSearchQuery(conditions)}
          place={place}
          nights={nightsBetween(stay)}
          stay={{ query: place.name, checkIn: stay.checkIn, checkOut: stay.checkOut, adults, children }}
        />
      </main>
    </div>
  );
}
