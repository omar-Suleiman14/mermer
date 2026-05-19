"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Suspense, useState, useEffect, useRef, useMemo } from "react";
import { Search, Stethoscope, X } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";
import { useDebounce } from "@/hooks/use-debounce";
import { PublicNav } from "@/components/public/public-nav";
import { DoctorCard } from "@/components/public/doctor-card";
import {
  DoctorSearchFiltersToggle,
  DoctorSearchFiltersPanel,
} from "@/components/public/doctor-search-filters";
import { useDoctorSearchParams } from "@/hooks/use-doctor-search-params";
import type { PublicDoctor } from "@/lib/doctor-constants";

function FeedInner() {
  const { t, dir } = useI18n();
  const { filters, setFilters, clearFilters, hasActiveFilters } = useDoctorSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [localQuery, setLocalQuery] = useState(filters.q);
  const loaderRef = useRef<HTMLDivElement>(null);
  const prevDoctorsRef = useRef<PublicDoctor[]>([]);

  useEffect(() => {
    setLocalQuery(filters.q);
  }, [filters.q]);

  const debouncedQuery = useDebounce(localQuery, 350);

  useEffect(() => {
    if (debouncedQuery !== filters.q) {
      setFilters({ q: debouncedQuery });
    }
  }, [debouncedQuery, filters.q, setFilters]);

  useEffect(() => {
    setVisibleCount(12);
  }, [
    debouncedQuery,
    filters.specialty,
    filters.city,
    filters.language,
    filters.feeMin,
    filters.feeMax,
    filters.minRating,
    filters.availToday,
    filters.sort,
  ]);

  const searchResults = useQuery(api.doctors.searchDoctors, {
    searchQuery: debouncedQuery.trim() || undefined,
    specialty: filters.specialty || undefined,
    city: filters.city || undefined,
    language: filters.language || undefined,
    feeMin: filters.feeMin ? Number(filters.feeMin) : undefined,
    feeMax: filters.feeMax ? Number(filters.feeMax) : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    availToday: filters.availToday || undefined,
    sortBy: filters.sort,
    limit: visibleCount,
  });

  if (searchResults !== undefined) {
    prevDoctorsRef.current = searchResults as PublicDoctor[];
  }

  const doctors = (searchResults ?? prevDoctorsRef.current) as PublicDoctor[];
  const isLoading = searchResults === undefined && prevDoctorsRef.current.length === 0;
  const canLoadMore = searchResults !== undefined && doctors.length >= visibleCount;

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && canLoadMore) {
          setVisibleCount((n) => n + 12);
        }
      },
      { threshold: 0.1, rootMargin: "120px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [canLoadMore]);

  const resultLabel = useMemo(() => {
    if (isLoading) return null;
    return (
      <p className="text-sm text-muted-foreground mb-4">
        <span className="font-semibold text-foreground">{doctors.length}</span> {t("feed.matches")}
      </p>
    );
  }, [isLoading, doctors.length, t]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir={dir}>
      <PublicNav />

      <div className="sticky top-14 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-2">
            <div className="flex-1 relative flex items-center rounded-2xl border border-border bg-card shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <Search
                className={`absolute w-4 h-4 text-muted-foreground ${dir === "rtl" ? "right-3.5" : "left-3.5"}`}
              />
              <input
                type="search"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                placeholder={
                  dir === "rtl"
                    ? "طبيب، عيادة، تخصص، مدينة..."
                    : "Doctor, clinic, specialty, city..."
                }
                className={`w-full py-2.5 bg-transparent outline-none text-sm ${dir === "rtl" ? "pr-10 pl-9" : "pl-10 pr-9"}`}
                dir={dir}
              />
              {localQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalQuery("");
                    setFilters({ q: "" });
                  }}
                  className={`absolute ${dir === "rtl" ? "left-2.5" : "right-2.5"} text-muted-foreground hover:text-foreground`}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <DoctorSearchFiltersToggle
              hasActiveFilters={hasActiveFilters}
              open={showFilters}
              onToggle={() => setShowFilters((o) => !o)}
            />
          </div>
        </div>
        {showFilters && (
          <DoctorSearchFiltersPanel
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {resultLabel}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <IOSSpinner size={32} />
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-24 rounded-2xl border border-dashed border-border bg-muted/20">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t("feed.noDoctors")}</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t("feed.noDoctorsDesc")}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              {t("feed.clearAll")}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {doctors.map((doc) => (
                <DoctorCard key={doc._id} doctor={doc} />
              ))}
            </div>
            <div ref={loaderRef} className="h-12 flex items-center justify-center mt-4">
              {canLoadMore && <IOSSpinner size={20} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function FindADoctorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <IOSSpinner size={32} />
        </div>
      }
    >
      <FeedInner />
    </Suspense>
  );
}
