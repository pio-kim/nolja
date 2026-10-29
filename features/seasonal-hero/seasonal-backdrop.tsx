"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";

import { todayInKorea } from "@/lib/korea-date";
import { cn } from "@/lib/utils";

import { HERO_PHOTOS, seasonOf, type Season } from "./season";

const ROTATE_MS = 8000;

const noop = () => () => {};

// The season comes from the viewer's clock, so it is read only in the browser;
// the server render shows the plain backdrop colour until then.
function useSeason(): Season | null {
  return useSyncExternalStore(
    noop,
    () => seasonOf(todayInKorea()),
    () => null,
  );
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function SeasonalBackdrop({ className }: { className?: string }) {
  const season = useSeason();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const photos = season ? HERO_PHOTOS[season] : [];

  useEffect(() => {
    if (reducedMotion || photos.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, photos.length, index]);

  const current = photos[index];

  return (
    <div className={cn("absolute inset-0 -z-10 overflow-hidden bg-neutral-800", className)}>
      {photos.map((photo, i) => (
        <Image
          key={photo.src}
          src={photo.src}
          alt={i === index ? photo.alt : ""}
          fill
          sizes="100vw"
          priority={i === 0}
          className={cn(
            "object-cover transition-opacity duration-[1200ms] ease-out",
            i === index ? "opacity-100" : "opacity-0",
            i === index && !reducedMotion && "animate-[hero-drift_16s_ease-in-out_infinite_alternate]",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/25 to-black/60" />

      {photos.length > 1 && (
        <div className="absolute top-5 right-5 flex gap-1.5 md:top-6 md:right-6" role="group" aria-label="배경 사진 선택">
          {photos.map((photo, i) => (
            <button
              key={photo.src}
              type="button"
              aria-label={`${i + 1}번째 배경: ${photo.alt}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full bg-white/50 transition-all duration-300 hover:bg-white/80",
                i === index ? "w-5 bg-white" : "w-1.5",
              )}
            />
          ))}
        </div>
      )}
      {current && (
        <p className="absolute right-5 bottom-2 text-[11px] text-white/75 md:right-6">
          Photo · {current.credit} / Unsplash
        </p>
      )}
    </div>
  );
}
