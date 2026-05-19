"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Star, MapPin, DollarSign,
  Stethoscope, CalendarDays, ChevronRight, ChevronLeft, ShieldCheck
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

// ── Doctor List Card ───────────────────────────────────────────────────────────────

function DoctorListCard({ doctor }: { doctor: Doctor }) {
  const { t, dir } = useI18n();
  const dayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const tomorrowIndex = (dayIndex + 1) % 7;
  const todayName = DAYS_OF_WEEK[dayIndex];
  const tomorrowName = DAYS_OF_WEEK[tomorrowIndex];
  
  const availableToday = doctor.availableDays.includes(todayName);
  const availableTomorrow = doctor.availableDays.includes(tomorrowName);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/doctors/${doctor.qrSlug}`} className="block group">
        <div className="bg-white dark:bg-[#1c1c1a] border border-black/6 dark:border-white/6 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md hover:border-[#007AFF]/30 transition-all duration-200">
          
          {/* Avatar & Left Info */}
          <div className="flex gap-4 md:w-2/3">
             <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted/40 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-sm">
                {doctor.profilePhotoUrl ? (
                  <img src={doctor.profilePhotoUrl} alt={doctor.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#007AFF]">{doctor.name.charAt(0)}</span>
                )}
             </div>
             
             <div className="flex flex-col min-w-0 flex-1">
               <h2 className="text-lg font-bold group-hover:text-[#007AFF] transition-colors truncate">
                 {dir === "rtl" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`}
               </h2>
               <p className="text-sm font-medium text-[#007AFF] truncate">{doctor.specialty ?? "—"}</p>
               
               {doctor.avgRating !== null && doctor.reviewCount > 0 && (
                 <div className="flex items-center gap-1 mt-1.5">
                   <Star className="w-3.5 h-3.5 fill-[#FF9500] text-[#FF9500]" />
                   <span className="text-xs font-bold">{doctor.avgRating.toFixed(1)}</span>
                   <span className={`text-xs text-muted-foreground underline decoration-muted-foreground/30 ${dir === "rtl" ? "mr-1" : "ml-1"}`}>
                     ({t("profile.reviewsCount").replace("{count}", doctor.reviewCount.toString())})
                   </span>
                 </div>
               )}

               <div className="mt-3 flex flex-col gap-1.5 text-xs text-muted-foreground">
                 {(doctor.city || doctor.clinicAddress) && (
                   <div className="flex items-start gap-1.5">
                     <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#FF3B30]" />
                     <span className="line-clamp-2 leading-relaxed">{doctor.clinicAddress || doctor.city}</span>
                   </div>
                 )}
                 {doctor.consultationFee !== null && (
                   <div className="flex items-center gap-1.5">
                     <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-[#34c759]" />
                     <span className="font-medium text-foreground">
                        {t("profile.consultationFeeLabel").replace("{fee}", doctor.consultationFee.toLocaleString())}
                     </span>
                   </div>
                 )}
               </div>
             </div>
          </div>

          {/* Right Side / Bottom: Availability */}
          <div className={`md:w-1/3 flex flex-col justify-center border-t md:border-t-0 md:border-${dir === "rtl" ? "r" : "l"} border-border pt-4 md:pt-0 md:p${dir === "rtl" ? "r" : "l"}-5`}>
             <div className="flex items-center gap-1.5 mb-3 text-sm font-semibold">
               <CalendarDays className="w-4 h-4 text-[#007AFF]" />
               {t("feed.checkAvailability")}
             </div>
             <div className="space-y-2">
                {availableToday ? (
                  <div className="w-full text-center py-2 bg-[#34c759]/10 text-[#34c759] font-bold text-xs rounded-xl border border-[#34c759]/20 transition-colors group-hover:bg-[#34c759] group-hover:text-white">
                    {t("feed.today")} - {t("feed.available")}
                  </div>
                ) : availableTomorrow ? (
                  <div className="w-full text-center py-2 bg-[#007AFF]/10 text-[#007AFF] font-bold text-xs rounded-xl border border-[#007AFF]/20 transition-colors group-hover:bg-[#007AFF] group-hover:text-white">
                    {t("feed.tomorrow")} - {t("feed.available")}
                  </div>
                ) : (
                  <div className="w-full text-center py-2 bg-muted/40 text-muted-foreground font-semibold text-xs rounded-xl border border-border transition-colors group-hover:border-foreground/20">
                    {t("feed.checkAvailability")}
                  </div>
                )}
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
  const [visibleCount, setVisibleCount] = useState(10);
  const loaderRef = useRef<HTMLDivElement>(null);

  const allDoctors = useQuery(api.doctors.listPublishedDoctors);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && allDoctors) setVisibleCount((n) => n + 10); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [allDoctors]);

  // Reset visible count on filter change
  useEffect(() => { setVisibleCount(10); }, [query, specialty, city, language, feeMax, availToday, sort]);

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
          (d.clinicName ?? "").toLowerCase().includes(q) ||
          (d.clinicAddress ?? "").toLowerCase().includes(q)
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

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]" dir={dir}>
      
      {/* Search Hero Header */}
      <div className="bg-white dark:bg-[#1c1c1a] border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{t("feed.title")}</h1>
            <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-[#007AFF] hover:underline transition-colors">
              {dir === "rtl" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {t("feed.home").replace("←", "").replace("→", "").trim()}
            </Link>
          </div>
          
          <div className="relative max-w-2xl">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none ${dir === "rtl" ? "right-4" : "left-4"}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("landing.searchPlaceholder")}
              className={`w-full py-3.5 text-base bg-muted/40 border border-border rounded-xl focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all ${dir === "rtl" ? "pr-12 pl-4" : "pl-12 pr-4"}`}
            />
            {query && (
              <button onClick={() => setQuery("")} className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xl leading-none ${dir === "rtl" ? "left-4" : "right-4"}`}>
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
        
        {/* Left Sidebar (Filters) */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-6">
           <div>
             <h3 className="font-bold text-lg mb-4">{t("feed.filtersTitle")}</h3>
             
             <div className="space-y-5">
               {/* Specialty */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("feed.allSpecialties")}</label>
                 <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                   className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                   <option value="">{t("feed.allSpecialties")}</option>
                   {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>

               {/* City */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("feed.allCities")}</label>
                 <select value={city} onChange={(e) => setCity(e.target.value)}
                   className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                   <option value="">{t("feed.allCities")}</option>
                   {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>

               {/* Insurance (Stub) */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("feed.insurance")}</label>
                 <div className="relative">
                   <ShieldCheck className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none ${dir === "rtl" ? "right-3" : "left-3"}`} />
                   <select className={`w-full py-2 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"}`}>
                     <option value="">{t("feed.noInsurance")}</option>
                   </select>
                 </div>
               </div>

               {/* Max Fee */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">{t("feed.maxFee")}</label>
                 <input
                   type="number"
                   value={feeMax}
                   onChange={(e) => setFeeMax(e.target.value)}
                   placeholder=""
                   className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                 />
               </div>

               {/* Availability Toggle */}
               <label className="flex items-center gap-3 p-3 bg-white dark:bg-[#1c1c1a] border border-border rounded-xl cursor-pointer hover:border-[#007AFF]/40 transition-colors">
                 <input type="checkbox" checked={availToday} onChange={(e) => setAvailToday(e.target.checked)} className="rounded w-4 h-4 text-[#007AFF] focus:ring-[#007AFF]" />
                 <span className="text-sm font-semibold">{t("feed.availToday")}</span>
               </label>
             </div>
           </div>
        </div>

        {/* Right Content (Results List) */}
        <div className="flex-1 min-w-0">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              {allDoctors !== undefined && (
                <span className="font-bold text-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border">{filtered.length}</span>
              )}
              {t("feed.matches")}
            </p>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("feed.sort")}</span>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className="bg-transparent text-sm font-semibold border-none focus:ring-0 p-0 cursor-pointer text-[#007AFF] pr-6"
              >
                <option value="relevance">{t("feed.sortRelevance")}</option>
                <option value="rating">{t("feed.sortRating")}</option>
                <option value="fee_asc">{t("feed.sortFeeAsc")}</option>
                <option value="fee_desc">{t("feed.sortFeeDesc")}</option>
              </select>
            </div>
          </div>

          {allDoctors === undefined ? (
            <div className="flex items-center justify-center py-32 text-[#007AFF]">
              <IOSSpinner size={40} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 bg-white dark:bg-[#1c1c1a] border border-border rounded-3xl">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h2 className="font-bold text-lg mb-2">{t("feed.noDoctors")}</h2>
              <p className="text-sm text-muted-foreground">{t("feed.noDoctorsDesc")}</p>
              <button 
                onClick={() => { setQuery(""); setSpecialty(""); setCity(""); setLanguage(""); setFeeMax(""); setAvailToday(false); }}
                className="mt-6 px-4 py-2 bg-[#007AFF] text-white text-sm font-semibold rounded-xl hover:bg-[#0062cc] transition-colors"
              >
                {t("feed.clearAll")}
              </button>
            </div>
          ) : (
            <>
              <motion.div layout className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {visible.map((doc) => (
                    <DoctorListCard key={doc._id} doctor={doc} />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="h-16 flex items-center justify-center mt-6">
                {visibleCount < filtered.length && (
                  <div className="text-[#007AFF]"><IOSSpinner size={24} /></div>
                )}
              </div>
            </>
          )}
        </div>

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
