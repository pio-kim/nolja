"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { OriginMap, type MapOrigin } from "@/features/map/origin-map";
import { cn } from "@/lib/utils";

// List 55% / map 45% on wide screens; list first with a map toggle below 1024px.
export function ResultsLayout({ origin, children }: { origin: MapOrigin; children: React.ReactNode }) {
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="relative grid items-start gap-8 pt-6 lg:grid-cols-[55fr_45fr]">
      <div className={cn(mapOpen && "max-lg:hidden")}>{children}</div>
      <OriginMap
        origin={origin}
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
    </div>
  );
}
