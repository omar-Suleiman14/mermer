"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronRight,
  Sun,
  Moon,
  Stethoscope,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { IOSSpinner } from "@/components/ui/spinner";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};



// ─── Doctor Search Bar ───────────────────────────────────────────────────────
function DoctorSearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = useQuery(
    api.users.searchPremiumDoctors,
    debouncedQuery.trim() ? { search: debouncedQuery } : "skip"
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <input
          id="doctor-search"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search doctors by name, specialty, or clinic…"
          className="w-full pl-12 pr-4 py-4 text-base bg-[var(--background)] border-2 border-border focus:border-[#007AFF] rounded-2xl outline-none transition-all shadow-sm placeholder:text-muted-foreground/60"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setDebouncedQuery(""); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xl leading-none"
          >
            ×
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.trim() && results !== undefined && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full mt-2 left-0 right-0 bg-[var(--background)] border border-border rounded-2xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto"
          >
            {results.map((doc) => (
              <Link
                key={doc._id}
                href={`/doctors/${doc.qrSlug}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border/50 last:border-0 group"
              >
                <div className="w-11 h-11 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {doc.profilePhotoUrl ? (
                    <img
                      src={doc.profilePhotoUrl}
                      alt={`Dr. ${doc.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[#007AFF]">
                      {doc.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm group-hover:text-[#007AFF] transition-colors">
                    Dr. {doc.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.specialty} {doc.clinicName ? `· ${doc.clinicName}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#007AFF] flex-shrink-0 transition-colors" />
              </Link>
            ))}
          </motion.div>
        )}
        
        {open && results === undefined && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 bg-[var(--background)] border border-border rounded-2xl shadow-2xl p-6 flex items-center justify-center z-50"
          >
            <IOSSpinner size={24} color="var(--muted-foreground)" />
          </motion.div>
        )}

        {open && results !== undefined && results.length === 0 && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 bg-[var(--background)] border border-border rounded-2xl shadow-2xl p-6 text-center z-50"
          >
            <p className="text-sm text-muted-foreground">No doctors found for &ldquo;{query}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex flex-col">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight text-[#007AFF]">Ibn Sina</span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Toggle dark mode"
          >
            {mounted && (theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />)}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-14">
        <div className="max-w-3xl mx-auto text-center w-full">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col items-center gap-10">
            {/* Headline */}
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#007AFF] mb-5">
                Your Health, One Click Away
              </p>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-5">
                Find a doctor.{" "}
                <span className="text-[#007AFF]">Book instantly.</span>
              </h1>
              <p className="text-lg text-[#6b6a63] dark:text-[#8e8d86] max-w-xl mx-auto leading-relaxed">
                Search verified clinics, pick a real-time slot, and get a WhatsApp
                confirmation — no phone calls, no waiting.
              </p>
            </div>

            {/* Search */}
            <div className="w-full">
              <DoctorSearchBar />
              {/* <p className="text-xs text-muted-foreground mt-3">
                Showing premium-verified doctors only
              </p> */}
            </div>

            {/* Doctor CTA */}
            {/* <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <Link
                href="/sign-up"
                id="doctor-join-cta"
                className="flex items-center justify-between gap-4 w-full px-6 py-4 bg-white/60 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-black/8 dark:border-white/10 rounded-2xl transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#007AFF]/15 transition-colors">
                    <Stethoscope className="w-4 h-4 text-[#007AFF]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">Are you a doctor?</p>
                    <p className="text-xs text-[#6b6a63] dark:text-[#8e8d86]">Join Ibn Sina and manage your clinic</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#007AFF] flex-shrink-0 transition-colors" />
              </Link>
            </motion.div> */}
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/6 dark:border-white/6 py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#6b6a63] dark:text-[#8e8d86]">
          <p className="font-bold text-sm text-[#007AFF]">Ibn Sina</p>
          <p>© 2025 Ibn Sina. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[#007AFF] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#007AFF] transition-colors">Terms</a>
            <Link href="/sign-in" className="hover:text-[#007AFF] transition-colors font-medium">Doctor Login →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
