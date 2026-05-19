"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";

// Removed specialty chips as requested

// ── Main Landing Page ──────────────────────────────────────────────────────────

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, dir } = useI18n();
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    router.push(`/find-a-doctor${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-[#0055FF] selection:text-white"
      dir={dir}
    >
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-[#0055FF] flex items-center justify-center">
              <span className="font-serif italic font-extrabold text-xl text-white">ibn sina</span>
            </div>
            <span className="font-bold text-base tracking-tight">
              {dir === "rtl" ? "ابن سينا" : "Ibn Sina"}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/find-a-doctor"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              {dir === "rtl" ? "ابحث عن طبيب" : "Find a Doctor"}
            </Link>
            <LanguageToggle />
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-muted-foreground"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}
            {mounted && (
              <>
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {dir === "rtl" ? "تسجيل الدخول" : "Log in"}
                  </Link>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="text-sm font-bold bg-[#0055FF] hover:bg-black dark:hover:bg-white dark:hover:text-black text-white px-6 py-2.5 transition-colors"
                  >
                    {t("nav.dashboard")}
                  </Link>
                </SignedIn>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif tracking-tighter text-center leading-[1.1] max-w-4xl">
          {dir === "rtl"
            ? "ابحث عن طبيبك واحجز موعدك"
            : "Find your doctor, book your visit."}
        </h1>
        <p className="mt-8 text-muted-foreground text-center text-lg md:text-xl font-medium max-w-xl">
          {dir === "rtl"
            ? "ابحث بالاسم أو التخصص واحجز فوراً"
            : "Search by name or specialty and book instantly"}
        </p>

        {/* Search Bar - Brutalist Minimal */}
        <div className="w-full max-w-3xl mt-12 md:mt-16">
          <div className="flex flex-col sm:flex-row items-stretch border-2 border-foreground bg-background focus-within:ring-4 focus-within:ring-[#0055FF]/20 transition-all">
            <div className="flex-1 flex items-center px-6">
              <Search className={`w-6 h-6 text-foreground flex-shrink-0 ${dir === "rtl" ? "ml-4" : "mr-4"}`} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={dir === "rtl" ? "اسم الطبيب أو التخصص..." : "Search doctors, specialties..."}
                className="w-full bg-transparent outline-none text-xl md:text-2xl font-serif py-6 placeholder:text-muted-foreground/40"
                dir={dir}
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#0055FF] hover:bg-foreground text-white font-bold text-lg md:text-xl px-12 py-6 sm:py-0 transition-colors cursor-pointer flex-shrink-0"
            >
              {dir === "rtl" ? "بحث" : "Search"}
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {dir === "rtl" ? "ابن سينا" : "Ibn Sina"}</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t("landing.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t("landing.terms")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
