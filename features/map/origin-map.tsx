"use client";

import { useEffect } from "react";
import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";

import { cn } from "@/lib/utils";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// AdvancedMarker needs a map ID; DEMO_MAP_ID works until a styled one exists.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export type MapOrigin = { name: string; lat: number; lng: number };

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  kind: "lodging" | "restaurant" | "cafe" | "gas_station" | "laundry" | "convenience_store";
};

const MARKER_STYLE: Record<MapMarker["kind"], string> = {
  lodging: "bg-marker-lodging text-primary-foreground",
  restaurant: "bg-marker-restaurant text-white",
  cafe: "bg-marker-cafe text-white",
  gas_station: "bg-marker-gas text-white",
  laundry: "bg-marker-laundry text-white",
  convenience_store: "bg-marker-store text-white",
};

// Zooms so the origin and every marker are in view whenever the marker set changes.
function FitToMarkers({ origin, markers }: { origin: MapOrigin; markers: MapMarker[] }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",");
  useEffect(() => {
    if (!map || markers.length === 0) return;
    const bounds = new google.maps.LatLngBounds({ lat: origin.lat, lng: origin.lng });
    for (const m of markers) bounds.extend({ lat: m.lat, lng: m.lng });
    map.fitBounds(bounds, 56);
    // markers is read through key so a new array with the same ids does not refit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key, origin.lat, origin.lng]);
  return null;
}

export function OriginMap({
  origin,
  markers = [],
  highlightedId,
  selectedId,
  onMarkerHover,
  onMarkerClick,
  className,
}: {
  origin: MapOrigin;
  markers?: MapMarker[];
  highlightedId?: string | null;
  selectedId?: string | null; // stays marked until another marker is picked
  onMarkerHover?: (id: string | null) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
}) {
  if (!API_KEY) {
    return (
      <div
        className={cn("grid place-items-center rounded-2xl border bg-muted p-6 text-center text-sm text-muted-foreground", className)}
        role="img"
        aria-label={`${origin.name} 위치 지도`}
      >
        <p>
          지도를 표시하려면 지도 키가 필요해요.
          <br />
          <span className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</span>
        </p>
      </div>
    );
  }

  const center = { lat: origin.lat, lng: origin.lng };
  return (
    <div className={cn("overflow-hidden rounded-2xl border", className)}>
      <APIProvider apiKey={API_KEY} language="ko" region="KR">
        <Map
          key={`${origin.lat},${origin.lng}`}
          mapId={MAP_ID}
          defaultCenter={center}
          defaultZoom={14}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          internalUsageAttributionIds={["gmp_git_agentskills_v1"]}
          className="h-full w-full"
        >
          <FitToMarkers origin={origin} markers={markers} />
          <AdvancedMarker position={center} title={origin.name} zIndex={1}>
            <span className="flex items-center gap-1.5">
              <span className="size-4 animate-[origin-pulse_2s_ease-in-out_infinite] rounded-full bg-marker-origin shadow-[0_0_0_6px_rgba(17,17,17,0.15),inset_0_0_0_2px_#fff] motion-reduce:animate-none" />
              <span className="rounded-full border bg-card px-2 py-0.5 text-xs whitespace-nowrap text-card-foreground shadow-sm">
                {origin.name}
              </span>
            </span>
          </AdvancedMarker>
          {markers.map((m) => {
            const active = m.id === highlightedId;
            const selected = m.id === selectedId;
            return (
              <AdvancedMarker
                key={m.id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.title}
                zIndex={selected ? 20 : active ? 10 : 2}
                onClick={() => onMarkerClick?.(m.id)}
                onMouseEnter={() => onMarkerHover?.(m.id)}
                onMouseLeave={() => onMarkerHover?.(null)}
              >
                <span className="flex flex-col items-center">
                  <span
                    className={cn(
                      "block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-[0_0_0_2px_#fff,0_4px_10px_rgba(0,0,0,0.2)] transition-transform duration-200",
                      MARKER_STYLE[m.kind],
                      (active || selected) && "scale-115 shadow-[0_0_0_2px_#fff,0_0_0_4px_#111,0_6px_14px_rgba(0,0,0,0.3)]",
                      selected && "scale-125 px-3 py-1.5 text-sm",
                    )}
                  >
                    {selected && <span className="mr-1">✓</span>}
                    {m.label}
                  </span>
                  {/* A pin tail marks the picked place even when the pointer leaves it. */}
                  {selected && <span aria-hidden className="mt-1 size-0 border-x-[7px] border-t-[9px] border-x-transparent border-t-[#111]" />}
                </span>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
    </div>
  );
}
