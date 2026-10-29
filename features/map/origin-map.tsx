"use client";

import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
// AdvancedMarker needs a map ID; DEMO_MAP_ID works until a styled one exists.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";

export type MapOrigin = { name: string; lat: number; lng: number };

export function OriginMap({ origin, className }: { origin: MapOrigin; className?: string }) {
  if (!API_KEY) {
    return (
      <div
        className={`grid place-items-center rounded-2xl border bg-muted p-6 text-center text-sm text-muted-foreground ${className ?? ""}`}
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
    <div className={`overflow-hidden rounded-2xl border ${className ?? ""}`}>
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
          <AdvancedMarker position={center} title={origin.name}>
            <span className="flex items-center gap-1.5">
              <span className="size-4 animate-[origin-pulse_2s_ease-in-out_infinite] rounded-full bg-marker-origin shadow-[0_0_0_6px_rgba(17,17,17,0.15),inset_0_0_0_2px_#fff] motion-reduce:animate-none" />
              <span className="rounded-full border bg-card px-2 py-0.5 text-xs whitespace-nowrap text-card-foreground shadow-sm">
                {origin.name}
              </span>
            </span>
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </div>
  );
}
