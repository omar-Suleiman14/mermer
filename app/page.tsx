"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, Sun, Moon, Search, MapPin, Star, ShieldCheck, HeartPulse, Activity, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { motion } from "framer-motion";

function PremiumSearchBar() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const router = useRouter();
  const { t, dir } = useI18n();

  function handleSearch() {
    if (!query.trim() && !location.trim()) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (location.trim()) params.set("city", location.trim());
    router.push(`/find-a-doctor?${params.toString()}`);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.8, type: "spring", stiffness: 100 }}
      className="w-full max-w-4xl mx-auto mt-10 md:mt-16"
    >
      <div className="bg-white/70 dark:bg-[#111110]/70 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,122,255,0.15)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] p-2 sm:p-3 flex flex-col md:flex-row gap-2 transition-all hover:shadow-[0_40px_80px_-15px_rgba(0,122,255,0.2)]">
        
        {/* Search Query */}
        <div className="flex-1 relative flex items-center group">
          <Search className={`absolute ${dir === "rtl" ? "right-5" : "left-5"} w-5 h-5 text-muted-foreground group-focus-within:text-[#007AFF] transition-colors`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={dir === "rtl" ? "اسم الطبيب، التخصص، الأعراض..." : "Condition, procedure, doctor name..."}
            className={`w-full py-4 bg-transparent outline-none font-medium text-lg placeholder:text-muted-foreground/60 ${dir === "rtl" ? "pr-14 pl-4" : "pl-14 pr-4"}`}
            dir={dir}
          />
        </div>
        
        {/* Divider */}
        <div className="hidden md:block w-[1px] h-12 bg-border/50 self-center" />
        <div className="md:hidden h-[1px] w-full bg-border/50" />

        {/* Location */}
        <div className="flex-1 relative flex items-center group">
          <MapPin className={`absolute ${dir === "rtl" ? "right-5" : "left-5"} w-5 h-5 text-muted-foreground group-focus-within:text-[#007AFF] transition-colors`} />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={dir === "rtl" ? "المدينة أو المنطقة" : "City or neighborhood"}
            className={`w-full py-4 bg-transparent outline-none font-medium text-lg placeholder:text-muted-foreground/60 ${dir === "rtl" ? "pr-14 pl-4" : "pl-14 pr-4"}`}
            dir={dir}
          />
        </div>

        {/* Action Button */}
        <button 
          onClick={handleSearch}
          className="bg-[#007AFF] hover:bg-blue-600 text-white rounded-2xl px-8 py-4 font-bold text-lg transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 flex-shrink-0"
        >
          <Search className="w-5 h-5" />
          {dir === "rtl" ? "ابحث الآن" : "Find Care"}
        </button>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-8 text-sm font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          {dir === "rtl" ? "أطباء معتمدون" : "Verified Doctors"}
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-[#FF9500]" />
          {dir === "rtl" ? "تقييمات حقيقية للمرضى" : "Real Patient Reviews"}
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#007AFF]" />
          {dir === "rtl" ? "حجز آمن ومجاني" : "Free & Secure Booking"}
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, dir } = useI18n();
  
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-[100dvh] flex flex-col relative bg-[#FAFAFA] dark:bg-[#050505] text-foreground selection:bg-[#007AFF]/20 overflow-x-hidden" dir={dir}>
      
      {/* Decorative Vibrant Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#007AFF]/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-purple-500/10 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* Modern Pill Nav */}
      <div className="pt-6 px-4 md:px-8 w-full max-w-7xl mx-auto flex justify-center shrink-0">
        <motion.nav 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full bg-white/70 dark:bg-[#111110]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-full px-6 py-3 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center shadow-inner">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-foreground">
              {t("profile.brandName")}
            </span>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <LanguageToggle />
            <div className="w-[1px] h-4 bg-border" />
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
              className="w-8 h-8 flex items-center justify-center hover:bg-muted/50 rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
              {mounted && (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            </button>
            
            <div className="hidden sm:flex items-center gap-3 ml-2 rtl:ml-0 rtl:mr-2">
              {!mounted ? (
                <div className="w-24 h-9 rounded-full bg-muted animate-pulse" />
              ) : (
                <>
                  <SignedOut>
                    <Link href="/sign-in" className="text-sm font-semibold text-[#007AFF] hover:text-blue-700 transition-colors px-3 py-2">
                      {dir === "rtl" ? "لـلأطــبـــاء" : "For Doctors"}
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <Link href="/dashboard" className="text-sm font-semibold bg-[#007AFF] text-white px-5 py-2 rounded-full hover:bg-blue-600 transition-colors shadow-md shadow-blue-500/20">
                      {t("nav.dashboard")}
                    </Link>
                  </SignedIn>
                </>
              )}
            </div>
          </div>
        </motion.nav>
      </div>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 md:px-8 py-12 md:py-24 max-w-7xl mx-auto w-full relative z-10 text-center">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-[#007AFF] font-medium text-sm mb-8 border border-blue-500/20 shadow-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          {dir === "rtl" ? "الطريقة الأذكى لإدارة صحتك" : "The smarter way to manage your health"}
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.1] text-balance max-w-4xl"
        >
          {dir === "rtl" ? (
            <>
              احجز مع أفضل الأطباء <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-[#5856D6]">محلياً</span>.
            </>
          ) : (
            <>
              Find local doctors who take your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-[#5856D6]">insurance</span>.
            </>
          )}
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl text-balance"
        >
          {dir === "rtl" 
            ? "تصفح التقييمات الحقيقية، قارن الأسعار، واحجز موعدك عبر الإنترنت مجاناً في ثوانٍ."
            : "Read real reviews, compare availability, and book your next appointment online for free."}
        </motion.p>
        
        <div className="w-full mt-4">
          <PremiumSearchBar />
        </div>

      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="px-4 py-8 mt-auto border-t border-border bg-white/30 dark:bg-black/30 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-muted-foreground">
          <p>© {new Date().getFullYear()} {t("profile.brandName")}. {t("landing.rights")}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("landing.privacy")}</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("landing.terms")}</Link>
            <SignedOut>
              <Link href="/sign-in" className="hover:text-[#007AFF] transition-colors md:hidden">
                {dir === "rtl" ? "لـلأطــبـــاء" : "For Doctors"}
              </Link>
            </SignedOut>
          </div>
        </div>
      </motion.footer>

    </div>
  );
}
