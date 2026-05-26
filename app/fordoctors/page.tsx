

import Link from "next/link";
import { 
  Stethoscope, 
  Star, 
  Shield, 
  ArrowRight, 
  Award, 
  Users, 
  CheckCircle2,
  TrendingUp,
  QrCode,
  Sparkles,
  ArrowUpRight,
  LayoutDashboard,
  Settings,
  Activity,
  Clock,
  PlusCircle,
  MoreHorizontal,
  GripVertical,
  MessageSquare
} from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import { PublicNav } from "@/components/public/public-nav";
import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Doctors | mermer",
  description: "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
};

export default async function LandingPage() {
  const { t, dir, lang } = await getServerI18n();

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1">
        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/50 dark:border-zinc-900 bg-white dark:bg-zinc-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(#0055ff_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column: Hero Text */}
              <div className="lg:col-span-7 text-start space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-primary text-xs font-bold border border-blue-100 dark:border-blue-900/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  {dir === "rtl" ? "منصة الأطباء المهنية الأولى" : "The #1 Professional Doctor Platform"}
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                  {dir === "rtl" ? (
                    <>
                      أنشئ ملفك الطبي <span className="text-primary block sm:inline">المهني والذهبي.</span>
                    </>
                  ) : (
                    <>
                      Grow Your Medical Practice. <span className="text-primary">Earn Patient Trust.</span>
                    </>
                  )}
                </h1>
                
                <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                  {dir === "rtl" ? (
                    "مرمر تمنح الأطباء ملفات تعريفية موثقة ومميزة، لجمع وإدارة تقييمات المرضى وبناء سمعة رقمية لا تضاهى."
                  ) : (
                    "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation."
                  )}
                </p>

                <div className="pt-4 flex flex-wrap gap-4 items-center">
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded bg-primary hover:bg-primary/95 text-white font-bold text-sm shadow-md shadow-primary/10 transition-all hover:-translate-y-0.5"
                  >
                    {dir === "rtl" ? "سجل كطبيب الآن" : "Register as a Doctor"}
                    <ArrowRight className={dir === "rtl" ? "rotate-180 w-4 h-4" : "w-4 h-4"} />
                  </Link>
                  <Link
                    href="tel:+201012756994"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 font-bold text-sm transition-all"
                  >
                    {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
                  </Link>
                </div>

              </div>

              {/* Right Column: Dashboard UI Skeleton Mockup */}
              <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                <div className="absolute inset-0 bg-linear-to-tr from-blue-500/10 to-transparent blur-3xl rounded-full" />
                
                <div className="relative w-full max-w-115 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex h-100">
                  
                  {/* Sidebar Skeleton */}
                  <div className="w-14 sm:w-36 bg-slate-50 dark:bg-zinc-900 border-e border-slate-200/80 dark:border-zinc-800 flex flex-col pt-5 pb-4">
                    {/* Fake Logo */}
                    <div className="flex items-center gap-3 px-4 mb-8">
                      <div className="w-6 h-6 rounded bg-primary/20 shrink-0" />
                      <div className="h-3 w-16 bg-slate-200 dark:bg-zinc-800 rounded hidden sm:block" />
                    </div>

                    {/* Nav Items */}
                    <div className="space-y-4 px-4 hidden sm:block">
                      <div className="h-3 w-full bg-primary/20 rounded" />
                      <div className="h-3 w-4/5 bg-slate-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-5/6 bg-slate-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded" />
                    </div>
                    {/* Mobile nav skeletons */}
                    <div className="space-y-5 px-4 sm:hidden flex flex-col items-center">
                      <div className="w-5 h-5 rounded bg-primary/20" />
                      <div className="w-5 h-5 rounded bg-slate-200 dark:bg-zinc-800" />
                      <div className="w-5 h-5 rounded bg-slate-200 dark:bg-zinc-800" />
                    </div>
                  </div>

                  {/* Main Content Area Skeleton */}
                  <div className="flex-1 bg-white dark:bg-zinc-950 p-5 overflow-hidden flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-zinc-800 rounded" />
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800" />
                    </div>

                    {/* Content skeletons */}
                    <div className="space-y-4 flex-1">
                      {/* Stat cards mock */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-20 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg" />
                        <div className="h-20 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg" />
                      </div>

                      {/* Main panel mock */}
                      <div className="flex-1 h-full min-h-35 w-full bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg flex flex-col p-4 gap-3">
                         <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded mb-2" />
                         <div className="h-10 w-full bg-white dark:bg-zinc-950 rounded-md border border-slate-100 dark:border-zinc-800/80" />
                         <div className="h-10 w-full bg-white dark:bg-zinc-950 rounded-md border border-slate-100 dark:border-zinc-800/80" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── COMBINED FEATURES & VALUE PROPOSITION SECTION ── */}
        <section className="py-24 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200/50 dark:border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="text-primary text-xs font-extrabold uppercase tracking-widest px-3 py-1 bg-primary/10 rounded-full">
                {dir === "rtl" ? "لماذا تختار مرمر؟" : "Why Choose mermer?"}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                {dir === "rtl" ? "صممنا المنصة لتوفير وقتك، مالك، ومضاعفة نجاح عيادتك" : "Built to Save You Time, Money, and Grow Your Clinic"}
              </h2>
              <p className="text-slate-600 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
                {dir === "rtl" 
                  ? "تتجاوز مرمر فكرة الحجوزات البسيطة لتركز بالكامل على تعزيز جودة الخدمة، توفير التكاليف، وتقديم منصة احترافية لعرض إنجازات الطبيب."
                  : "mermer shifts focus from pure booking engines to robust healthcare reputation tools that save resources and build trust."}
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
              
              {/* 1. Save Time */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "سنوفر وقتك الثمين من خلال..." : "We Will Save You Time By..."}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "بيانات جاهزة:" : "Pre-loaded Data:"}</strong> {dir === "rtl" ? "قاعدة بيانات تضم أكثر الأدوية شيوعاً في مصر جاهزة للاستخدام الفوري." : "Access top Egyptian medications instantly without manual entry."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "الاستقبال الذكي (QR):" : "Smart QR Reception:"}</strong> {dir === "rtl" ? "تسجيل وصول المرضى وتقييمهم بسرعة عبر مسح رمز QR." : "Fast patient check-ins and reviews via simple QR scans."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "إدارة مرنة للبيانات:" : "CSV Management:"}</strong> {dir === "rtl" ? "استيراد وتصدير بيانات المرضى والأدوية بسهولة عبر ملفات CSV." : "Import and export patient records easily via CSV files."}</span>
                  </li>
                </ul>
              </div>

              {/* 2. Save Money & Reduce No-Shows */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "سنوفر أموالك ونقلل الغياب من خلال..." : "We Will Save You Money By..."}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <MessageSquare className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "تذكيرات الواتساب التلقائية:" : "Automated WhatsApp Reminders:"}</strong> {dir === "rtl" ? "تذكير مرضاك تلقائياً بمواعيدهم لتقليل نسبة التخلف عن الحضور بنسبة هائلة وحماية دخل العيادة." : "Automatically remind patients of their appointments to slash no-show rates and protect your revenue."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "حضور رقمي متكامل:" : "All-in-One Digital Presence:"}</strong> {dir === "rtl" ? "احصل على ملف تعريفي احترافي يغنيك عن تكاليف إنشاء موقع إلكتروني خاص." : "Get a premium profile without the high cost of a custom website."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "بدون رسوم خفية:" : "No Hidden Fees:"}</strong> {dir === "rtl" ? "تسعير واضح وشفاف لجميع الميزات الأساسية دون مفاجآت." : "Transparent pricing with no surprise charges."}</span>
                  </li>
                </ul>
              </div>

              {/* 3. SEO & Reputation */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "سنعزز سمعتك الطبية وتصدرك للبحث من خلال..." : "We Will Boost Your SEO & Reputation By..."}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "ملفات محسنة لمحركات البحث (SEO):" : "SEO-Optimized Profiles:"}</strong> {dir === "rtl" ? "الظهور في النتائج الأولى على جوجل عندما يبحث المرضى عن اسمك أو تخصصك." : "Rank higher on Google when patients search for your name."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "تقييمات موثقة وحقيقية:" : "Verified Authentic Reviews:"}</strong> {dir === "rtl" ? "بناء الثقة مع المرضى الجدد من خلال عرض تقييمات موثوقة ومنع المراجعات الوهمية." : "Build trust with verified feedback, eliminating fake reviews."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "خرائط مواقع ديناميكية:" : "Dynamic Sitemaps:"}</strong> {dir === "rtl" ? "أرشفة تلقائية وفورية لصفحتك لضمان وصول روبوتات البحث إليها بسرعة." : "Automated sitemap generation ensures bots crawl your profile instantly."}</span>
                  </li>
                </ul>
              </div>

              {/* 4. Security & Performance */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {dir === "rtl" ? "سنحمي بياناتك ونقدم أداء فائقاً من خلال..." : "We Will Secure Data & Provide Blazing Speed By..."}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "توافق صارم مع الخصوصية:" : "Top-Tier Privacy:"}</strong> {dir === "rtl" ? "الامتثال الكامل لقانون حماية البيانات المصري لحماية سجلاتك ومرضاك." : "Full compliance with Data Protection Laws to secure medical records."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "بنية تحتية متطورة وسريعة:" : "Edge-Optimized Infrastructure:"}</strong> {dir === "rtl" ? "مبنية على أحدث تقنيات (Next.js & Convex) لضمان سرعة فائقة ومزامنة فورية للبيانات." : "Built on Next.js & Convex for instant page loads and real-time sync."}</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-zinc-400">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span><strong className="text-slate-900 dark:text-zinc-200">{dir === "rtl" ? "دعم ثنائي اللغة:" : "Native Bilingual Support:"}</strong> {dir === "rtl" ? "تجربة سلسة باللغتين العربية والإنجليزية دون تأخير أو إعادة تحميل للصلفحة." : "Zero-lag switching between Arabic and English with full RTL support."}</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS SECTION HIDDEN ── */}

        {/* ── CALL TO ACTION BANNER (Inspired by LearnHub ready to start block) ── */}
        <section className="py-16 bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-8 sm:p-12 shadow-lg text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-tr from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "هل أنت مستعد لتعزيز سمعتك الطبية الرقمية؟" : "Ready to Build Your Digital Clinic?"}
                </h2>
                <p className="text-slate-600 dark:text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                  {dir === "rtl" ? "انضم إلى آلاف الأطباء المسجلين اليوم وابدأ في جمع التقييمات الحقيقية." : "Create your doctor profile today, claim your unique link, and let patients share verified experiences."}
                </p>

                <div className="flex flex-wrap gap-4 justify-center pt-2">
                  <Link
                    href="/sign-in"
                    className="px-6 py-3 bg-primary hover:bg-primary/95 text-white font-bold text-sm rounded shadow-md shadow-primary/10 transition-colors"
                  >
                    {dir === "rtl" ? "سجل كطبيب الآن" : "Register as a Doctor"}
                  </Link>
                  <Link
                    href="tel:+201012756994"
                    className="px-6 py-3 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 font-bold text-sm rounded transition-colors"
                  >
                    {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
                  </Link>
                </div>

                <div className="flex gap-6 justify-center items-center pt-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {dir === "rtl" ? "بدون رسوم مخفية" : "No hidden charges"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {dir === "rtl" ? "تفعيل فوري للملف" : "Instant profile activation"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white dark:bg-zinc-950 border-t border-slate-200/80 dark:border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <Image src="/icon.svg" alt="mermer" width={100} height={32} className="h-8 w-auto mb-4" />
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                {dir === "rtl" 
                  ? "منصة متكاملة لجمع وإدارة مراجعات المرضى للأطباء والعيادات بكفاءة وأمان كامل."
                  : "Complete platform to gather and manage verified patient reviews for modern medical practices safely."}
              </p>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-4">{dir === "rtl" ? "روابط سريعة" : "Quick Links"}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="tel:+201012756994" className="text-slate-500 hover:text-primary transition-colors">
                    {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="text-slate-500 hover:text-primary transition-colors">
                    {dir === "rtl" ? "سجل كطبيب" : "Register as Doctor"}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-4">{dir === "rtl" ? "قانوني" : "Legal"}</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/privacy" className="text-slate-500 hover:text-primary transition-colors">
                    {t("landing.privacy")}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-slate-500 hover:text-primary transition-colors">
                    {t("landing.terms")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-4">{dir === "rtl" ? "الدعم" : "Support"}</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {dir === "rtl" ? "لديك استفسار؟ تواصل مع طاقم الدعم السريري الخاص بنا عبر قنوات الدعم. واتصل بنا على +201023456789" : "Need help? Contact our clinical helper staff via support channels. Give us a call on +201023456789"}
              </p>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-zinc-900/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <span>
              © {new Date().getFullYear()} {dir === "rtl" ? "مرمر. جميع الحقوق محفوظة." : "mermer. All rights reserved."}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
