"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  MessageCircle,
  ClipboardList,
  FileEdit,
  Stethoscope,
  Sun,
  Moon,
  Search,
  ChevronRight,
  CalendarCheck,
  ShieldCheck,
  Zap,
  Crown,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

// ─── Features (free tier visible on landing for patients context) ───────────
const patientFeatures = [
  {
    icon: Search,
    name: "Find the Right Doctor",
    desc: "Browse verified premium doctors by specialty, clinic, or name — all in one search.",
  },
  {
    icon: CalendarCheck,
    name: "Book Online, Instantly",
    desc: "Pick your slot from the doctor's live calendar. No phone calls, no waiting on hold.",
  },
  {
    icon: MessageCircle,
    name: "WhatsApp Confirmation",
    desc: "Your appointment confirmation and reminders arrive automatically on WhatsApp.",
  },
  {
    icon: ShieldCheck,
    name: "Verified Premium Clinics",
    desc: "Only doctors on the premium plan appear in search — meaning they're fully set up and ready.",
  },
  {
    icon: Clock,
    name: "Real-Time Slot Availability",
    desc: "Slots update live. If a time is gone, you'll only see what's actually open.",
  },
  {
    icon: FileEdit,
    name: "Leave Feedback",
    desc: "After your visit, scan the doctor's QR code and leave an anonymous rating to help others.",
  },
];

// ─── Doctor-side feature breakdown ──────────────────────────────────────────
const freeFeatures = [
  "Full patient records with chronic conditions & notes",
  "Chronological visit timeline with photo uploads",
  "Smart drag-to-reorder queue with time slots",
  "Manual WhatsApp reminders (1 tap per patient)",
  "Branded prescription PDF generation (photo → clean PDF)",
  "QR code feedback page & ratings dashboard",
];
const premiumFeatures = [
  "Everything in Free",
  "Automatic day-of appointment confirmation (YES / NO reply)",
  "Auto next-patient WhatsApp — no button needed",
  "Prescription PDF auto-sent via WhatsApp after every visit",
  "Public doctor profile listed in patient search",
  "Online appointment booking calendar for patients",
  "Automatic booking confirmation messages to patients",
];

// ─── Doctor Search ───────────────────────────────────────────────────────────
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

  const results = useQuery(api.users.searchPremiumDoctors, { search: debouncedQuery });

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
        {open && results !== undefined && results.length > 0 && (
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
                <div className="w-11 h-11 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#007AFF]">
                    {doc.name.charAt(0).toUpperCase()}
                  </span>
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
        {open && results !== undefined && results.length === 0 && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full mt-2 left-0 right-0 bg-[var(--background)] border border-border rounded-2xl shadow-2xl p-6 text-center z-50"
          >
            <p className="text-sm text-muted-foreground">No doctors found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-1">Only premium-verified doctors appear in search</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">

      {/* ── Nav ── patient-only, no sign-in/up */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight text-[#007AFF]">Ibn Sina</span>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-[92vh] flex flex-col items-center justify-center px-6 pt-14">
        <div className="max-w-3xl mx-auto text-center w-full">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <p className="text-xs font-semibold tracking-widest uppercase text-[#007AFF] mb-6">
              Your Health, One Click Away
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
              Find a doctor.{" "}
              <span className="text-[#007AFF]">Book instantly.</span>
            </h1>
            <p className="text-lg text-[#6b6a63] dark:text-[#8e8d86] max-w-xl mx-auto mb-10 leading-relaxed">
              Search verified clinics, pick a real-time slot, and get a WhatsApp
              confirmation — no phone calls, no waiting.
            </p>

            <DoctorSearchBar />

            <p className="text-xs text-muted-foreground mt-5">
              Showing premium-verified doctors only
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── How it works (patient steps) ── */}
      <section className="py-24 px-6 bg-white/40 dark:bg-white/3">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Booking in 3 steps
            </h2>
            <p className="text-[#6b6a63] dark:text-[#8e8d86]">
              No account needed. Just find, pick, and confirm.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Search", desc: "Find a doctor by name, specialty, or clinic name." },
              { step: "02", title: "Pick a Slot", desc: "Choose from real-time available appointment times." },
              { step: "03", title: "Get Confirmed", desc: "Receive an automatic WhatsApp confirmation from the clinic." },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
                className="bg-[#f0efea] dark:bg-[#1c1c1a] border border-black/8 dark:border-white/8 rounded-2xl p-7"
              >
                <span className="text-4xl font-black text-[#007AFF]/20 block mb-4">{s.step}</span>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86] leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Patient features grid ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Built for patients first
            </h2>
            <p className="text-[#6b6a63] dark:text-[#8e8d86]">
              Every feature on Ibn Sina exists to make your healthcare simpler.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {patientFeatures.map((f, i) => (
              <motion.div
                key={f.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: i * 0.07, ease: "easeOut" }}
                className="bg-[#f0efea] dark:bg-[#1c1c1a] border border-black/8 dark:border-white/8 rounded-xl p-6 hover:border-[#007AFF]/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#007AFF]/10 flex items-center justify-center mb-4 group-hover:bg-[#007AFF]/15 transition-colors">
                  <f.icon className="w-5 h-5 text-[#007AFF]" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.name}</h3>
                <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86] leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Doctor CTA ── */}
      <section className="py-24 px-6 bg-white/40 dark:bg-white/3">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Free tier card */}
            <div className="bg-[#f0efea] dark:bg-[#1c1c1a] border border-black/8 dark:border-white/8 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#6b6a63]" />
                <span className="text-xs font-bold tracking-widest uppercase text-[#6b6a63]">Free</span>
              </div>
              <h3 className="text-xl font-bold mt-3 mb-2">Core Practice Tools</h3>
              <p className="text-sm text-muted-foreground mb-6">Everything a solo doctor needs to run their day.</p>
              <ul className="space-y-3 text-sm mb-8">
                {freeFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-[#34c759] mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block w-full text-center border border-border text-sm font-semibold py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
              >
                Start Free →
              </Link>
            </div>

            {/* Premium tier card */}
            <div className="relative bg-[#007AFF] text-white rounded-2xl p-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-white/80" />
                <span className="text-xs font-bold tracking-widest uppercase text-white/80">Premium</span>
              </div>
              <h3 className="text-xl font-bold mt-3 mb-2">Full Automation</h3>
              <p className="text-sm text-white/70 mb-6">Free, plus WhatsApp automation & patient-facing booking.</p>
              <ul className="space-y-3 text-sm mb-8">
                {premiumFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-white/80 mt-0.5 flex-shrink-0" />
                    <span className="text-white/90">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                id="premium-cta"
                className="block w-full text-center bg-white text-[#007AFF] text-sm font-bold py-2.5 rounded-xl hover:bg-white/90 transition-colors shadow-md"
              >
                Join as a Doctor →
              </Link>
            </div>
          </div>

          {/* Small doctor headline above cards */}
          <div className="text-center mb-10 mt-0 order-first">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#007AFF] mb-3">For Doctors</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Run your clinic smarter.
            </h2>
            <p className="text-[#6b6a63] dark:text-[#8e8d86] max-w-xl mx-auto">
              Ibn Sina gives every doctor — from solo GP to specialist — the tools to manage patients,
              queue, prescriptions, and appointments in one place.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Philosophy ── */}
      <section className="py-24 px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="max-w-2xl mx-auto bg-[#e8e7e0] dark:bg-[#1a1a18] rounded-2xl p-12 text-center"
        >
          <p className="text-xs font-semibold tracking-widest uppercase text-[#007AFF] mb-6">
            Our Philosophy
          </p>
          <div className="text-xl sm:text-2xl leading-loose text-[#1a1916] dark:text-[#f0efea] space-y-0">
            <p>Most medical software is built for hospitals.</p>
            <p>Massive. Complex. Designed by committees.</p>
            <p className="mt-4">We built Ibn Sina for one doctor.</p>
            <p>One room. One patient at a time.</p>
            <p className="mt-4">
              Every feature exists because it saves time,<br />
              or it doesn&apos;t exist at all.
            </p>
            <p className="mt-4 italic text-[#6b6a63] dark:text-[#8e8d86]">
              The best tool is the one you forget you&apos;re using —<br />
              because it just works.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-black/6 dark:border-white/6 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="font-bold text-lg tracking-tight text-[#007AFF]">Ibn Sina</p>
              <p className="text-xs text-[#6b6a63] dark:text-[#8e8d86] mt-1">
                © 2025 Ibn Sina. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-[#6b6a63] dark:text-[#8e8d86]">
              <a href="#" className="hover:text-[#007AFF] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#007AFF] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#007AFF] transition-colors">Contact</a>
              <Link href="/sign-up" className="hover:text-[#007AFF] transition-colors font-medium">
                Doctor Login →
              </Link>
            </div>
          </div>
          <div className="text-center text-xs text-[#6b6a63] dark:text-[#8e8d86]">
            Built with care for the doctors who care.
          </div>
        </div>
      </footer>
    </div>
  );
}
