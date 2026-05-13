"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Star, MapPin, DollarSign, Clock, Languages,
  SlidersHorizontal, X, ChevronRight, Stethoscope,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";

// ── Types ────────────────────────────────────────────────────────────────────

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

const CITIES = ["Cairo", "Giza", "Alexandria", "Mansoura", "Tanta", "Luxor", "Aswan", "Hurghada", "Sharm El-Sheikh"];

// ── Doctor Card ───────────────────────────────────────────────────────────────

function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { t, dir } = useI18n();
  const todayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const availableToday = doctor.availableDays.includes(todayName);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/doctors/${doctor.qrSlug}`} className="block group">
        <div className="bg-white dark:bg-[#1c1c1a] border border-black/6 dark:border-white/6 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#007AFF]/20 transition-all duration-200">
          {/* Photo strip */}
          <div className="relative h-20 bg-gradient-to-br from-[#007AFF]/15 to-[#5856D6]/15 flex items-center px-4 gap-4">
            <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#111110] border-2 border-white/80 dark:border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
              {doctor.profilePhotoUrl ? (
                <img src={doctor.profilePhotoUrl} alt={doctor.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-[#007AFF]">{doctor.name.charAt(0)}</span>
              )}
            </div>
            {availableToday && (
              <span className={`absolute top-2.5 ${dir === "rtl" ? "left-3" : "right-3"} text-[10px] font-bold bg-[#34c759] text-white px-2 py-0.5 rounded-full shadow-sm`}>
                {t("feed.today")}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            <div>
              <p className="font-bold text-sm group-hover:text-[#007AFF] transition-colors">
                Dr. {doctor.name}
              </p>
              <p className="text-xs text-[#007AFF] font-medium mt-0.5">{doctor.specialty ?? "—"}</p>
              {doctor.avgRating !== null && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-2.5 h-2.5 ${i < Math.round(doctor.avgRating!) ? "fill-[#FF9500] text-[#FF9500]" : "text-muted-foreground/20"}`}
                    />
                  ))}
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    {doctor.avgRating.toFixed(1)} ({doctor.reviewCount})
                  </span>
                </div>
              )}
            </div>

            {doctor.bio && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{doctor.bio}</p>
            )}

            <div className="space-y-1.5">
              {doctor.consultationFee !== null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3 text-[#34c759] flex-shrink-0" />
                  <span>{doctor.consultationFee.toLocaleString()} {t("common.currency")}</span>
                </div>
              )}
              {(doctor.city || doctor.clinicAddress) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 text-[#FF3B30] flex-shrink-0" />
                  <span className="truncate">{doctor.city ?? doctor.clinicAddress}</span>
                </div>
              )}
              {doctor.availableFrom && doctor.availableTo && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3 text-[#007AFF] flex-shrink-0" />
                  <span>{doctor.availableFrom} – {doctor.availableTo}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-wrap gap-1">
                {doctor.languages.slice(0, 2).map((l) => (
                  <span key={l} className="text-[9px] font-medium px-1.5 py-0.5 bg-[#5856D6]/8 text-[#5856D6] rounded-full">{l}</span>
                ))}
              </div>
              <ChevronRight className={`w-4 h-4 text-muted-foreground/40 group-hover:text-[#007AFF] transition-colors ${dir === "rtl" ? "rotate-180" : ""}`} />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Feed Inner ────────────────────────────────────────────────────────────────

function FeedInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, dir } = useI18n();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [specialty, setSpecialty] = useState(searchParams.get("specialty") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [language, setLanguage] = useState(searchParams.get("lang") ?? "");
  const [feeMax, setFeeMax] = useState(searchParams.get("fee") ?? "");
  const [availToday, setAvailToday] = useState(searchParams.get("today") === "1");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const loaderRef = useRef<HTMLDivElement>(null);

  const allDoctors = useQuery(api.doctors.listPublishedDoctors);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && allDoctors) setVisibleCount((n) => n + 12); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [allDoctors]);

  // Reset visible count on filter change
  useEffect(() => { setVisibleCount(12); }, [query, specialty, city, language, feeMax, availToday, sort]);

  const todayName = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const filtered = useMemo(() => {
    if (!allDoctors) return [];
    let list = [...allDoctors] as Doctor[];

    const q = query.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.specialty ?? "").toLowerCase().includes(q) ||
          (d.city ?? "").toLowerCase().includes(q) ||
          (d.clinicAddress ?? "").toLowerCase().includes(q) ||
          (d.bio ?? "").toLowerCase().includes(q)
      );
    }
    if (specialty) list = list.filter((d) => d.specialty === specialty);
    if (city) list = list.filter((d) => (d.city ?? "").toLowerCase().includes(city.toLowerCase()));
    if (language) list = list.filter((d) => d.languages.includes(language));
    if (feeMax) list = list.filter((d) => d.consultationFee !== null && d.consultationFee <= Number(feeMax));
    if (availToday) list = list.filter((d) => d.availableDays.includes(todayName));

    // Sort
    if (sort === "fee_asc") list.sort((a, b) => (a.consultationFee ?? 999999) - (b.consultationFee ?? 999999));
    else if (sort === "fee_desc") list.sort((a, b) => (b.consultationFee ?? 0) - (a.consultationFee ?? 0));
    else if (sort === "rating") list.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

    return list;
  }, [allDoctors, query, specialty, city, language, feeMax, availToday, sort, todayName]);

  const visible = filtered.slice(0, visibleCount);
  const activeFilterCount = [specialty, city, language, feeMax, availToday ? "t" : ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#f0efea]/90 dark:bg-[#111110]/90 backdrop-blur-md border-b border-black/6 dark:border-white/6">
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">{t("feed.title")}</h1>
              {allDoctors !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {filtered.length} {t("feed.available")}
                </p>
              )}
            </div>
            <Link href="/" className="text-xs text-[#007AFF] font-medium hover:underline">{t("feed.home")}</Link>
          </div>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none ${dir === "rtl" ? "right-3.5" : "left-3.5"}`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("landing.searchPlaceholder")}
                className={`w-full py-2.5 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-sm ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"}`}
              />
              {query && (
                <button onClick={() => setQuery("")} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none ${dir === "rtl" ? "left-3" : "right-3"}`}>×</button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-xl border transition-colors ${showFilters ? "bg-[#007AFF] text-white border-[#007AFF]" : "bg-white dark:bg-[#1c1c1a] border-border hover:border-[#007AFF]/40"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("feed.filters")}
              {activeFilterCount > 0 && (
                <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ${showFilters ? "bg-white text-[#007AFF]" : "bg-[#007AFF] text-white"}`}>{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
                  <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                    <option value="">{t("feed.allSpecialties")}</option>
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select value={city} onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                    <option value="">{t("feed.allCities")}</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select value={language} onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-2 text-xs bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                    <option value="">{t("feed.allLanguages")}</option>
                    {["Arabic", "English", "French", "German", "Spanish"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>

                  <div className="relative">
                    <input
                      type="number"
                      value={feeMax}
                      onChange={(e) => setFeeMax(e.target.value)}
                      placeholder={t("feed.maxFee")}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                    />
                  </div>

                  <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1c1c1a] border border-border rounded-xl cursor-pointer">
                    <input type="checkbox" checked={availToday} onChange={(e) => setAvailToday(e.target.checked)} className="rounded" />
                    <span className="text-xs font-medium">{t("feed.availToday")}</span>
                  </label>
                </div>

                {/* Sort + Clear */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground font-medium">{t("feed.sort")}</span>
                  {[
                    { value: "relevance", label: t("feed.sortRelevance") },
                    { value: "fee_asc", label: t("feed.sortFeeAsc") },
                    { value: "fee_desc", label: t("feed.sortFeeDesc") },
                    { value: "rating", label: t("feed.sortRating") },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${sort === opt.value ? "bg-[#007AFF] text-white border-[#007AFF]" : "border-border hover:border-[#007AFF]/40"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setSpecialty(""); setCity(""); setLanguage(""); setFeeMax(""); setAvailToday(false); }}
                      className={`text-xs text-red-500 font-medium hover:underline flex items-center gap-1 ${dir === "rtl" ? "mr-auto" : "ml-auto"}`}
                    >
                      <X className="w-3 h-3" /> {t("feed.clearAll")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {allDoctors === undefined ? (
          <div className="flex items-center justify-center py-24 text-[#007AFF]">
            <IOSSpinner size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <h2 className="font-bold text-lg mb-2">{t("feed.noDoctors")}</h2>
            <p className="text-sm text-muted-foreground">{t("feed.noDoctorsDesc")}</p>
          </div>
        ) : (
          <>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {visible.map((doc) => (
                  <DoctorCard key={doc._id} doctor={doc} />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="h-16 flex items-center justify-center mt-4">
              {visibleCount < filtered.length && (
                <div className="text-[#007AFF]"><IOSSpinner size={24} /></div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FindADoctorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f0efea] dark:bg-[#111110] text-[#007AFF]">
        <IOSSpinner size={40} />
      </div>
    }>
      <FeedInner />
    </Suspense>
  );
}
