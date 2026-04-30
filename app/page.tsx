"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock,
  Users,
  MessageCircle,
  ClipboardList,
  FileEdit,
  Stethoscope,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function Highlight({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <span
      style={{ color, backgroundColor: bg, borderRadius: "0.25em", padding: "0 0.15em" }}
    >
      {children}
    </span>
  );
}

const features = [
  {
    icon: Clock,
    name: "Patient History, Always Ready",
    desc: "Every visit logged. When a patient returns, their full history is one click away — no searching, no repeating.",
  },
  {
    icon: Users,
    name: "Smart Queue, Zero Friction",
    desc: "Add patients to today's queue in seconds. See who's next, who's waiting, and move through your day without spreadsheets.",
  },
  {
    icon: MessageCircle,
    name: "WhatsApp Reminders in One Tap",
    desc: "When a patient is almost up, Ibn Sina prompts you. One tap opens WhatsApp with the message written and ready — just hit send.",
  },
  {
    icon: ClipboardList,
    name: "Intake That Doesn't Slow You Down",
    desc: "Capture name, age, conditions, meds, and analysis needed in one clean form. Done in under a minute.",
  },
  {
    icon: FileEdit,
    name: "Your Template, Your Voice",
    desc: "Write your reminder message once. Ibn Sina uses it every time, with the patient's name filled in automatically.",
  },
  {
    icon: Stethoscope,
    name: "Built for Solo Practice",
    desc: "No enterprise bloat. No per-seat pricing. One doctor, one tool, one flat fee.",
  },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight text-[#007AFF]">
            Ibn Sina
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-semibold bg-[#007AFF] text-white px-4 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-[90vh] flex items-center justify-center px-6 pt-14">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-[#007AFF] mb-6">
              Clinic Management · Re-imagined
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-8">
              The clinic tool{" "}
              <Highlight color="#007AFF" bg="rgba(0,122,255,0.08)">
                doctors
              </Highlight>{" "}
              actually{" "}
              <Highlight color="#f5a623" bg="rgba(245,166,35,0.08)">
                love
              </Highlight>{" "}
              using.
            </h1>
            <p className="text-lg text-[#6b6a63] dark:text-[#8e8d86] max-w-xl mx-auto mb-10 leading-relaxed">
              Ibn Sina handles your paperwork, your patient history, and your
              reminders — so you can focus on what matters.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                id="hero-cta-primary"
                className="bg-[#007AFF] text-white text-base font-semibold px-8 py-3 rounded-lg shadow-md hover:bg-[#0062cc] transition-all hover:shadow-lg active:scale-95"
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="text-base font-medium text-[#6b6a63] dark:text-[#8e8d86] hover:text-[#007AFF] transition-colors"
              >
                See how it works ↓
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-6 border-y border-black/6 dark:border-white/6">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86] tracking-wide">
            Built for solo doctors and private clinics · Trusted by practitioners across the region
          </p>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Everything in one place.
            </h2>
            <p className="text-[#6b6a63] dark:text-[#8e8d86]">
              Your queue, your patients, your reminders — live.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="relative"
          >
            {/* macOS chrome */}
            <div
              className="rounded-2xl overflow-hidden border border-black/10 dark:border-white/10"
              style={{
                boxShadow: "0 0 60px 10px rgba(0,122,255,0.12), 0 24px 60px rgba(0,0,0,0.15)",
              }}
            >
              {/* Title bar */}
              <div className="bg-[#e8e7e0] dark:bg-[#2a2a28] px-4 py-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febb2c]" />
                <span className="w-3 h-3 rounded-full bg-[#34c759]" />
                <div className="ml-4 flex-1 bg-[#f0efea] dark:bg-[#1c1c1a] rounded-md px-3 py-1 text-xs text-[#6b6a63] dark:text-[#8e8d86] max-w-xs mx-auto text-center">
                  ibnsina.app/dashboard
                </div>
              </div>
              {/* Dashboard mockup */}
              <div className="bg-[#1c1c1e] p-6 min-h-64">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[
                    { label: "Today's Queue", sub: "3 patients waiting" },
                    { label: "WhatsApp Ready", sub: "1 reminder pending", accent: true },
                    { label: "Recent Patients", sub: "5 seen recently" },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 ${c.accent ? "bg-[#007AFF]/10 border border-[#007AFF]/30" : "bg-white/5"}`}
                    >
                      <p className="text-xs text-white/50 mb-2">{c.label}</p>
                      <div className="h-2 bg-white/10 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-white/10 rounded w-1/2" />
                      <p className="text-xs text-white/30 mt-3">{c.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[85, 65, 45, 70].map((w, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-[#007AFF]/30 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2 bg-white/15 rounded" style={{ width: `${w}%` }} />
                        <div className="h-2 bg-white/8 rounded w-1/3" />
                      </div>
                      <div className="w-16 h-6 rounded-full bg-[#007AFF]/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
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
              Less admin. More medicine.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" as const },
                  },
                }}
                className="bg-[#f0efea] dark:bg-[#1c1c1a] border border-black/8 dark:border-white/8 rounded-xl p-6 hover:border-[#007AFF]/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#007AFF]/10 flex items-center justify-center mb-4 group-hover:bg-[#007AFF]/15 transition-colors">
                  <f.icon className="w-5 h-5 text-[#007AFF]" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.name}</h3>
                <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86] leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
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
              Every feature exists because it saves you time,<br />
              or it doesn&apos;t exist at all.
            </p>
            <p className="mt-4 italic text-[#6b6a63] dark:text-[#8e8d86]">
              We believe the best tool is the one you forget you&apos;re using —<br />
              because it just works.
            </p>
          </div>
        </motion.div>
      </section>

      {/* PRICING */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              One plan. One price. Everything included.
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            className="max-w-sm mx-auto"
          >
            <div className="bg-[#f0efea] dark:bg-[#1c1c1a] border border-black/10 dark:border-white/10 rounded-2xl p-8 text-center shadow-sm">
              <p className="text-5xl font-bold tracking-tight mb-1">
                $8
                <span className="text-xl font-normal text-[#6b6a63] dark:text-[#8e8d86]">
                  {" "}/ month
                </span>
              </p>
              <p className="text-sm text-[#6b6a63] dark:text-[#8e8d86] mb-8">
                Everything included, no surprises.
              </p>
              <ul className="space-y-3 text-sm text-left mb-8">
                {[
                  "Unlimited patients",
                  "Full visit history",
                  "Queue management",
                  "WhatsApp reminders",
                  "Settings & templates",
                  "Future updates included",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-[#007AFF] font-bold text-base">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                id="pricing-cta"
                className="block w-full bg-[#007AFF] text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-[#0062cc] transition-all shadow-md hover:shadow-lg active:scale-95 text-center"
              >
                Start Free Trial
              </Link>
              <p className="text-xs text-[#6b6a63] dark:text-[#8e8d86] mt-4">
                No contracts. Cancel anytime.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/6 dark:border-white/6 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <p className="font-bold text-lg tracking-tight text-[#007AFF]">
               Ibn Sina
              </p>
              <p className="text-xs text-[#6b6a63] dark:text-[#8e8d86] mt-1">
                © 2025 Ibn Sina. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-[#6b6a63] dark:text-[#8e8d86]">
              <a href="#" className="hover:text-[#007AFF] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#007AFF] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#007AFF] transition-colors">Contact</a>
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
