"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  DOCTOR_SPECIALTIES,
  DOCTOR_LANGUAGES,
  EGYPT_CITIES,
  type DoctorSearchSort,
} from "@/lib/doctor-constants";
import { translateSpecialty } from "@/lib/doctor-display";
import type { DoctorSearchFilters } from "@/hooks/use-doctor-search-params";
import { cn } from "@/lib/utils";

interface DoctorSearchFiltersPanelProps {
  filters: DoctorSearchFilters;
  onChange: (patch: Partial<DoctorSearchFilters>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  open: boolean;
  onToggle: () => void;
}

export function DoctorSearchFiltersToggle({
  hasActiveFilters,
  open,
  onToggle,
}: Pick<DoctorSearchFiltersPanelProps, "hasActiveFilters" | "open" | "onToggle">) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-colors shrink-0",
        open || hasActiveFilters
          ? "border-primary bg-primary/5 text-primary"
          : "border-border bg-card text-foreground hover:bg-muted/50"
      )}
    >
      <SlidersHorizontal className="w-4 h-4" />
      <span className="hidden sm:inline">{t("feed.filters")}</span>
      {hasActiveFilters && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-background" />
      )}
    </button>
  );
}

export function DoctorSearchFiltersPanel({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: Omit<DoctorSearchFiltersPanelProps, "open" | "onToggle">) {
  const { t, dir } = useI18n();

  return (
    <div className="border-b border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">{t("feed.filtersTitle")}</h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-xs font-medium text-destructive hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  {t("feed.clearAll")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterSelect
                label={t("feed.allSpecialties")}
                value={filters.specialty}
                onChange={(v) => onChange({ specialty: v })}
                dir={dir}
              >
                <option value="">{t("feed.allSpecialties")}</option>
                {DOCTOR_SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {translateSpecialty(t, s)}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t("feed.allCities")}
                value={filters.city}
                onChange={(v) => onChange({ city: v })}
                dir={dir}
              >
                <option value="">{t("feed.allCities")}</option>
                {EGYPT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t("feed.allLanguages")}
                value={filters.language}
                onChange={(v) => onChange({ language: v })}
                dir={dir}
              >
                <option value="">{t("feed.allLanguages")}</option>
                {DOCTOR_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={dir === "rtl" ? "الحد الأدنى للتقييم" : "Min rating"}
                value={filters.minRating}
                onChange={(v) => onChange({ minRating: v })}
                dir={dir}
              >
                <option value="">{dir === "rtl" ? "أي تقييم" : "Any rating"}</option>
                {[4, 3, 2].map((r) => (
                  <option key={r} value={String(r)}>
                    {r}+ {dir === "rtl" ? "نجوم" : "stars"}
                  </option>
                ))}
              </FilterSelect>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {dir === "rtl" ? "السعر (من)" : "Fee from (EGP)"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={filters.feeMin}
                  onChange={(e) => onChange({ feeMin: e.target.value })}
                  placeholder="0"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {t("feed.maxFee")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={filters.feeMax}
                  onChange={(e) => onChange({ feeMax: e.target.value })}
                  placeholder="—"
                  className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => onChange({ availToday: !filters.availToday })}
                  className={cn(
                    "h-10 px-4 rounded-xl border text-sm font-medium transition-colors",
                    filters.availToday
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  {t("feed.availToday")}
                </button>
              </div>

              <FilterSelect
                label={t("feed.sort")}
                value={filters.sort}
                onChange={(v) => onChange({ sort: v as DoctorSearchSort })}
                dir={dir}
              >
                <option value="relevance">{dir === "rtl" ? "الأنسب" : "Relevance"}</option>
                <option value="rating">{t("feed.sortRating")}</option>
                <option value="fee_asc">{t("feed.sortFeeAsc")}</option>
                <option value="fee_desc">{t("feed.sortFeeDesc")}</option>
              </FilterSelect>
            </div>
          </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  dir,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir: "ltr" | "rtl";
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir}
        className="w-full h-10 px-3 rounded-xl border border-border bg-card text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        {children}
      </select>
    </div>
  );
}

