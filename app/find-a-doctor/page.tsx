"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  Search, Star, MapPin, DollarSign,
  Stethoscope, X, Sun, Moon, SlidersHorizontal,
  CheckCircle2, ArrowUpDown
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";
import { useDebounce } from "@/hooks/use-debounce";
import { useTheme } from "next-themes";
import { LanguageToggle } from "@/components/language-toggle";

type Doctor = {
  _id: string;
  name: string;
  specialty: string | null;
  clinicName: string;
  clinicAddress: string | null;
  city: string | null;
  consultationFee: number | null;
  languages: string[];
  availableDays: string[];
  availableFrom: string | null;
  availableTo: string | null;
  bio: string | null;
  qrSlug: string | null;
  profilePhotoUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Dentist",
  "ENT Specialist", "Gastroenterologist", "Neurologist", "Obstetrician",
  "Oncologist", "Ophthalmologist", "Orthopedist", "Pediatrician",
  "Psychiatrist", "Pulmonologist", "Surgeon", "Urologist",
];

// ── Star Row ──────────────────────────────────────────────────────────────────

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star
            key={s}
            className="w-3.5 h-3.5"
            fill={s <= Math.round(rating) ? "#f59e0b" : "none"}
            stroke={s <= Math.round(rating) ? "#f59e0b" : "#d1d5db"}
          />
        ))}
      </div>
      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

// ── Doctor Card ───────────────────────────────────────────────────────────────

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { dir } = useI18n();
  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayName = DAYS_OF_WEEK[dayIndex];
  const availableToday = doctor.availableDays.includes(todayName);

  return (
    <Link href={`/doctors/${doctor.qrSlug}`} className="block group">
      <div className="bg-card border-b border-border p-4 sm:p-6 flex gap-4 hover:bg-muted/30 transition-colors">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted overflow-hidden relative flex items-center justify-center">
            {doctor.profilePhotoUrl ? (
              <Image src={doctor.profilePhotoUrl} alt={doctor.name} fill sizes="64px" className="object-cover" />
            ) : (
              <span className="text-xl font-bold text-foreground/40">{doctor.name.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                {dir === "rtl" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`}
              </h2>
              {doctor.specialty && (
                <p className="text-sm font-medium tracking-wide uppercase text-muted-foreground mt-1">{doctor.specialty}</p>
              )}
            </div>
            {availableToday && (
              <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 bg-primary text-primary-foreground flex-shrink-0">
                {dir === "rtl" ? "متاح اليوم" : "Available"}
              </span>
            )}
          </div>

          {doctor.avgRating !== null && doctor.reviewCount > 0 && (
            <div className="mt-2">
              <StarRow rating={doctor.avgRating} count={doctor.reviewCount} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
            {(doctor.city || doctor.clinicAddress) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate max-w-[180px]">{doctor.clinicAddress || doctor.city}</span>
              </span>
            )}
            {doctor.consultationFee !== null && (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                {doctor.consultationFee.toLocaleString()} {dir === "rtl" ? "ج.م" : "EGP"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Feed Inner ────────────────────────────────────────────────────────────────

function FeedInner() {
  const searchParams = useSearchParams();
  const { t, dir } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") ?? "");
  const [feeMax, setFeeMax] = useState(searchParams.get("fee") ?? "");
  const [availToday, setAvailToday] = useState(searchParams.get("today") === "1");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "relevance");
  const [visibleCount, setVisibleCount] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const debouncedQuery = useDebounce(query, 400);
  const todayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const searchResults = useQuery(api.doctors.searchDoctors, {
    searchQuery: debouncedQuery || undefined,
    specialty: specialty || undefined,
    feeMax: feeMax ? Number(feeMax) : undefined,
    availTodayName: availToday ? todayName : undefined,
    sortBy: sort,
    limit: visibleCount,
  });

  const prevDoctorsRef = useRef<Doctor[]>([]);
  if (searchResults !== undefined) {
    prevDoctorsRef.current = searchResults;
  }

  const doctors = searchResults ?? prevDoctorsRef.current;
  const isLoading = searchResults === undefined && prevDoctorsRef.current.length === 0;

  useEffect(() => {
    const ob = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && searchResults) setVisibleCount(n => n + 10); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) ob.observe(loaderRef.current);
    return () => ob.disconnect();
  }, [searchResults]);

  useEffect(() => {
    setVisibleCount(10);
    // Clear previous results when filters change so we don't show old data for new searches
    prevDoctorsRef.current = [];
  }, [debouncedQuery, specialty, feeMax, availToday, sort]);

  const hasActiveFilters = specialty || feeMax || availToday;

  function clearAll() {
    setQuery(""); setSpecialty(""); setFeeMax(""); setAvailToday(false);
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground" dir={dir}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer flex-shrink-0">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <span className="font-serif italic font-extrabold text-sm text-white">ibn sina</span>
            </div>
          </Link>

          {/* Search */}
          <div className="flex-1 relative flex items-center bg-card border border-border focus-within:border-primary transition-colors">
            <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} w-4 h-4 text-muted-foreground`} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={dir === "rtl" ? "اسم الطبيب أو التخصص..." : "Search doctors, specialties..."}
              className={`w-full py-2.5 bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/60 ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
            />
            {query && (
              <button onClick={() => setQuery("")} className={`absolute ${dir === "rtl" ? "left-2" : "right-2"} text-muted-foreground hover:text-foreground cursor-pointer`}>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowFilters(o => !o)}
              className={`relative w-10 h-10 flex items-center justify-center border transition-colors cursor-pointer ${showFilters ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-foreground hover:bg-muted"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500" />}
            </button>
            <LanguageToggle />
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Filters Bar ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b-2 border-border bg-muted/20"
          >
            <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4">
              {/* Specialty */}
              <select
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                className="px-4 py-2 text-sm font-medium bg-card border border-border outline-none cursor-pointer"
              >
                <option value="">{t("feed.allSpecialties")}</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Max Fee */}
              <div className="relative">
                <DollarSign className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground ${dir === "rtl" ? "right-2.5" : "left-2.5"}`} />
                <input
                  type="number"
                  value={feeMax}
                  onChange={e => setFeeMax(e.target.value)}
                  placeholder={dir === "rtl" ? "أقصى سعر" : "Max fee"}
                  className={`w-32 py-2 text-sm font-medium bg-card border border-border outline-none ${dir === "rtl" ? "pr-8 pl-2" : "pl-8 pr-2"}`}
                />
              </div>

              {/* Available Today */}
              <button
                onClick={() => setAvailToday(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold tracking-wide uppercase border transition-colors cursor-pointer ${availToday
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-card border-border text-foreground hover:bg-muted"
                  }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("feed.availToday")}
              </button>

              {/* Sort */}
              <div className="flex items-center gap-1.5 ml-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="text-sm font-medium bg-transparent outline-none cursor-pointer text-muted-foreground"
                >
                  <option value="relevance">{dir === "rtl" ? "الأنسب" : "Relevance"}</option>
                  <option value="rating">{t("feed.sortRating")}</option>
                  <option value="fee_asc">{t("feed.sortFeeAsc")}</option>
                  <option value="fee_desc">{t("feed.sortFeeDesc")}</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button onClick={clearAll} className="text-xs font-semibold text-red-500 hover:text-red-600 cursor-pointer">
                  {t("feed.clearAll")}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results ────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-5 w-full">
        {/* Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-bold text-foreground">{doctors.length}</span> {t("feed.matches")}
          </p>
        )}

        {/* States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <IOSSpinner size={32} />
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-5">
              <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h2 className="font-serif text-3xl mb-2">{t("feed.noDoctors")}</h2>
            <p className="text-base text-muted-foreground mb-8 max-w-sm mx-auto">{t("feed.noDoctorsDesc")}</p>
            <button
              onClick={clearAll}
              className="px-8 py-3 bg-primary hover:bg-foreground text-primary-foreground font-bold uppercase tracking-widest text-xs transition-colors cursor-pointer"
            >
              {t("feed.clearAll")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col border-x border-border">
              {doctors.map(doc => (
                <motion.div key={doc._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <DoctorCard doctor={doc} />
                </motion.div>
              ))}
            </div>
            <div ref={loaderRef} className="h-16 flex items-center justify-center mt-2">
              {visibleCount <= doctors.length && <IOSSpinner size={20} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function FindADoctorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <IOSSpinner size={32} />
      </div>
    }>
      <FeedInner />
    </Suspense>
  );
}
