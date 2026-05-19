"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Search, Star, MapPin, DollarSign,
  Stethoscope, CalendarDays, ChevronRight, ChevronLeft, ShieldCheck, Activity, CheckCircle2
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link href={`/doctors/${doctor.qrSlug}`} className="block group">
        <div className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,122,255,0.12)] transition-all duration-300 group-hover:-translate-y-1">
          
          {/* Avatar & Left Info */}
          <div className="flex gap-5 md:w-[65%]">
             <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden relative shadow-sm">
                {doctor.profilePhotoUrl ? (
                  <img src={doctor.profilePhotoUrl} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <span className="text-4xl font-bold text-[#007AFF]">{doctor.name.charAt(0)}</span>
                )}
             </div>
             
             <div className="flex flex-col min-w-0 flex-1 py-1">
               <h2 className="text-xl font-extrabold group-hover:text-[#007AFF] transition-colors truncate tracking-tight text-foreground">
                 {dir === "rtl" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`}
               </h2>
               <p className="text-sm font-semibold text-[#007AFF] truncate mt-0.5">{doctor.specialty ?? "—"}</p>
               
               {doctor.avgRating !== null && doctor.reviewCount > 0 && (
                 <div className="flex items-center gap-1.5 mt-2">
                   <div className="flex items-center gap-0.5 bg-[#FF9500]/10 px-1.5 py-0.5 rounded-md">
                     <Star className="w-3.5 h-3.5 fill-[#FF9500] text-[#FF9500]" />
                     <span className="text-xs font-bold text-[#FF9500]">{doctor.avgRating.toFixed(1)}</span>
                   </div>
                   <span className={`text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 hover:text-foreground transition-colors ${dir === "rtl" ? "mr-1" : "ml-1"}`}>
                     {t("profile.reviewsCount").replace("{count}", doctor.reviewCount.toString())}
                   </span>
                 </div>
               )}

               <div className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
                 {(doctor.city || doctor.clinicAddress) && (
                   <div className="flex items-start gap-2">
                     <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#FF3B30]" />
                     <span className="line-clamp-2 leading-relaxed font-medium">{doctor.clinicAddress || doctor.city}</span>
                   </div>
                 )}
                 {doctor.consultationFee !== null && (
                   <div className="flex items-center gap-2">
                     <DollarSign className="w-4 h-4 flex-shrink-0 text-[#34c759]" />
                     <span className="font-semibold text-foreground">
                        {t("profile.consultationFeeLabel").replace("{fee}", doctor.consultationFee.toLocaleString())}
                     </span>
                   </div>
                 )}
               </div>
             </div>
          </div>

          {/* Right Side / Bottom: Availability */}
          <div className={`md:w-[35%] flex flex-col justify-center border-t md:border-t-0 md:border-${dir === "rtl" ? "r" : "l"} border-border/60 pt-5 md:pt-0 md:p${dir === "rtl" ? "r" : "l"}-6`}>
             <div className="flex items-center gap-2 mb-4 text-sm font-bold text-foreground">
               <CalendarDays className="w-4 h-4 text-[#007AFF]" />
               {t("feed.checkAvailability")}
             </div>
             
             <div className="space-y-2.5">
                {availableToday ? (
                  <div className="w-full text-center py-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm rounded-xl border border-emerald-500/20 transition-all group-hover:bg-emerald-500 group-hover:text-white shadow-sm">
                    {t("feed.today")} - {t("feed.available")}
                  </div>
                ) : availableTomorrow ? (
                  <div className="w-full text-center py-2.5 bg-[#007AFF]/10 text-[#007AFF] font-bold text-sm rounded-xl border border-[#007AFF]/20 transition-all group-hover:bg-[#007AFF] group-hover:text-white shadow-sm">
                    {t("feed.tomorrow")} - {t("feed.available")}
                  </div>
                ) : (
                  <div className="w-full text-center py-2.5 bg-muted/50 text-muted-foreground font-semibold text-sm rounded-xl border border-border transition-colors group-hover:border-foreground/30">
                    {t("feed.checkAvailability")}
                  </div>
                )}
             </div>
             
             <div className="mt-4 flex items-center justify-center gap-1 text-xs font-bold text-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
               {dir === "rtl" ? "احجز الآن" : "Book Now"}
               {dir === "rtl" ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
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
  const [city, setCity] = useState(searchParams.get("city") ?? searchParams.get("location") ?? "");
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
    <div className="min-h-[100dvh] flex flex-col relative bg-[#FAFAFA] dark:bg-[#050505] text-foreground overflow-x-hidden" dir={dir}>
      
      {/* Decorative Vibrant Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#007AFF]/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* Premium Sticky Glass Header */}
      <div className="sticky top-0 z-40 px-4 md:px-8 w-full max-w-7xl mx-auto pt-4 md:pt-6 pb-4">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 dark:bg-[#111110]/80 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-full px-2 py-2 shadow-[0_10px_40px_-10px_rgba(0,122,255,0.15)] flex flex-col md:flex-row items-center gap-2 md:gap-4 transition-all"
        >
          {/* Logo / Home */}
          <Link href="/" className="hidden md:flex items-center gap-2 px-4 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-inner">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </Link>
          
          {/* Search Inputs */}
          <div className="flex-1 flex w-full items-center bg-transparent rounded-full px-2">
            <div className="flex-1 relative flex items-center group">
              <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} w-4 h-4 text-muted-foreground group-focus-within:text-[#007AFF] transition-colors`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("landing.searchPlaceholder")}
                className={`w-full py-2.5 bg-transparent outline-none font-semibold text-sm placeholder:text-muted-foreground/60 ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
              />
              {query && (
                <button onClick={() => setQuery("")} className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} text-muted-foreground hover:text-foreground text-lg leading-none`}>
                  ×
                </button>
              )}
            </div>
            
            <div className="w-[1px] h-6 bg-border mx-2" />
            
            <div className="flex-1 relative flex items-center group">
              <MapPin className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} w-4 h-4 text-muted-foreground group-focus-within:text-[#007AFF] transition-colors`} />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("feed.allCities")}
                className={`w-full py-2.5 bg-transparent outline-none font-semibold text-sm placeholder:text-muted-foreground/60 ${dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
              />
              {city && (
                <button onClick={() => setCity("")} className={`absolute ${dir === "rtl" ? "left-3" : "right-3"} text-muted-foreground hover:text-foreground text-lg leading-none`}>
                  ×
                </button>
              )}
            </div>
          </div>
          
        </motion.div>
      </div>

      {/* Main Content Split */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 flex flex-col lg:flex-row gap-8 items-start w-full relative z-10">
        
        {/* Left Sidebar (Filters) */}
        <div className="w-full lg:w-[300px] flex-shrink-0 sticky top-[100px]">
           <div className="bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-extrabold text-lg tracking-tight">{t("feed.filtersTitle")}</h3>
               <ShieldCheck className="w-5 h-5 text-[#007AFF]" />
             </div>
             
             <div className="space-y-6">
               {/* Specialty */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">{t("feed.allSpecialties")}</label>
                 <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                   className="w-full px-4 py-3 text-sm font-medium bg-white dark:bg-[#111110] border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-sm appearance-none">
                   <option value="">{t("feed.allSpecialties")}</option>
                   {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                 </select>
               </div>

               {/* City */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">{t("feed.allCities")}</label>
                 <select value={city} onChange={(e) => setCity(e.target.value)}
                   className="w-full px-4 py-3 text-sm font-medium bg-white dark:bg-[#111110] border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-sm appearance-none">
                   <option value="">{t("feed.allCities")}</option>
                   {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                 </select>
               </div>

               {/* Insurance (Stub) */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">{t("feed.insurance")}</label>
                 <select className="w-full px-4 py-3 text-sm font-medium bg-white dark:bg-[#111110] border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-sm appearance-none">
                   <option value="">{t("feed.noInsurance")}</option>
                 </select>
               </div>

               {/* Max Fee */}
               <div>
                 <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">{t("feed.maxFee")}</label>
                 <div className="relative">
                   <DollarSign className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none ${dir === "rtl" ? "right-4" : "left-4"}`} />
                   <input
                     type="number"
                     value={feeMax}
                     onChange={(e) => setFeeMax(e.target.value)}
                     placeholder="e.g. 500"
                     className={`w-full py-3 text-sm font-medium bg-white dark:bg-[#111110] border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] shadow-sm ${dir === "rtl" ? "pr-10 pl-4" : "pl-10 pr-4"}`}
                   />
                 </div>
               </div>

               {/* Availability Toggle */}
               <label className="flex items-center gap-3 p-4 bg-white dark:bg-[#111110] border border-border/50 rounded-xl cursor-pointer hover:border-[#007AFF]/40 transition-colors shadow-sm group">
                 <input type="checkbox" checked={availToday} onChange={(e) => setAvailToday(e.target.checked)} className="rounded w-5 h-5 text-[#007AFF] focus:ring-[#007AFF] border-muted-foreground/30" />
                 <span className="text-sm font-bold group-hover:text-[#007AFF] transition-colors">{t("feed.availToday")}</span>
               </label>
             </div>
           </div>
        </div>

        {/* Right Content (Results List) */}
        <div className="flex-1 min-w-0">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              {allDoctors !== undefined && (
                <span className="font-bold text-foreground bg-white dark:bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-border shadow-sm">{filtered.length}</span>
              )}
              {t("feed.matches")}
            </p>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-muted-foreground">{t("feed.sort")}</span>
              <select 
                value={sort} 
                onChange={(e) => setSort(e.target.value)}
                className="bg-white dark:bg-[#1a1a1a] text-sm font-bold border border-border/50 focus:ring-2 focus:ring-[#007AFF] px-3 py-1.5 rounded-lg cursor-pointer text-[#007AFF] shadow-sm appearance-none"
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
              <IOSSpinner size={44} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-32 bg-white/60 dark:bg-[#1a1a1a]/60 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-3xl shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Stethoscope className="w-10 h-10 text-[#007AFF]/60" />
              </div>
              <h2 className="font-extrabold text-2xl mb-3 tracking-tight">{t("feed.noDoctors")}</h2>
              <p className="text-base font-medium text-muted-foreground max-w-sm mx-auto">{t("feed.noDoctorsDesc")}</p>
              <button 
                onClick={() => { setQuery(""); setSpecialty(""); setCity(""); setLanguage(""); setFeeMax(""); setAvailToday(false); }}
                className="mt-8 px-6 py-3 bg-[#007AFF] text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
              >
                {t("feed.clearAll")}
              </button>
            </div>
          ) : (
            <>
              <motion.div layout className="flex flex-col gap-5">
                <AnimatePresence mode="popLayout">
                  {visible.map((doc) => (
                    <DoctorListCard key={doc._id} doctor={doc} />
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="h-24 flex items-center justify-center mt-6">
                {visibleCount < filtered.length && (
                  <div className="text-[#007AFF]"><IOSSpinner size={28} /></div>
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
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#050505] text-[#007AFF]">
        <IOSSpinner size={44} />
      </div>
    }>
      <FeedInner />
    </Suspense>
  );
}
