"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";

import Link from "next/link";
import { ArrowRight, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { motion } from "framer-motion";

function FeedSearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { t, dir } = useI18n();

  function handleSearch() {
    if (!query.trim()) return;
    router.push(`/find-a-doctor?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
      className="w-full max-w-3xl mt-16 border-b-[3px] border-black dark:border-white flex items-center pb-4 transition-colors focus-within:border-[#007AFF] dark:focus-within:border-[#007AFF]"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder={t("landing.searchPlaceholder")}
        className="flex-1 bg-transparent text-2xl md:text-4xl font-semibold outline-none placeholder:text-black/10 dark:placeholder:text-white/20"
        dir={dir}
      />
      <button 
        onClick={handleSearch}
        className="ml-4 rtl:ml-0 rtl:mr-4 flex items-center justify-center w-14 h-14 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-[#007AFF] dark:hover:bg-[#007AFF] transition-colors"
      >
        <ArrowRight className={`w-6 h-6 ${dir === "rtl" ? "rotate-180" : ""}`} />
      </button>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, dir } = useI18n();
  
  useEffect(() => setMounted(true), []);

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#F4F4F0] dark:bg-[#0A0A0A] text-black dark:text-white p-4 sm:p-6 md:p-8 selection:bg-black selection:text-[#F4F4F0] dark:selection:bg-white dark:selection:text-[#0A0A0A]" dir={dir}>
      <div className="h-full border-2 border-black/10 dark:border-white/10 flex flex-col relative overflow-hidden">
        
        {/* Nav */}
        <motion.nav 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="p-4 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0"
        >
          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-2xl md:text-3xl tracking-tighter uppercase leading-none">Ibn Sina.</span>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/find-a-doctor" className="text-sm font-bold uppercase tracking-widest hover:line-through decoration-2">
              {t("landing.findNav")}
            </Link>
            <div className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
            <LanguageToggle />
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
              {mounted && (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
            </button>
          </div>
        </motion.nav>

        {/* Hero */}
        <main className="flex-1 min-h-0 flex flex-col justify-center p-4 md:p-8 lg:p-12 overflow-hidden">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[12vw] sm:text-[10vw] md:text-[8vw] lg:text-[7rem] font-bold tracking-tighter leading-[0.85] text-balance shrink-0"
          >
            {t("landing.findDoctor")}<br/>
            <span className="text-black/30 dark:text-white/30 italic font-serif pr-2">{t("landing.bookInstantly")}</span>
          </motion.h1>
          
          <div className="shrink-0 mt-8">
            <FeedSearchBar />
          </div>
        </main>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="p-4 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs font-bold uppercase tracking-widest shrink-0"
        >
          <p className="text-black/30 dark:text-white/30">© 2026. {t("landing.rights")}</p>
          <div className="flex flex-wrap gap-4 md:gap-8">
            <Link href="/privacy" className="hover:line-through decoration-2">{t("landing.privacy")}</Link>
            <Link href="/terms" className="hover:line-through decoration-2">{t("landing.terms")}</Link>
            {!mounted ? (
              <Link href="/sign-in" className="hover:text-[#007AFF] transition-colors">{t("landing.doctorLogin")}</Link>
            ) : (
              <>
                <SignedOut>
                  <Link href="/sign-in" className="hover:text-[#007AFF] transition-colors">{t("landing.doctorLogin")}</Link>
                </SignedOut>
                <SignedIn>
                  <Link href="/dashboard" className="hover:text-[#007AFF] transition-colors">{t("nav.dashboard")}</Link>
                </SignedIn>
              </>
            )}
          </div>
        </motion.footer>

      </div>
    </div>
  );
}
