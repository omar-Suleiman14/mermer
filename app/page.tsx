"use client";

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
import { useI18n } from "@/lib/i18n";
import { PublicNav } from "@/components/public/public-nav";

export default function LandingPage() {
  const { t, dir, lang } = useI18n();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50 dark:bg-zinc-950 text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1">
        {/* ── HERO SECTION ── */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/50 dark:border-zinc-900 bg-white dark:bg-zinc-900/40">
          <div className="absolute inset-0 bg-[radial-gradient(#0055ff_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
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
                    "Marmar empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation."
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

                {/* Micro Stats Row */}
                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-3 gap-6 max-w-md">
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">10k+</h4>
                    <p className="text-xs text-muted-foreground">{dir === "rtl" ? "طبيب مسجل" : "Registered Doctors"}</p>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">50k+</h4>
                    <p className="text-xs text-muted-foreground">{dir === "rtl" ? "تقييم حقيقي" : "Verified Reviews"}</p>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">100%</h4>
                    <p className="text-xs text-muted-foreground">{dir === "rtl" ? "آمن وموثوق" : "Safe & Secure"}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Dashboard UI Skeleton Mockup */}
              <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent blur-3xl rounded-full" />
                
                <div className="relative w-full max-w-[460px] bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex h-[400px]">
                  
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
                      <div className="flex-1 h-full min-h-[140px] w-full bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg flex flex-col p-4 gap-3">
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

        {/* ── STATS / CARD SECTION (Inspired by 'Explore Top-Rated Courses') ── */}
        <section className="py-20 bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div className="space-y-3">
              <span className="text-primary text-xs font-extrabold uppercase tracking-widest">{dir === "rtl" ? "الخدمات والمزايا" : "Features"}</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {dir === "rtl" ? "كل ما يلزم لسمعتك الطبية الرقمية" : "Everything Needed to Elevate Your Clinic"}
              </h2>
              <p className="text-slate-600 dark:text-zinc-400 text-sm sm:text-base max-w-xl mx-auto">
                {dir === "rtl" ? "تتبع تقييماتك، طور أسلوب رعايتك، وتواصل مع مرضاك بكل سهولة وسرعة." : "Grow patient outreach, review critical statistics, and keep clinical interactions professional."}
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Clock,
                  title: dir === "rtl" ? "تذكير المواعيد الذكي" : "Smart Appointment Reminders",
                  desc: dir === "rtl" ? "قم بتذكير المرضى بمواعيدهم عبر الواتساب وتقليل التخلف عن المواعيد." : "Remind patients of their appointments via WhatsApp and reduce no-shows.",
                  tag: dir === "rtl" ? "رئيسي" : "Core"
                },
                {
                  icon: Award,
                  title: dir === "rtl" ? "نظام تقييمات موثق" : "Verified Rating System",
                  desc: dir === "rtl" ? "اجمع تقييمات مرضاك مباشرة بطريقة آمنة لمنع التقييمات المزيفة." : "Collect authentic ratings directly to prevent fake reviews and spam.",
                  tag: dir === "rtl" ? "أمان" : "Security"
                },
                {
                  icon: QrCode,
                  title: dir === "rtl" ? "رمز QR مخصص للعيادة" : "Clinic QR Codes",
                  desc: dir === "rtl" ? "اطبع رمز QR مخصص لعيادتك لتمكين المرضى من التقييم السريع بلمسة." : "Print dedicated QR codes for your checkout counter to ease reviews.",
                  tag: dir === "rtl" ? "ذكي" : "Smart"
                },
                {
                  icon: TrendingUp,
                  title: dir === "rtl" ? "تحليلات وإحصاءات متقدمة" : "Advanced Analytics",
                  desc: dir === "rtl" ? "شاهد نمو سمعتك الطبية وتتبع مستوى رضا المرضى بأدوات ذكية." : "Analyze clinic reputation trends and patient satisfaction metrics with ease.",
                  tag: dir === "rtl" ? "إحصاءات" : "Analytics"
                }
              ].map((feat, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-6 shadow-sm text-start flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <feat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPOSITION SECTION (Inspired by 'Everything You Need to Succeed') ── */}
        <section className="py-20 border-t border-b border-slate-200/50 dark:border-zinc-900 bg-white dark:bg-zinc-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Features List */}
              <div className="text-start space-y-6">
                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-primary px-3 py-1 rounded">
                  {dir === "rtl" ? "لماذا تختار مرمر؟" : "Why Choose Marmar?"}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                  {dir === "rtl" ? "صممنا المنصة خصيصاً لتناسب احتياجات الأطباء والعيادات" : "Tailored Solutions Built for Clinic & Doctor Reputation"}
                </h2>
                <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {dir === "rtl" ? (
                    "تتجاوز مرمر فكرة الحجوزات البسيطة لتركز بالكامل على تعزيز جودة الخدمة وتقديم منصة احترافية لعرض إنجازات الطبيب وإعطاء المرضى صوتاً صادقاً وموثوقاً."
                  ) : (
                    "Marmar shifts focus from pure booking engines to robust healthcare reputation tools. Build a trustworthy connection between doctors and patients using transparent reviews."
                  )}
                </p>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  {[
                    dir === "rtl" ? "دعم كامل للغة العربية والإنجليزية" : "Full Arabic & English support",
                    dir === "rtl" ? "لوحة تحكم ذكية وشاملة للأطباء" : "Comprehensive doctor dashboard",
                    dir === "rtl" ? "حماية خصوصية بيانات المرضى" : "Highly secured data privacy",
                    dir === "rtl" ? "تتبع نمو رضا المراجعين" : "Follow patient satisfaction rates",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 dark:text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graphic/Stat Widget block */}
              <div className="bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-start">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dir === "rtl" ? "مجتمع طبي متكامل" : "Comprehensive Medical Network"}</h4>
                    <p className="text-[10px] text-muted-foreground">{dir === "rtl" ? "موثق بنسبة 100٪" : "100% verified doctor accounts"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600 dark:text-zinc-400">{dir === "rtl" ? "الأطباء الاستشاريين" : "Consultant Doctors"}</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">74%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded">
                    <div className="h-full bg-primary w-[74%] rounded" />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-slate-600 dark:text-zinc-400">{dir === "rtl" ? "نسبة الردود والتفاعل" : "Clinic Reply Rate"}</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200">92%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded">
                    <div className="h-full bg-primary w-[92%] rounded" />
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded flex items-center gap-4">
                  <Shield className="w-8 h-8 text-primary shrink-0" />
                  <div className="text-start">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{dir === "rtl" ? "حماية خصوصية صارمة" : "Top Tier Privacy"}</h5>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {dir === "rtl" ? "تلتزم مرمر بحماية كامل بيانات الطبيب وبيانات مراجعي العيادة." : "Complying with advanced security rules to secure identities."}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS SECTION (Inspired by 'What Our Students Say') ── */}
        <section className="py-20 bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
            <div className="space-y-3">
              <span className="text-primary text-xs font-extrabold uppercase tracking-widest">{dir === "rtl" ? "قصص نجاح الأطباء" : "Doctor Stories"}</span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                {dir === "rtl" ? "ماذا يقول الأطباء عن عيادات مرمر؟" : "What Our Doctors Say"}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  stars: 5,
                  quote: dir === "rtl" ? "ساعدتني المنصة كثيراً في إظهار تقييمات مرضاي الحقيقية بعيداً عن التشويش والمراجعات الوهمية." : "Marmar has solved one of the biggest clinical issues: collecting verified feedback from patients in an organized way.",
                  author: dir === "rtl" ? "د. أحمد جمال" : "Dr. Ahmed Gamal",
                  role: dir === "rtl" ? "استشاري العظام" : "Orthopedics Consultant"
                },
                {
                  stars: 5,
                  quote: dir === "rtl" ? "بفضل لوحة تحكم مرمر، أصبح بإمكاننا تحسين جودة رعاية المرضى وتعديل الخدمات بالعيادة فوراً." : "The insights and ratings gathered directly improved our workflow and built our local clinical profile beautifully.",
                  author: dir === "rtl" ? "د. ليلى خليل" : "Dr. Layla Khalil",
                  role: dir === "rtl" ? "أخصائية الجلدية" : "Dermatology Specialist"
                },
                {
                  stars: 5,
                  quote: dir === "rtl" ? "رمز الاستجابة السريع QR المخصص سهل جداً عملية التقييم للمرضى قبل خروجهم من المركز الطبي." : "The printable QR codes transformed how our clients share reviews. It's fast, neat, and highly professional.",
                  author: dir === "rtl" ? "د. يوسف شاهين" : "Dr. Youssef Shahin",
                  role: dir === "rtl" ? "طبيب أسنان" : "Dentist Practitioner"
                }
              ].map((testi, idx) => (
                <div 
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-6 shadow-sm text-start flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex gap-1">
                      {Array.from({ length: testi.stars }).map((_, sIdx) => (
                        <Star key={sIdx} className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 italic leading-relaxed">
                      "{testi.quote}"
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {testi.author[0] || "D"}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">{testi.author}</h4>
                      <p className="text-[10px] text-muted-foreground">{testi.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CALL TO ACTION BANNER (Inspired by LearnHub ready to start block) ── */}
        <section className="py-16 bg-slate-50 dark:bg-zinc-950">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-8 sm:p-12 shadow-lg text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              
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
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {dir === "rtl" ? "مرمر" : "Marmar"}
              </h3>
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
                {dir === "rtl" ? "لديك استفسار؟ تواصل مع طاقم الدعم السريري الخاص بنا عبر قنوات الدعم. واتصل بنا على +201035555282" : "Need help? Contact our clinical helper staff via support channels. Give us a call on +201035555282"}
              </p>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-100 dark:border-zinc-900/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <span>
              © {new Date().getFullYear()} {dir === "rtl" ? "مرمر" : "Marmar"}. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
