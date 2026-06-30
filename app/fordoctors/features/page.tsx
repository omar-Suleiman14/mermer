import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  FileText,
  CalendarDays,
  CreditCard,
  BarChart3,
  Pill,
  CalendarClock,
  PenLine,
  Globe,
  Monitor,
  Users,
  Zap,
  ClipboardList,
  Paperclip,
  HeartPulse,
  UserCircle,
  GitMerge,
  ShieldCheck,
  Smartphone,
  Palette,
  Languages,
  Moon,
  Bell,
  Infinity,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AnimatedReveal } from "@/components/public/animated-reveal";
import { Metadata } from "next";

const PublicNav = dynamic(() =>
  import("@/components/public/public-nav").then((m) => m.PublicNav)
);

export const metadata: Metadata = {
  title: "Features | mermer",
  description:
    "Everything mermer gives your clinic — from automated WhatsApp reminders to full medical records, financial closing, and more.",
  alternates: { canonical: "https://mermereg.com/fordoctors/features" },
};

const TIERS = [
  {
    tier: "Tier 1",
    label: "Daily Essentials",
    description: "What every clinic needs from day one.",
    color: "blue",
    features: [
      {
        icon: MessageCircle,
        title: "Automated WhatsApp Messages & Reminders",
        description:
          "Send confirmations, reminders, and follow-ups straight from the clinic's own WhatsApp number — no manual calling, no per-message fees.",
        bullets: [
          "Instant confirmation the moment a booking is made",
          "Reminder before the appointment",
          "Live queue updates so patients know when to show up",
          "Follow-up reminders after a visit",
          "Installment due-date reminders",
          "Automatic confirmation when a patient books online",
        ],
        badge: "Included — no extra charge",
        highlight: true,
      },
      {
        icon: FileText,
        title: "Patient History (Full Medical Record)",
        description:
          "A complete digital file for every patient — every visit, every note, instantly searchable. No more paper folders, no more lost records.",
      },
      {
        icon: CalendarDays,
        title: "Schedule & Queue Management",
        description:
          "Book and manage the day's appointments and the waiting-room queue from a single screen.",
      },
      {
        icon: CreditCard,
        title: "Installment Management",
        description:
          "Track payment plans, down payments, and outstanding balances per patient — built around how Egyptian clinics actually bill.",
      },
      {
        icon: BarChart3,
        title: "Financial Calculations & Daily Closing",
        description:
          "Automatic revenue totals and shift closing, plus patient-level financial breakdowns — know exactly how the day went without doing it by hand.",
      },
      {
        icon: Pill,
        title: "Medications & Prescriptions",
        description:
          "Manage medications and print professional prescriptions in seconds.",
      },
    ],
  },
  {
    tier: "Tier 2",
    label: "Smooths Out the Day-to-Day",
    description: "Tools that reduce friction once the basics are running.",
    color: "violet",
    features: [
      {
        icon: CalendarClock,
        title: "Rescheduling",
        description:
          "Move, swap, or delay any appointment in a couple of taps.",
      },
      {
        icon: PenLine,
        title: "Customizable WhatsApp Templates",
        description:
          "Edit the wording of every automated message so it sounds like the clinic — not a generic bot.",
      },
      {
        icon: Globe,
        title: "Online Booking Link",
        description:
          "Patients book themselves through a link; confirmation goes out over WhatsApp automatically.",
      },
      {
        icon: Monitor,
        title: "Clinic Screen",
        description:
          "A waiting-room display that calls patients by name or number on its own — nobody has to shout across the room.",
      },
      {
        icon: Users,
        title: "Staff Roles & Permissions",
        description:
          "Add secretaries and assistants with exactly the access they need. Keep financial data restricted if you want.",
      },
      {
        icon: Zap,
        title: "Real-Time Sync",
        description:
          "A change made at the front desk shows up on the doctor's phone instantly — no refreshing needed.",
      },
    ],
  },
  {
    tier: "Tier 3",
    label: "Extra Depth & Growth Tools",
    description: "Useful once the clinic has volume and a team.",
    color: "emerald",
    features: [
      {
        icon: ClipboardList,
        title: "Audit Logs & Staff Signatures",
        description:
          "A timestamped record of who added, edited, or deleted what — useful once you have more than one person on staff.",
      },
      {
        icon: Paperclip,
        title: "Attachments & Lab Results",
        description:
          "Upload X-rays, lab results, and documents directly into a patient's file.",
      },
      {
        icon: HeartPulse,
        title: "Vitals & Measurements Tracking",
        description:
          "Log blood pressure, weight, glucose, and other vitals at every visit.",
      },
      {
        icon: UserCircle,
        title: "Doctor's Public Profile",
        description:
          "A shareable page with the doctor's bio, specialty, address, and hours, with a booking link built in.",
      },
      {
        icon: GitMerge,
        title: "Merge Duplicate Patients",
        description:
          "Clean up accidental double entries by merging them into one record without losing any history.",
      },
    ],
  },
  {
    tier: "Tier 4",
    label: "Platform Quality",
    description: "The foundation everything else is built on.",
    color: "orange",
    features: [
      {
        icon: ShieldCheck,
        title: "Fast & Secure",
        description:
          "Built on modern infrastructure for quick load times and properly protected patient data.",
      },
      {
        icon: Smartphone,
        title: "Feels Like a Native App (PWA)",
        description:
          "Installs straight to the home screen and behaves like a real mobile app.",
      },
      {
        icon: Palette,
        title: "Polished, Modern Interface",
        description:
          "Clean, intuitive design that doesn't need a manual.",
      },
      {
        icon: Languages,
        title: "Full Arabic Support (RTL)",
        description:
          "Built Arabic-first, not translated — correct right-to-left layout throughout.",
      },
      {
        icon: Moon,
        title: "Dark & Light Mode",
        description: "Switch themes depending on lighting or time of day.",
      },
      {
        icon: Bell,
        title: "Push Notifications",
        description:
          "Real-time alerts the moment something changes or a new booking comes in.",
      },
      {
        icon: Infinity,
        title: "No Limits",
        description:
          "Unlimited patients, unlimited cloud storage, no hidden caps.",
      },
      {
        icon: Headphones,
        title: "24/7 Support",
        description:
          "Help is available around the clock if something breaks.",
      },
    ],
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string; dot: string; pill: string }> = {
  blue: {
    bg: "bg-blue-500/8 dark:bg-blue-500/12",
    border: "border-blue-500/15 dark:border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    dot: "bg-blue-500",
    pill: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  violet: {
    bg: "bg-violet-500/8 dark:bg-violet-500/12",
    border: "border-violet-500/15 dark:border-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
    dot: "bg-violet-500",
    pill: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  emerald: {
    bg: "bg-emerald-500/8 dark:bg-emerald-500/12",
    border: "border-emerald-500/15 dark:border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  orange: {
    bg: "bg-orange-500/8 dark:bg-orange-500/12",
    border: "border-orange-500/15 dark:border-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
    dot: "bg-orange-500",
    pill: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
};

export default async function FeaturesPage() {
  const { dir } = await getServerI18n();

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-black text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 w-full max-w-350 mx-auto overflow-hidden">

        {/* Hero */}
        <section className="px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">
          <AnimatedReveal>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-xs font-semibold tracking-wide border border-slate-200 dark:border-white/10">
              25 features · 4 tiers
            </div>
            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter text-slate-900 dark:text-white leading-[1.05] max-w-4xl mx-auto">
              Everything your clinic needs.{" "}
              <span className="text-primary">Nothing it doesn't.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Ranked from what a small clinic actually needs from day one, down to general platform polish.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="tel:+201035555282"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-8 text-sm font-semibold text-slate-700 dark:text-zinc-300 transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
              >
                Talk to Sales
              </Link>
            </div>
          </AnimatedReveal>
        </section>

        {/* Quick Tier Navigation */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <AnimatedReveal>
            <div className="flex flex-wrap justify-center gap-3">
              {TIERS.map((tier) => {
                const c = colorMap[tier.color];
                return (
                  <a
                    key={tier.tier}
                    href={`#${tier.tier.toLowerCase().replace(" ", "-")}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all hover:scale-[0.97] ${c.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {tier.tier} — {tier.label}
                  </a>
                );
              })}
            </div>
          </AnimatedReveal>
        </section>

        {/* Tiers */}
        {TIERS.map((tier, ti) => {
          const c = colorMap[tier.color];
          return (
            <section
              key={tier.tier}
              id={tier.tier.toLowerCase().replace(" ", "-")}
              className="px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20"
            >
              {/* Tier Header */}
              <AnimatedReveal>
                <div className="flex items-center gap-4 mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold tracking-wider uppercase ${c.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {tier.tier}
                  </span>
                  <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                </div>
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-2">
                  {tier.label}
                </h2>
                <p className="text-slate-500 dark:text-zinc-400 text-base mb-10">
                  {tier.description}
                </p>
              </AnimatedReveal>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {tier.features.map((feature, fi) => {
                  const Icon = feature.icon;
                  return (
                    <AnimatedReveal key={fi} delay={fi * 0.05}>
                      <div
                        className={`relative h-full rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                          (feature as any).highlight
                            ? "md:col-span-2 lg:col-span-2 bg-slate-900 dark:bg-zinc-950 border-slate-800 dark:border-white/10 text-white"
                            : `${c.bg} ${c.border}`
                        }`}
                      >
                        {(feature as any).badge && (
                          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20">
                            {(feature as any).badge}
                          </span>
                        )}

                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                            (feature as any).highlight
                              ? "bg-white/10"
                              : `${c.bg} border ${c.border}`
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              (feature as any).highlight ? "text-white" : c.text
                            }`}
                          />
                        </div>

                        <div>
                          <h3
                            className={`text-base font-semibold mb-1.5 ${
                              (feature as any).highlight
                                ? "text-white"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {feature.title}
                          </h3>
                          <p
                            className={`text-sm leading-relaxed ${
                              (feature as any).highlight
                                ? "text-slate-400"
                                : "text-slate-500 dark:text-zinc-400"
                            }`}
                          >
                            {feature.description}
                          </p>
                        </div>

                        {(feature as any).bullets && (
                          <ul className="flex flex-col gap-2 mt-1">
                            {(feature as any).bullets.map((b: string, bi: number) => (
                              <li key={bi} className="flex items-start gap-2.5 text-sm text-slate-400">
                                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </AnimatedReveal>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Bottom CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 mb-12">
          <AnimatedReveal className="max-w-4xl mx-auto text-center bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-white/5 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-tr from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-slate-500 dark:text-zinc-400 mb-8 max-w-lg mx-auto">
                Join clinics already running on mermer. Setup takes minutes.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/sign-in"
                  className="inline-flex h-14 items-center gap-2 rounded-full bg-slate-900 dark:bg-white px-10 text-base font-semibold text-white dark:text-black transition-transform hover:scale-[0.98] active:scale-95"
                >
                  Register as a Doctor
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="tel:+201035555282"
                  className="inline-flex h-14 items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-10 text-base font-semibold text-slate-700 dark:text-zinc-300 transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </AnimatedReveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-white/5 bg-white dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-350 mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="mermer" width={24} height={24} className="w-6 h-6" />
            <span className="font-semibold text-lg tracking-tight">mermer</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-zinc-500">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/fordoctors" className="hover:text-primary transition-colors">For Doctors</Link>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
