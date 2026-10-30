"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bookingSearchLinks, type Lodging, type LodgingStay } from "@/features/lodging";
import {
  DEFAULT_RADIUS_KM,
  LodgingDetail,
  LodgingList,
  manwon,
  useLodgings,
  useSellerPrefetch,
  visibleLodgings,
  WIDE_RADIUS_KM,
} from "@/features/lodging/ui";
import { OriginMap, type MapMarker } from "@/features/map/origin-map";
import { areaOf, type PlaceCategory, type PlaceSort } from "@/features/nearby";
import { CATEGORY_LABEL, PlaceList, usePlaces, visiblePlaces, type NearbyBase } from "@/features/nearby/ui";
import type { SearchPlace } from "@/features/search";
import { cn } from "@/lib/utils";

// Tabs beside lodging, all listed around the same base point.
const NEARBY_TABS = ["restaurant", "cafe", "gas_station", "laundry"] as const;
type NearbyTab = (typeof NEARBY_TABS)[number];
type Tab = "lodging" | NearbyTab;

const TAB_DOT: Record<Tab, string> = {
  lodging: "bg-marker-lodging",
  restaurant: "bg-marker-restaurant",
  cafe: "bg-marker-cafe",
  gas_station: "bg-marker-gas",
  laundry: "bg-marker-laundry",
};

const notVisited: Record<NearbyTab, boolean> = { restaurant: false, cafe: false, gas_station: false, laundry: false };

// Composes lodgings, nearby places (restaurants, cafes, gas stations, laundry),
// the detail sheet and the map around one search place. Opening a lodging makes
// it the base point for the nearby tabs.
// List 55% / map 45% on wide screens; list first with a map toggle below 1024px.
// When price comparison fails, the lodging tab lists nearby stays from place
// search instead, without prices, with links to the booking sites.
export function ResultsView({ place, stay, nights }: { place: SearchPlace; stay: LodgingStay; nights: number }) {
  const { state, retry } = useLodgings(stay, place);
  const [tab, setTab] = useState<Tab>("lodging");
  const [visited, setVisited] = useState(notVisited);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lodging | null>(null);
  const [baseLodging, setBaseLodging] = useState<Lodging | null>(null);
  const [sort, setSort] = useState<Record<PlaceCategory, PlaceSort>>({
    restaurant: "rating",
    cafe: "rating",
    lodging: "rating",
    gas_station: "distance",
    laundry: "distance",
  });
  const [mapOpen, setMapOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // The place picked on the map: it stays marked on the map and in the list
  // until another one is picked or the tab changes. A new object per pick
  // scrolls to the card again even when the same marker is picked twice.
  const [picked, setPicked] = useState<{ id: string } | null>(null);

  // Runs after the list is shown again on narrow screens, where the map hides it.
  useEffect(() => {
    if (!picked || mapOpen) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(picked.id)}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [picked, mapOpen]);

  const lodgings = visibleLodgings(state, radiusKm);
  const sellers = useSellerPrefetch(
    lodgings.map((l) => l.id),
    stay,
  );

  const base: NearbyBase = baseLodging ?? { name: place.name, lat: place.lat, lng: place.lng };
  const nearby = {
    restaurant: usePlaces(base, "restaurant", visited.restaurant),
    cafe: usePlaces(base, "cafe", visited.cafe),
    gas_station: usePlaces(base, "gas_station", visited.gas_station),
    laundry: usePlaces(base, "laundry", visited.laundry),
  };

  const searchBase: NearbyBase = { name: place.name, lat: place.lat, lng: place.lng };
  const unpriced = usePlaces(searchBase, "lodging", state.status === "error");
  // Unpriced stays stand in unless place search failed too.
  const showUnpriced = state.status === "error" && unpriced.state.status !== "error";

  const select = (lodging: Lodging | null) => {
    if (lodging) {
      sellers.prioritize(lodging.id);
      setBaseLodging(lodging);
    }
    setSelected(lodging);
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    setPicked(null);
    setHoveredId(null);
    if (next !== "lodging") setVisited((v) => ({ ...v, [next]: true }));
  };

  const placeMarker = (p: { id: string; lat: number; lng: number; rating: number | null; name: string }, kind: MapMarker["kind"]) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.rating !== null ? p.rating.toFixed(1) : "·",
    title: p.name,
    kind,
  });

  const markers: MapMarker[] =
    tab === "lodging" && showUnpriced
      ? visiblePlaces(unpriced.state, sort.lodging).map((p) => placeMarker(p, "lodging"))
      : tab === "lodging"
        ? lodgings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: manwon(l.totalPrice), title: l.name, kind: "lodging" }))
        : [
            ...visiblePlaces(nearby[tab].state, sort[tab]).map((p) => placeMarker(p, tab)),
            ...(baseLodging
              ? [{ id: baseLodging.id, lat: baseLodging.lat, lng: baseLodging.lng, label: "숙소", title: baseLodging.name, kind: "lodging" as const }]
              : []),
          ];

  const count = (t: Tab) => {
    if (t === "lodging" && showUnpriced) return unpriced.state.status === "ready" ? unpriced.state.places.length : null;
    if (t === "lodging") return state.status === "ready" ? lodgings.length : null;
    const s = nearby[t].state;
    return s.status === "ready" ? s.places.length : null;
  };

  return (
    <div className="relative grid items-start gap-8 pt-6 lg:grid-cols-[55fr_45fr]">
      <Tabs
        ref={listRef}
        value={tab}
        onValueChange={(v) => changeTab(v as Tab)}
        className={cn("min-w-0 gap-4", mapOpen && "max-lg:hidden")}
      >
        {/* Five tabs do not fit a phone; they scroll sideways instead of wrapping. */}
        <TabsList className="h-11 max-w-full justify-start overflow-x-auto rounded-full p-1">
          {(["lodging", ...NEARBY_TABS] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="shrink-0 rounded-full px-4 text-base data-active:font-semibold">
              <span className={cn("size-2 rounded-full", TAB_DOT[t])} />
              {CATEGORY_LABEL[t]}
              {count(t) !== null && <span className="text-sm font-normal text-muted-foreground">{count(t)}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lodging">
          {showUnpriced ? (
            <PlaceList
              state={unpriced.state}
              category="lodging"
              base={searchBase}
              baseIsLodging={false}
              area={areaOf(place.address)}
              notice={<UnpricedNotice query={place.name} onRetry={retry} />}
              sort={sort.lodging}
              hoveredId={hoveredId}
              selectedId={picked?.id ?? null}
              onSort={(s) => setSort((prev) => ({ ...prev, lodging: s }))}
              onHover={setHoveredId}
              onResetBase={() => {}}
              onRetry={unpriced.retry}
            />
          ) : (
            <LodgingList
              state={state}
              radiusKm={radiusKm}
              nights={nights}
              query={place.name}
              hoveredId={hoveredId}
              selectedId={selected?.id ?? null}
              pickedId={picked?.id ?? null}
              sellersOf={sellers.get}
              onHover={setHoveredId}
              onSelect={select}
              onWiden={() => setRadiusKm(WIDE_RADIUS_KM)}
              onRetry={retry}
            />
          )}
        </TabsContent>
        {NEARBY_TABS.map((t) => (
          <TabsContent key={t} value={t}>
            <PlaceList
              state={nearby[t].state}
              category={t}
              base={base}
              baseIsLodging={baseLodging !== null}
              area={areaOf(place.address)}
              sort={sort[t]}
              hoveredId={hoveredId}
              selectedId={picked?.id ?? null}
              onSort={(s) => setSort((prev) => ({ ...prev, [t]: s }))}
              onHover={setHoveredId}
              onResetBase={() => setBaseLodging(null)}
              onRetry={nearby[t].retry}
            />
          </TabsContent>
        ))}
      </Tabs>

      <OriginMap
        origin={{ name: place.name, lat: place.lat, lng: place.lng }}
        markers={markers}
        highlightedId={hoveredId ?? (tab === "lodging" ? selected?.id : null) ?? null}
        selectedId={picked?.id ?? null}
        onMarkerHover={setHoveredId}
        onMarkerClick={(id) => {
          const lodging = lodgings.find((l) => l.id === id) ?? (baseLodging?.id === id ? baseLodging : null);
          if (lodging) select(lodging);
          // Bring the picked place into view in the list; on phones, back to the list first.
          setMapOpen(false);
          setPicked({ id });
        }}
        className={cn(
          "h-[70vh] min-h-[420px] lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]",
          !mapOpen && "max-lg:hidden",
        )}
      />
      <div className="pointer-events-none sticky bottom-4 flex justify-center lg:hidden">
        <Button
          size="lg"
          className="pointer-events-auto h-11 rounded-full px-5 shadow-lg"
          onClick={() => setMapOpen((v) => !v)}
        >
          {mapOpen ? "목록 보기" : "지도 보기"}
        </Button>
      </div>
      <LodgingDetail
        lodging={selected}
        sellersOf={sellers.get}
        nights={nights}
        originName={place.name}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function UnpricedNotice({ query, onRetry }: { query: string; onRetry: () => void }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-muted px-4 py-3 text-sm">
      <p>
        지금은 가격 비교를 불러올 수 없어 <b>{query}</b> 근처 숙소만 보여드려요. 가격은 예약 사이트에서 확인해 주세요.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {bookingSearchLinks(query).map((link) => (
          <a
            key={link.site}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-full bg-background px-3" })}
          >
            {link.site}에서 가격 보기 <ArrowUpRightIcon />
          </a>
        ))}
        <button type="button" onClick={onRetry} className="ml-auto font-medium underline underline-offset-4">
          가격 비교 다시 불러오기
        </button>
      </div>
    </div>
  );
}
