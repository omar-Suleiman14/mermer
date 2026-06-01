import Link from "next/link";
import { ArrowRight, Clock, TrendingUp, Star, ShieldCheck, Sparkles, CheckCircle2, QrCode, Search } from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import dynamic from "next/dynamic";
import { AnimatedReveal } from "@/components/public/animated-reveal";
import Image from "next/image";
import { Metadata } from "next";

const PublicNav = dynamic(() => import("@/components/public/public-nav").then((m) => m.PublicNav));

export const metadata: Metadata = {
  title: "For Doctors | mermer",
  description: "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
  alternates: { canonical: "https://mermereg.com/fordoctors" },
};

export default async function ForDoctorsLandingPage() {
  const { t, dir } = await getServerI18n();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-white dark:bg-black text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 w-full max-w-[1400px] mx-auto overflow-hidden">
        
        {/* 1. Hero Section (Asymmetric Split) */}
        <section className="relative px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-3.5rem)] flex items-center py-12 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left Col: Copy & CTAs */}
            <div className="max-w-2xl">
              <AnimatedReveal>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-semibold tracking-wide border border-slate-200 dark:border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {dir === "rtl" ? "منصة الأطباء المهنية الأولى" : "The #1 Professional Doctor Platform"}
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tighter leading-[1.05] text-slate-900 dark:text-white">
                  {dir === "rtl" ? (
                    <>ابنِ سمعتك الرقمية. <br /><span className="text-primary">وضاعف نجاح عيادتك.</span></>
                  ) : (
                    <>Build Your Digital Reputation. <br /><span className="text-primary">Grow Your Clinic.</span></>
                  )}
                </h1>
              </AnimatedReveal>

              <AnimatedReveal delay={0.1}>
                <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-[45ch] leading-relaxed">
                  {dir === "rtl" ? (
                    "مرمر تمنح الأطباء ملفات تعريفية موثقة ومميزة، لجمع وإدارة تقييمات المرضى وبناء سمعة رقمية لا تضاهى."
                  ) : (
                    "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation."
                  )}
                </p>
              </AnimatedReveal>

              <AnimatedReveal delay={0.2}>
                <div className="mt-8 flex flex-wrap gap-4 items-center">
                  <Link
                    href="/sign-in"
                    prefetch={true}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-white transition-all hover:bg-primary/90 hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20"
                  >
                    {dir === "rtl" ? "سجل كطبيب الآن" : "Register as a Doctor"}
                    <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${dir === "rtl" ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
                  </Link>
                  <Link
                    href="tel:+201012756994"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-8 text-base font-medium text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
                  >
                    {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
                  </Link>
                </div>
              </AnimatedReveal>
            </div>

            {/* Right Col: UI Mock (Abstract Premium Aesthetic) */}
            <AnimatedReveal delay={0.3} direction="left" className="relative lg:h-[500px] flex items-center justify-center">
              {/* Soft abstract background blob */}
              <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] w-3/4 h-3/4 m-auto" />
              
              <div className="relative w-full max-w-md bg-slate-50/60 dark:bg-zinc-900/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-4 shadow-2xl shadow-primary/5 overflow-hidden flex flex-col h-[450px]">
                
                {/* Mock Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/5 mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">د</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">Dashboard</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">Dr. Sarah Mansour</div>
                    </div>
                  </div>
                </div>

                {/* Mock Content */}
                <div className="flex-1 flex flex-col gap-3 overflow-hidden px-2 pb-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Today's Visits</div>
                      <div className="font-semibold text-2xl text-slate-900 dark:text-white">24</div>
                    </div>
                    <div className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mb-1">Total Reviews</div>
                      <div className="font-semibold text-2xl text-primary flex items-center gap-1">
                        4.9 <Star className="w-4 h-4 fill-primary text-primary" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm mt-1 flex flex-col">
                     <div className="text-xs font-semibold text-slate-900 dark:text-white mb-3">Live Queue</div>
                     <div className="flex-1 flex flex-col gap-2">
                       {[1, 2, 3].map((i) => (
                         <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-zinc-300">
                               #{i}
                             </div>
                             <div className="h-2.5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                           </div>
                           {i === 1 && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                         </div>
                       ))}
                     </div>
                  </div>
                </div>

              </div>
            </AnimatedReveal>
          </div>
        </section>

        {/* 2. Trust Metrics */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 border-y border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-900/20">
          <div className="flex flex-wrap justify-center gap-12 md:gap-24">
            <div className="flex items-center gap-3 text-center sm:text-start flex-col sm:flex-row">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="font-semibold text-xl text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "موثوقية تامة" : "Full Reliability"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {dir === "rtl" ? "امتثال كامل للخصوصية" : "Complete privacy compliance"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-center sm:text-start flex-col sm:flex-row">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <div className="font-semibold text-xl text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "نمو مستدام" : "Sustainable Growth"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {dir === "rtl" ? "زيادة في عدد المرضى الجدد" : "Increase in new patients"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Bento Grid Features */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="mb-16 max-w-2xl text-center sm:text-start">
            <AnimatedReveal>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white">
                {dir === "rtl" ? "كل ما تحتاجه لإدارة عيادتك باحترافية." : "Everything you need to manage your clinic professionally."}
              </h2>
            </AnimatedReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
            {/* Cell 1: Time Saving (Spans 2 cols on md) */}
            <AnimatedReveal delay={0.1} className="md:col-span-2 relative rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 overflow-hidden p-8 md:p-10 flex flex-col justify-between">
              <div className="relative z-10 max-w-lg">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "وفر وقتك الثمين" : "Save Your Valuable Time"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400 mb-6">
                  {dir === "rtl" 
                    ? "استقبال ذكي عبر مسح رمز QR لتسجيل المرضى بسرعة. وقاعدة بيانات جاهزة لأشهر الأدوية للاستخدام الفوري." 
                    : "Smart reception via QR code scanning for fast patient check-in. Pre-loaded database of top medications for instant use."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <QrCode className="w-3.5 h-3.5" /> Smart QR Reception
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-black border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pre-loaded Meds
                  </span>
                </div>
              </div>
            </AnimatedReveal>

            {/* Cell 2: SEO & Reputation */}
            <AnimatedReveal delay={0.2} className="relative rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/10 overflow-hidden p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "تعزيز السمعة والـ SEO" : "Boost Reputation & SEO"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {dir === "rtl" 
                    ? "ظهور في النتائج الأولى على جوجل مع تقييمات موثقة وحقيقية من مرضاك." 
                    : "Rank higher on Google with verified and authentic reviews from your patients."}
                </p>
              </div>
            </AnimatedReveal>

            {/* Cell 3: Revenue Protection */}
            <AnimatedReveal delay={0.3} className="relative rounded-3xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 overflow-hidden p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "حماية دخل العيادة" : "Protect Clinic Revenue"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {dir === "rtl" 
                    ? "تقليل نسبة الغياب بفضل تذكيرات الواتساب التلقائية والمتابعة اللحظية للمرضى." 
                    : "Reduce no-show rates with automated WhatsApp reminders and live patient tracking."}
                </p>
              </div>
            </AnimatedReveal>

            {/* Cell 4: Security (Spans 2 cols on md) */}
            <AnimatedReveal delay={0.4} className="md:col-span-2 relative rounded-3xl bg-slate-900 dark:bg-zinc-950 border border-slate-800 dark:border-white/10 overflow-hidden p-8 md:p-10 flex flex-col justify-between text-white">
              <div className="relative z-10 max-w-lg">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  {dir === "rtl" ? "حماية كاملة للبيانات" : "Complete Data Protection"}
                </h3>
                <p className="text-slate-400">
                  {dir === "rtl" 
                    ? "نمتثل لأعلى معايير الخصوصية لضمان أمان سجلات مرضاك الطبية." 
                    : "We comply with the highest privacy standards to ensure the security of your patients' medical records."}
                </p>
              </div>
            </AnimatedReveal>
          </div>
        </section>

        {/* 4. Final CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 mb-12">
          <AnimatedReveal className="max-w-4xl mx-auto text-center bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-white/5 rounded-[3rem] p-12 md:p-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-tr from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mb-6">
                {dir === "rtl" ? "مستعد لرقمنة عيادتك؟" : "Ready to digitize your clinic?"}
              </h2>
              <p className="text-slate-600 dark:text-zinc-400 mb-8 max-w-lg mx-auto">
                {dir === "rtl" 
                  ? "انضم إلى الأطباء الرائدين الذين يثقون في مرمر لإدارة سمعتهم وحجوزاتهم."
                  : "Join leading doctors who trust mermer to manage their reputation and bookings."}
              </p>
              <Link
                href="/sign-in"
                prefetch={true}
                className="inline-flex h-14 items-center justify-center rounded-full bg-slate-900 dark:bg-white px-10 text-base font-medium text-white dark:text-black transition-transform hover:scale-[0.98] active:scale-95"
              >
                {dir === "rtl" ? "سجل كطبيب الآن" : "Register as a Doctor"}
              </Link>
            </div>
          </AnimatedReveal>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 dark:border-white/5 bg-white dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/icon.svg" alt="mermer" width={24} height={24} className="w-6 h-6" />
            <span className="font-semibold text-lg tracking-tight">mermer</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-zinc-500">
            <Link href="/privacy" className="hover:text-primary transition-colors">{t("landing.privacy")}</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">{t("landing.terms")}</Link>
            <span>© {new Date().getFullYear()} {dir === "rtl" ? "جميع الحقوق محفوظة." : "All rights reserved."}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
