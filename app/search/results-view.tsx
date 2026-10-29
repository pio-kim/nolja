"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import type { SearchPlace } from "@/features/search";
import { cn } from "@/lib/utils";

// Composes the lodging list, its detail sheet and the map around one search place.
// List 55% / map 45% on wide screens; list first with a map toggle below 1024px.
export function ResultsView({ place, stay, nights }: { place: SearchPlace; stay: LodgingStay; nights: number }) {
  const { state, retry } = useLodgings(stay, place);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Lodging | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  const lodgings = visibleLodgings(state, radiusKm);
  const sellers = useSellerPrefetch(
    lodgings.map((l) => l.id),
    stay,
  );
  const select = (lodging: Lodging | null) => {
    if (lodging) sellers.prioritize(lodging.id);
    setSelected(lodging);
  };
  const markers: MapMarker[] = lodgings.map((l) => ({
    id: l.id,
    lat: l.lat,
    lng: l.lng,
    label: manwon(l.totalPrice),
    title: l.name,
    kind: "lodging",
  }));

  return (
    <div className="relative grid items-start gap-8 pt-6 lg:grid-cols-[55fr_45fr]">
      <div className={cn(mapOpen && "max-lg:hidden")}>
        <h2 className="mb-4 font-heading text-2xl">숙소</h2>
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
      </div>
      <OriginMap
        origin={{ name: place.name, lat: place.lat, lng: place.lng }}
        markers={markers}
        highlightedId={hoveredId ?? selected?.id ?? null}
        onMarkerHover={setHoveredId}
        onMarkerClick={(id) => select(lodgings.find((l) => l.id === id) ?? null)}
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
