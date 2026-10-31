"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  LocateFixedIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ko } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { formatStay, fromIsoDate, toIsoDate } from "./format";
import type { PlaceSuggestion, TextSearchResult } from "./places";
import { toSearchQuery, type SearchConditions, type SearchPlace } from "./query";
import {
  defaultStay,
  MAX_NIGHTS,
  todayInKorea,
  validateStay,
  type IsoDate,
  type Stay,
  type StayError,
} from "./stay";

type Message =
  | { kind: "empty" }
  | { kind: "not-found"; text: string }
  | { kind: "candidates"; text: string; candidates: SearchPlace[] }
  | { kind: "stay"; error: StayError }
  | { kind: "location-denied" }
  | { kind: "location-outside" }
  | { kind: "location-failed" }
  | { kind: "unavailable" };

function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10_000, maximumAge: 60_000 });
  });
}

const STAY_ERROR_TEXT: Record<StayError, string> = {
  "past-check-in": "지난 날짜에는 체크인할 수 없어요. 오늘 이후로 골라 주세요.",
  "check-out-not-after-check-in": "체크아웃은 체크인 다음 날 이후로 골라 주세요.",
  "too-many-nights": `최대 ${MAX_NIGHTS}박까지 고를 수 있어요. 체크아웃을 더 앞으로 골라 주세요.`,
};

function newSession() {
  return crypto.randomUUID();
}

export function SearchForm({
  initial,
  variant = "hero",
  onSearched,
}: {
  initial?: SearchConditions;
  variant?: "hero" | "compact";
  onSearched?: () => void;
}) {
  const router = useRouter();
  const today = todayInKorea();
  const listId = useId();

  const [text, setText] = useState(initial?.place.name ?? "");
  const [picked, setPicked] = useState<SearchPlace | null>(initial?.place ?? null);
  const [stay, setStay] = useState<Stay>(initial?.stay ?? defaultStay(today));
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [children, setChildren] = useState(initial?.children ?? 0);
  const [fetched, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingCheckIn, setPendingCheckIn] = useState<IsoDate | null>(null);
  const [rangeError, setRangeError] = useState<StayError | null>(null);
  const session = useRef(newSession());
  // True while a picked suggestion is being resolved, so typing effects stay quiet.
  const selecting = useRef(false);
  // Suggestions only apply while the typed text is not an already picked place.
  const suggestions = text.trim() && picked?.name !== text ? fetched : [];

  // Fetch suggestions while typing, unless the text is the place already picked.
  useEffect(() => {
    const input = text.trim();
    if (!input || picked?.name === text || selecting.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ input, session: session.current });
        const res = await fetch(`/api/places/autocomplete?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { suggestions: PlaceSuggestion[] };
        setSuggestions(json.suggestions);
        setHighlight(-1);
        setListOpen(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setSuggestions([]);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, picked]);

  function go(place: SearchPlace) {
    const error = validateStay(stay, today);
    if (error) {
      setMessage({ kind: "stay", error });
      return;
    }
    setMessage(null);
    session.current = newSession();
    router.push(`/search?${toSearchQuery({ place, stay, adults, children })}`);
    onSearched?.();
  }

  async function pickSuggestion(s: PlaceSuggestion) {
    selecting.current = true;
    setText(s.name);
    setListOpen(false);
    setMessage(null);
    setBusy(true);
    try {
      const params = new URLSearchParams({ placeId: s.placeId, session: session.current });
      const res = await fetch(`/api/places/details?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const { place } = (await res.json()) as { place: SearchPlace };
      // Use the resolved name so submit recognises the picked place.
      setText(place.name);
      setPicked(place);
    } catch {
      setMessage({ kind: "unavailable" });
    } finally {
      selecting.current = false;
      setBusy(false);
    }
  }

  async function pickCurrentLocation() {
    if (busy) return;
    setListOpen(false);
    setMessage(null);
    setBusy(true);
    try {
      let position: GeolocationPosition;
      try {
        position = await currentPosition();
      } catch (error) {
        const denied = (error as GeolocationPositionError).code === 1;
        return setMessage({ kind: denied ? "location-denied" : "location-failed" });
      }
      const { latitude, longitude } = position.coords;
      const params = new URLSearchParams({ lat: String(latitude), lng: String(longitude) });
      const res = await fetch(`/api/places/reverse?${params}`);
      if (res.status === 404) return setMessage({ kind: "location-outside" });
      if (!res.ok) throw new Error(String(res.status));
      const { place } = (await res.json()) as { place: SearchPlace };
      setText(place.name);
      setPicked(place);
    } catch {
      setMessage({ kind: "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (busy) return;
    setListOpen(false);
    if (picked && picked.name === text) return go(picked);
    const query = text.trim();
    if (!query) return setMessage({ kind: "empty" });
    setBusy(true);
    try {
      const res = await fetch(`/api/places/search?${new URLSearchParams({ q: query })}`);
      if (!res.ok) throw new Error(String(res.status));
      const result = (await res.json()) as TextSearchResult;
      if (result.kind === "none") setMessage({ kind: "not-found", text: query });
      else if (result.kind === "single") go(result.place);
      else setMessage({ kind: "candidates", text: query, candidates: result.candidates });
    } catch {
      setMessage({ kind: "unavailable" });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const open = listOpen && suggestions.length > 0;
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      setHighlight((h) => Math.min(suggestions.length - 1, h + 1));
    } else if (e.key === "ArrowUp" && open) {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlight >= 0) pickSuggestion(suggestions[highlight]);
      else submit();
    } else if (e.key === "Escape") {
      setListOpen(false);
    }
  }

  const range: DateRange = pendingCheckIn
    ? { from: fromIsoDate(pendingCheckIn), to: undefined }
    : { from: fromIsoDate(stay.checkIn), to: fromIsoDate(stay.checkOut) };
  const stayError = rangeError ?? validateStay(stay, today);

  // First click picks check-in, second picks check-out, as in the prototype.
  function pickDay(day: Date) {
    const date = toIsoDate(day);
    if (!pendingCheckIn || date <= pendingCheckIn) {
      setPendingCheckIn(date);
      setRangeError(null);
      return;
    }
    const next = { checkIn: pendingCheckIn, checkOut: date };
    const error = validateStay(next, today);
    if (error) {
      setRangeError(error);
      return;
    }
    setStay(next);
    setPendingCheckIn(null);
    setRangeError(null);
    setMessage(null);
  }
  const hero = variant === "hero";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div
        className={cn(
          "grid grid-cols-1 gap-0 rounded-[20px] border p-1.5 md:grid-cols-[1.6fr_1.3fr_1fr_auto] md:p-2",
          hero
            ? "border-white/60 bg-white/88 text-[#111111] shadow-[0_16px_48px_rgba(0,0,0,0.22)] backdrop-blur-xl"
            : "border-border bg-card shadow-sm",
        )}
      >
        <div className="relative flex min-h-16 min-w-0 flex-col justify-center rounded-2xl px-4 py-2 transition-all duration-200 hover:bg-black/5 focus-within:bg-white focus-within:shadow-[0_0_0_2px_#111111,0_6px_18px_rgba(0,0,0,0.08)]">
          <label htmlFor={`${listId}-place`} className="text-xs opacity-70">
            장소
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`${listId}-place`}
              role="combobox"
              aria-expanded={listOpen && suggestions.length > 0}
              aria-controls={`${listId}-list`}
              aria-autocomplete="list"
              autoComplete="off"
              className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-current placeholder:opacity-55"
              placeholder="어디로 가세요? 예: 강릉중앙시장"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPicked(null);
                setMessage(null);
              }}
              onFocus={() => suggestions.length && setListOpen(true)}
              onBlur={() => setTimeout(() => setListOpen(false), 150)}
              onKeyDown={onKeyDown}
            />
            <button
              type="button"
              aria-label="현재 위치로 찾기"
              title="현재 위치로 찾기"
              disabled={busy}
              className="-my-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full opacity-70 transition-all duration-200 hover:bg-black/5 hover:opacity-100 disabled:opacity-40"
              onClick={pickCurrentLocation}
            >
              <LocateFixedIcon className="size-4.5" />
            </button>
          </div>
          {listOpen && suggestions.length > 0 && (
            <ul
              id={`${listId}-list`}
              role="listbox"
              className="absolute top-[calc(100%+8px)] left-0 z-50 w-full min-w-72 animate-in rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg duration-200 fade-in-0 slide-in-from-top-1"
            >
              {suggestions.map((s, i) => (
                <li key={s.placeId} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 hover:translate-x-0.5 hover:bg-muted",
                      i === highlight && "bg-muted",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                  >
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-sm text-muted-foreground">{s.address}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Popover
          onOpenChange={() => {
            setPendingCheckIn(null);
            setRangeError(null);
          }}
        >
          <PopoverTrigger
            className="flex min-h-16 min-w-0 flex-col justify-center rounded-2xl px-4 py-2 text-left outline-none transition-all duration-200 hover:bg-black/5 focus-visible:bg-white data-[popup-open]:bg-white data-[popup-open]:shadow-[0_0_0_2px_#111111,0_6px_18px_rgba(0,0,0,0.08)] max-md:border-t md:border-l border-current/10"
          >
            <span className="flex items-center gap-1.5 text-xs opacity-70">
              <CalendarDaysIcon className="size-3.5" />
              체크인 – 체크아웃
            </span>
            <span className="truncate text-base">{formatStay(stay)}</span>
          </PopoverTrigger>
          <PopoverContent className="w-auto rounded-2xl p-2" align="start">
            <Calendar
              mode="range"
              locale={ko}
              numberOfMonths={2}
              selected={range}
              defaultMonth={range.from}
              // Past days can't be picked, and months before this one can't be reached.
              startMonth={fromIsoDate(today)}
              disabled={{ before: fromIsoDate(today) }}
              onSelect={(_next, day) => pickDay(day)}
            />
            <p className={cn("px-3 pb-2 text-sm", stayError ? "text-destructive" : "text-muted-foreground")}>
              {stayError
                ? STAY_ERROR_TEXT[stayError]
                : pendingCheckIn
                  ? "체크아웃 날짜를 고르세요."
                  : `체크인 날짜부터 고르세요. 최대 ${MAX_NIGHTS}박까지 고를 수 있어요.`}
            </p>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger className="flex min-h-16 min-w-0 flex-col justify-center rounded-2xl px-4 py-2 text-left outline-none transition-all duration-200 hover:bg-black/5 focus-visible:bg-white data-[popup-open]:bg-white data-[popup-open]:shadow-[0_0_0_2px_#111111,0_6px_18px_rgba(0,0,0,0.08)] max-md:border-t md:border-l border-current/10">
            <span className="flex items-center gap-1.5 text-xs opacity-70">
              <UsersIcon className="size-3.5" />
              인원
            </span>
            <span className="truncate text-base">
              성인 {adults}
              {children > 0 && ` · 아동 ${children}`}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-72 rounded-2xl" align="end">
            <GuestStepper label="성인" hint="13세 이상" value={adults} min={1} max={10} onChange={setAdults} />
            <GuestStepper label="아동" hint="12세 이하" value={children} min={0} max={6} onChange={setChildren} />
            <p className="text-xs text-muted-foreground">객실 수는 예약 사이트에서 선택해 주세요.</p>
          </PopoverContent>
        </Popover>

        <Button
          type="submit"
          size="lg"
          disabled={busy}
          className="group/go m-1 h-auto min-h-13 rounded-2xl px-7 text-base"
        >
          {busy ? "찾는 중…" : "숙식 찾기"}
          {!busy && <ArrowRightIcon className="transition-transform duration-200 group-hover/go:translate-x-0.5" />}
        </Button>
      </div>

      {message && <FormMessage message={message} onPick={go} />}
    </form>
  );
}

function GuestStepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div>{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label={`${label} 빼기`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <MinusIcon />
        </Button>
        <output className="w-5 text-center tabular-nums">{value}</output>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label={`${label} 더하기`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  );
}

function FormMessage({ message, onPick }: { message: Message; onPick: (p: SearchPlace) => void }) {
  const box = "rounded-2xl border bg-card p-4 text-card-foreground shadow-sm";
  if (message.kind === "candidates") {
    return (
      <div className={box} role="status">
        <p>
          <strong>‘{message.text}’, 어느 곳인가요?</strong>{" "}
          <span className="text-sm text-muted-foreground">이름이 같은 곳이 {message.candidates.length}곳 있어요.</span>
        </p>
        <ul className="mt-2 grid gap-1">
          {message.candidates.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground hover:shadow-md active:translate-y-0"
                onClick={() => onPick(p)}
              >
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
                <span>
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">{p.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const [title, body] =
    message.kind === "empty"
      ? ["장소 이름을 입력해 주세요.", "지역 이름이나 가게·건물 이름 모두 괜찮아요."]
      : message.kind === "not-found"
        ? [
            `‘${message.text}’을(를) 국내에서 찾지 못했어요.`,
            "철자를 확인하거나, 근처 지역 이름(예: 강릉시 성남동)으로 다시 입력해 보세요. 해외 장소는 지원하지 않아요.",
          ]
        : message.kind === "stay"
          ? ["날짜를 다시 골라 주세요.", STAY_ERROR_TEXT[message.error]]
          : message.kind === "location-denied"
            ? ["현재 위치를 쓸 수 없어요.", "브라우저 설정에서 이 사이트의 위치 권한을 허용하거나, 장소 이름을 입력해 주세요."]
            : message.kind === "location-outside"
              ? ["현재 위치가 국내가 아니에요.", "국내 장소만 지원해요. 장소 이름을 입력해 주세요."]
              : message.kind === "location-failed"
                ? ["현재 위치를 확인하지 못했어요.", "잠시 후 다시 시도하거나, 장소 이름을 입력해 주세요."]
                : ["지금은 장소를 찾을 수 없어요.", "잠시 후 다시 시도해 주세요."];
  return (
    <div className={cn(box, "border-destructive/40")} role="alert">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
