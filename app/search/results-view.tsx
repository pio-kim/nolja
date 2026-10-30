"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Lodging, LodgingStay } from "@/features/lodging";
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
import { PLACE_CATEGORIES, type PlaceCategory, type PlaceSort } from "@/features/nearby";
import { CATEGORY_LABEL, PlaceList, usePlaces, visiblePlaces, type NearbyBase } from "@/features/nearby/ui";
import type { SearchPlace } from "@/features/search";
import { cn } from "@/lib/utils";

type Tab = "lodging" | PlaceCategory;

const TABS: Tab[] = ["lodging", ...PLACE_CATEGORIES];

const TAB_DOT: Record<Tab, string> = {
  lodging: "bg-marker-lodging",
  restaurant: "bg-marker-restaurant",
  cafe: "bg-marker-cafe",
  convenience_store: "bg-marker-store",
};

// Composes lodgings, nearby restaurants, cafes and convenience stores, the
// detail sheet and the map around one search place. Opening a lodging makes it
// the base point for nearby places.
// List 55% / map 45% on wide screens; list first with a map toggle below 1024px.
export function ResultsView({ place, stay, nights }: { place: SearchPlace; stay: LodgingStay; nights: number }) {
  const { state, retry } = useLodgings(stay, place);
  const [tab, setTab] = useState<Tab>("lodging");
  const [visited, setVisited] = useState<Record<PlaceCategory, boolean>>({
    restaurant: false,
    cafe: false,
    convenience_store: false,
  });
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lodging | null>(null);
  const [baseLodging, setBaseLodging] = useState<Lodging | null>(null);
  // Convenience stores are picked by how close they are, not by rating.
  const [sort, setSort] = useState<Record<PlaceCategory, PlaceSort>>({
    restaurant: "rating",
    cafe: "rating",
    convenience_store: "distance",
  });
  const [mapOpen, setMapOpen] = useState(false);

  const lodgings = visibleLodgings(state, radiusKm);
  const sellers = useSellerPrefetch(
    lodgings.map((l) => l.id),
    stay,
  );

  const base: NearbyBase = baseLodging ?? { name: place.name, lat: place.lat, lng: place.lng };
  const restaurants = usePlaces(base, "restaurant", visited.restaurant);
  const cafes = usePlaces(base, "cafe", visited.cafe);
  const stores = usePlaces(base, "convenience_store", visited.convenience_store);
  const nearby = { restaurant: restaurants, cafe: cafes, convenience_store: stores };

  const select = (lodging: Lodging | null) => {
    if (lodging) {
      sellers.prioritize(lodging.id);
      setBaseLodging(lodging);
    }
    setSelected(lodging);
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    setHoveredId(null);
    if (next !== "lodging") setVisited((v) => ({ ...v, [next]: true }));
  };

  const markers: MapMarker[] =
    tab === "lodging"
      ? lodgings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: manwon(l.totalPrice), title: l.name, kind: "lodging" }))
      : [
          ...visiblePlaces(nearby[tab].state, sort[tab]).map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            label: p.rating !== null ? p.rating.toFixed(1) : "·",
            title: p.name,
            kind: tab,
          })),
          ...(baseLodging
            ? [{ id: baseLodging.id, lat: baseLodging.lat, lng: baseLodging.lng, label: "숙소", title: baseLodging.name, kind: "lodging" as const }]
            : []),
        ];

  const count = (t: Tab) => {
    if (t === "lodging") return state.status === "ready" ? lodgings.length : null;
    const s = nearby[t].state;
    return s.status === "ready" ? s.places.length : null;
  };

  return (
    <div className="relative grid items-start gap-8 pt-6 lg:grid-cols-[55fr_45fr]">
      <Tabs value={tab} onValueChange={(v) => changeTab(v as Tab)} className={cn("gap-4", mapOpen && "max-lg:hidden")}>
        <TabsList className="h-11 rounded-full p-1">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-full px-3 text-base data-active:font-semibold sm:px-4">
              <span className={cn("size-2 rounded-full", TAB_DOT[t])} />
              {t === "lodging" ? "숙소" : CATEGORY_LABEL[t]}
              {count(t) !== null && <span className="text-sm font-normal text-muted-foreground">{count(t)}</span>}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="lodging">
          <LodgingList
            state={state}
            radiusKm={radiusKm}
            nights={nights}
            query={place.name}
            hoveredId={hoveredId}
            selectedId={selected?.id ?? null}
            sellersOf={sellers.get}
            onHover={setHoveredId}
            onSelect={select}
            onWiden={() => setRadiusKm(WIDE_RADIUS_KM)}
            onRetry={retry}
          />
        </TabsContent>
        {PLACE_CATEGORIES.map((t) => (
          <TabsContent key={t} value={t}>
            <PlaceList
              state={nearby[t].state}
              category={t}
              base={base}
              baseIsLodging={baseLodging !== null}
              sort={sort[t]}
              hoveredId={hoveredId}
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
        onMarkerHover={setHoveredId}
        onMarkerClick={(id) => {
          const lodging = lodgings.find((l) => l.id === id) ?? (baseLodging?.id === id ? baseLodging : null);
          if (lodging) select(lodging);
          else setHoveredId(id);
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
