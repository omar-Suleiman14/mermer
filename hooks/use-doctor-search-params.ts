"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DoctorSearchSort } from "@/lib/doctor-constants";

export type DoctorSearchFilters = {
  q: string;
  specialty: string;
  city: string;
  language: string;
  feeMin: string;
  feeMax: string;
  minRating: string;
  sort: DoctorSearchSort;
};

const DEFAULTS: DoctorSearchFilters = {
  q: "",
  specialty: "",
  city: "",
  language: "",
  feeMin: "",
  feeMax: "",
  minRating: "",
  sort: "relevance",
};

function parseFilters(params: URLSearchParams): DoctorSearchFilters {
  const sort = params.get("sort") ?? "relevance";
  const validSorts: DoctorSearchSort[] = ["relevance", "rating", "fee_asc", "fee_desc"];
  return {
    q: params.get("q") ?? "",
    specialty: params.get("specialty") ?? "",
    city: params.get("city") ?? "",
    language: params.get("language") ?? "",
    feeMin: params.get("feeMin") ?? "",
    feeMax: params.get("fee") ?? params.get("feeMax") ?? "",
    minRating: params.get("minRating") ?? "",
    sort: validSorts.includes(sort as DoctorSearchSort) ? (sort as DoctorSearchSort) : "relevance",
  };
}

function filtersToParams(filters: DoctorSearchFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.q.trim()) p.set("q", filters.q.trim());
  if (filters.specialty) p.set("specialty", filters.specialty);
  if (filters.city) p.set("city", filters.city);
  if (filters.language) p.set("language", filters.language);
  if (filters.feeMin) p.set("feeMin", filters.feeMin);
  if (filters.feeMax) p.set("fee", filters.feeMax);
  if (filters.minRating) p.set("minRating", filters.minRating);
  if (filters.sort !== "relevance") p.set("sort", filters.sort);
  return p;
}

export function useDoctorSearchParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFilters(searchParams),
    [searchParams]
  );

  const setFilters = useCallback(
    (next: Partial<DoctorSearchFilters>) => {
      const merged = { ...filters, ...next };
      const qs = filtersToParams(merged).toString();
      router.replace(`/find-a-doctor${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [filters, router]
  );

  const clearFilters = useCallback(() => {
    router.replace("/find-a-doctor", { scroll: false });
  }, [router]);

  const hasActiveFilters =
    !!filters.specialty ||
    !!filters.city ||
    !!filters.language ||
    !!filters.feeMin ||
    !!filters.feeMax ||
    !!filters.minRating;

  return { filters, setFilters, clearFilters, hasActiveFilters, DEFAULTS };
}
