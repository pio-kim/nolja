"use client";

import { useState } from "react";

import { formatGuests, formatStay } from "./format";
import type { SearchConditions } from "./query";
import { SearchForm } from "./search-form";

// Compact summary of the current search that opens the same form to change it.
export function ResultsSummary({ conditions }: { conditions: SearchConditions }) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <button
        type="button"
        aria-expanded={editing}
        onClick={() => setEditing((v) => !v)}
        className="flex min-w-0 max-w-3xl items-center gap-4 rounded-2xl border bg-card py-2 pr-2 pl-5 text-left transition-all duration-200 hover:-translate-y-px hover:border-foreground hover:shadow-md aria-expanded:border-foreground md:rounded-full"
      >
        <span className="flex min-w-0 flex-1 flex-col md:flex-row md:items-center md:gap-4">
          <span className="truncate font-semibold">{conditions.place.name}</span>
          <span className="hidden h-5 w-px shrink-0 bg-border md:block" />
          <span className="text-sm whitespace-nowrap text-muted-foreground">
            {formatStay(conditions.stay)}
            <span className="md:hidden"> · </span>
            <span className="mx-4 hidden h-5 w-px bg-border align-middle md:inline-block" />
            {formatGuests(conditions.adults, conditions.children)}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">{editing ? "닫기" : "조건 변경"}</span>
      </button>
      {editing && <SearchForm variant="compact" initial={conditions} onSearched={() => setEditing(false)} />}
    </div>
  );
}
