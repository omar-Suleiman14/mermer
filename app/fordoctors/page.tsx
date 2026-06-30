import Link from "next/link";
import {
  ArrowRight,
  Clock,
  TrendingUp,
  Star,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  QrCode,
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
  Smartphone,
  Palette,
  Languages,
  Moon,
  Bell,
  Infinity,
  Headphones,
} from "lucide-react";
import { getServerI18n } from "@/lib/i18n/server";
import dynamic from "next/dynamic";
import { AnimatedReveal } from "@/components/public/animated-reveal";
import Image from "next/image";
import { Metadata } from "next";

const PublicNav = dynamic(() =>
  import("@/components/public/public-nav").then((m) => m.PublicNav)
);

export const metadata: Metadata = {
  title: "For Doctors | mermer",
  description:
    "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation.",
  alternates: { canonical: "https://mermereg.com/fordoctors" },
};

const TIERS = [
  {
    tier: "Tier 1",
    tierAr: "المستوى الأول",
    label: "Daily Essentials",
    labelAr: "الأساسيات اليومية",
    description: "What every clinic needs from day one.",
    descriptionAr: "ما تحتاجه كل عيادة من أول يوم.",
    color: "blue",
    features: [
      {
        icon: MessageCircle,
        title: "Automated WhatsApp Messages & Reminders",
        titleAr: "رسائل وتذكيرات واتساب تلقائية",
        description:
          "Send confirmations, reminders, and follow-ups straight from the clinic's own WhatsApp number — no manual calling, no per-message fees.",
        descriptionAr:
          "أرسل تأكيدات وتذكيرات ومتابعات مباشرةً من رقم واتساب العيادة — بدون اتصالات يدوية ولا رسوم على كل رسالة.",
        bullets: [
          { en: "Instant confirmation the moment a booking is made", ar: "تأكيد فوري لحظة إتمام الحجز" },
          { en: "Reminder before the appointment", ar: "تذكير قبل موعد المريض" },
          { en: "Live queue updates so patients know when to show up", ar: "تحديثات لايف على دور الانتظار" },
          { en: "Follow-up reminders after a visit", ar: "تذكيرات متابعة بعد الزيارة" },
          { en: "Installment due-date reminders", ar: "تذكير بمواعيد سداد الأقساط" },
          { en: "Automatic confirmation when a patient books online", ar: "تأكيد تلقائي عند الحجز الإلكتروني" },
        ],
        badge: "Included — no extra charge",
        badgeAr: "مدمج — بدون رسوم إضافية",
        highlight: true,
      },
      {
        icon: FileText,
        title: "Patient History (Full Medical Record)",
        titleAr: "سجل المريض (الملف الطبي الكامل)",
        description:
          "A complete digital file for every patient — every visit, every note, instantly searchable. No more paper folders, no more lost records.",
        descriptionAr:
          "ملف رقمي شامل لكل مريض — كل زيارة وكل ملاحظة، قابلة للبحث الفوري. لا مجلدات ورقية ولا سجلات ضائعة.",
      },
      {
        icon: CalendarDays,
        title: "Schedule & Queue Management",
        titleAr: "إدارة الجدول والدور",
        description:
          "Book and manage the day's appointments and the waiting-room queue from a single screen.",
        descriptionAr:
          "احجز وأدر مواعيد اليوم وطابور الانتظار من شاشة واحدة.",
      },
      {
        icon: CreditCard,
        title: "Installment Management",
        titleAr: "إدارة الأقساط",
        description:
          "Track payment plans, down payments, and outstanding balances per patient — built around how Egyptian clinics actually bill.",
        descriptionAr:
          "تتبع خطط السداد والدفعات المقدمة والأرصدة المستحقة لكل مريض — مصمم بحسب طريقة العمل الفعلية للعيادات المصرية.",
      },
      {
        icon: BarChart3,
        title: "Financial Calculations & Daily Closing",
        titleAr: "الحسابات المالية وتقفيل اليومية",
        description:
          "Automatic revenue totals and shift closing, plus patient-level financial breakdowns — know exactly how the day went without doing it by hand.",
        descriptionAr:
          "إجماليات الإيرادات التلقائية وتقفيل الشيفت، إضافةً إلى تفاصيل مالية لكل مريض — اعرف نتيجة يومك بالضبط بدون أي حسابات يدوية.",
      },
      {
        icon: Pill,
        title: "Medications & Prescriptions",
        titleAr: "الأدوية والروشتات",
        description:
          "Manage medications and print professional prescriptions in seconds.",
        descriptionAr:
          "أدر الأدوية واطبع روشتات احترافية في ثوانٍ.",
      },
    ],
  },
  {
    tier: "Tier 2",
    tierAr: "المستوى الثاني",
    label: "Smooths Out the Day-to-Day",
    labelAr: "يسهّل العمل اليومي",
    description: "Tools that reduce friction once the basics are running.",
    descriptionAr: "أدوات تقلل الاحتكاك اليومي بعد تشغيل الأساسيات.",
    color: "violet",
    features: [
      {
        icon: CalendarClock,
        title: "Rescheduling",
        titleAr: "إعادة الجدولة",
        description: "Move, swap, or delay any appointment in a couple of taps.",
        descriptionAr: "انقل أو بادل أو أجّل أي موعد بنقرتين.",
      },
      {
        icon: PenLine,
        title: "Customizable WhatsApp Templates",
        titleAr: "قوالب واتساب قابلة للتخصيص",
        description:
          "Edit the wording of every automated message so it sounds like the clinic — not a generic bot.",
        descriptionAr:
          "عدّل نص كل رسالة تلقائية لتعكس صوت العيادة — لا صوت بوت رقمي.",
      },
      {
        icon: Globe,
        title: "Online Booking Link",
        titleAr: "رابط الحجز الإلكتروني",
        description:
          "Patients book themselves through a link; confirmation goes out over WhatsApp automatically.",
        descriptionAr:
          "يحجز المريض بنفسه عبر رابط ويصل إليه تأكيد واتساب تلقائياً.",
      },
      {
        icon: Monitor,
        title: "Clinic Screen",
        titleAr: "شاشة العيادة",
        description:
          "A waiting-room display that calls patients by name or number on its own — nobody has to shout across the room.",
        descriptionAr:
          "شاشة انتظار تستدعي المرضى بالاسم أو الرقم تلقائياً — لا حاجة لأحد يصرخ عبر الغرفة.",
      },
      {
        icon: Users,
        title: "Staff Roles & Permissions",
        titleAr: "أدوار الموظفين والصلاحيات",
        description:
          "Add secretaries and assistants with exactly the access they need. Keep financial data restricted if you want.",
        descriptionAr:
          "أضف سكرتارية ومساعدين بالصلاحيات التي تحتاجونها تماماً. اجعل البيانات المالية محظورة إذا أردت.",
      },
      {
        icon: Zap,
        title: "Real-Time Sync",
        titleAr: "مزامنة لحظية",
        description:
          "A change made at the front desk shows up on the doctor's phone instantly — no refreshing needed.",
        descriptionAr:
          "أي تعديل من الاستقبال يظهر فوراً على هاتف الطبيب — بدون تحديث الصفحة.",
      },
    ],
  },
  {
    tier: "Tier 3",
    tierAr: "المستوى الثالث",
    label: "Extra Depth & Growth Tools",
    labelAr: "عمق إضافي وأدوات نمو",
    description: "Useful once the clinic has volume and a team.",
    descriptionAr: "مفيدة حين يزداد حجم العيادة ويكبر الفريق.",
    color: "emerald",
    features: [
      {
        icon: ClipboardList,
        title: "Audit Logs & Staff Signatures",
        titleAr: "سجلات المراجعة وتوقيعات الموظفين",
        description:
          "A timestamped record of who added, edited, or deleted what — useful once you have more than one person on staff.",
        descriptionAr:
          "سجل موقّت لمن أضاف أو عدّل أو حذف — مفيد حين يصبح لديك أكثر من شخص في الفريق.",
      },
      {
        icon: Paperclip,
        title: "Attachments & Lab Results",
        titleAr: "المرفقات ونتائج التحاليل",
        description:
          "Upload X-rays, lab results, and documents directly into a patient's file.",
        descriptionAr:
          "ارفع صور الأشعة والتحاليل والمستندات مباشرةً في ملف المريض.",
      },
      {
        icon: HeartPulse,
        title: "Vitals & Measurements Tracking",
        titleAr: "تتبع العلامات الحيوية والقياسات",
        description:
          "Log blood pressure, weight, glucose, and other vitals at every visit.",
        descriptionAr:
          "سجّل ضغط الدم والوزن والسكر وغيرها من العلامات في كل زيارة.",
      },
      {
        icon: UserCircle,
        title: "Doctor's Public Profile",
        titleAr: "الصفحة العامة للطبيب",
        description:
          "A shareable page with the doctor's bio, specialty, address, and hours, with a booking link built in.",
        descriptionAr:
          "صفحة قابلة للمشاركة تحتوي السيرة والتخصص والعنوان والمواعيد، مع رابط حجز مدمج.",
      },
      {
        icon: GitMerge,
        title: "Merge Duplicate Patients",
        titleAr: "دمج ملفات المرضى المكررة",
        description:
          "Clean up accidental double entries by merging them into one record without losing any history.",
        descriptionAr:
          "رتّب التسجيلات المكررة بالخطأ بدمجها في سجل واحد دون فقد أي تاريخ.",
      },
    ],
  },
  {
    tier: "Tier 4",
    tierAr: "المستوى الرابع",
    label: "Platform Quality",
    labelAr: "جودة المنصة",
    description: "The foundation everything else is built on.",
    descriptionAr: "الأساس الذي بُني عليه كل شيء آخر.",
    color: "orange",
    features: [
      {
        icon: ShieldCheck,
        title: "Fast & Secure",
        titleAr: "سريع وآمن",
        description:
          "Built on modern infrastructure for quick load times and properly protected patient data.",
        descriptionAr:
          "مبني على بنية تحتية حديثة لتحميل سريع وحماية صحيحة لبيانات المرضى.",
      },
      {
        icon: Smartphone,
        title: "Feels Like a Native App (PWA)",
        titleAr: "يعمل كتطبيق أصلي (PWA)",
        description:
          "Installs straight to the home screen and behaves like a real mobile app.",
        descriptionAr:
          "يُثبَّت مباشرةً على الشاشة الرئيسية ويتصرف كتطبيق موبايل حقيقي.",
      },
      {
        icon: Palette,
        title: "Polished, Modern Interface",
        titleAr: "واجهة عصرية متقنة",
        description: "Clean, intuitive design that doesn't need a manual.",
        descriptionAr: "تصميم نظيف وبديهي لا يحتاج شرحاً.",
      },
      {
        icon: Languages,
        title: "Full Arabic Support (RTL)",
        titleAr: "دعم كامل للعربية (RTL)",
        description:
          "Built Arabic-first, not translated — correct right-to-left layout throughout.",
        descriptionAr:
          "مبني بالعربية أولاً وليس مترجماً — تخطيط صحيح من اليمين لليسار في كل مكان.",
      },
      {
        icon: Moon,
        title: "Dark & Light Mode",
        titleAr: "الوضع الليلي والنهاري",
        description: "Switch themes depending on lighting or time of day.",
        descriptionAr: "بدّل بين الثيمات بحسب الإضاءة أو وقت اليوم.",
      },
      {
        icon: Bell,
        title: "Push Notifications",
        titleAr: "إشعارات الهاتف",
        description:
          "Real-time alerts the moment something changes or a new booking comes in.",
        descriptionAr:
          "تنبيهات لحظية في اللحظة التي يتغير فيها شيء أو يأتي حجز جديد.",
      },
      {
        icon: Infinity,
        title: "No Limits",
        titleAr: "بدون قيود",
        description:
          "Unlimited patients, unlimited cloud storage, no hidden caps.",
        descriptionAr:
          "مرضى غير محدودين، تخزين سحابي غير محدود، لا سقف خفي.",
      },
      {
        icon: Headphones,
        title: "24/7 Support",
        titleAr: "دعم على مدار الساعة",
        description: "Help is available around the clock if something breaks.",
        descriptionAr: "المساعدة متاحة على مدار الساعة إذا حدثت أي مشكلة.",
      },
    ],
  },
];

const colorMap: Record<
  string,
  { bg: string; border: string; iconBg: string; text: string; badge: string; dot: string; label: string }
> = {
  blue: {
    bg: "bg-blue-500/5 dark:bg-blue-500/10",
    border: "border-blue-500/10 dark:border-blue-500/20",
    iconBg: "bg-blue-500/10 border-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20",
    dot: "bg-blue-500",
    label: "text-blue-600 dark:text-blue-400",
  },
  violet: {
    bg: "bg-violet-500/5 dark:bg-violet-500/10",
    border: "border-violet-500/10 dark:border-violet-500/20",
    iconBg: "bg-violet-500/10 border-violet-500/15",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20",
    dot: "bg-violet-500",
    label: "text-violet-600 dark:text-violet-400",
  },
  emerald: {
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    border: "border-emerald-500/10 dark:border-emerald-500/20",
    iconBg: "bg-emerald-500/10 border-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20",
    dot: "bg-emerald-500",
    label: "text-emerald-600 dark:text-emerald-400",
  },
  orange: {
    bg: "bg-orange-500/5 dark:bg-orange-500/10",
    border: "border-orange-500/10 dark:border-orange-500/20",
    iconBg: "bg-orange-500/10 border-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20",
    dot: "bg-orange-500",
    label: "text-orange-600 dark:text-orange-400",
  },
};

export default async function ForDoctorsLandingPage() {
  const { t, dir } = await getServerI18n();
  const isRtl = dir === "rtl";

  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-black text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1 w-full max-w-350 mx-auto overflow-hidden">

        {/* 1. Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-3.5rem)] flex items-center py-12 lg:py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left Col: Copy & CTAs */}
            <div className="max-w-2xl">
              <AnimatedReveal>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-6 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-semibold tracking-wide border border-slate-200 dark:border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  {isRtl ? "منصة الأطباء المهنية الأولى" : "The #1 Professional Doctor Platform"}
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tighter leading-[1.05] text-slate-900 dark:text-white">
                  {isRtl ? (
                    <>ابنِ سمعتك الرقمية. <br /><span className="text-primary">وضاعف نجاح عيادتك.</span></>
                  ) : (
                    <>Build Your Digital Reputation. <br /><span className="text-primary">Grow Your Clinic.</span></>
                  )}
                </h1>
              </AnimatedReveal>

              <AnimatedReveal delay={0.1}>
                <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-zinc-400 max-w-[45ch] leading-relaxed">
                  {isRtl
                    ? "مرمر تمنح الأطباء ملفات تعريفية موثقة ومميزة، لجمع وإدارة تقييمات المرضى وبناء سمعة رقمية لا تضاهى."
                    : "mermer empowers medical professionals with verified public profiles, authentic review tracking, and tools to elevate their online clinical reputation."}
                </p>
              </AnimatedReveal>

              <AnimatedReveal delay={0.2}>
                <div className="mt-8 flex flex-wrap gap-4 items-center">
                  <Link
                    href="/sign-in"
                    prefetch={true}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-medium text-white transition-all hover:bg-primary/90 hover:scale-[0.98] active:scale-95 shadow-lg shadow-primary/20"
                  >
                    {isRtl ? "سجل كطبيب الآن" : "Register as a Doctor"}
                    <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                  </Link>
                  <a
                    href="#features"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-8 text-base font-medium text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
                  >
                    {isRtl ? "اكتشف المميزات" : "See Features"}
                    <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
                  </a>
                  <Link
                    href="tel:+201035555282"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-8 text-base font-medium text-slate-900 dark:text-white transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
                  >
                    {isRtl ? "تواصل مع الدعم" : "Contact Support"}
                  </Link>
                </div>
              </AnimatedReveal>
            </div>

            {/* Right Col: UI Mock */}
            <AnimatedReveal delay={0.3} direction="left" className="relative lg:h-125 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] w-3/4 h-3/4 m-auto" />
              <div className="relative w-full max-w-md bg-slate-50/60 dark:bg-zinc-900/60 backdrop-blur-3xl border border-slate-200/50 dark:border-white/10 rounded-3xl p-4 shadow-2xl shadow-primary/5 overflow-hidden flex flex-col h-112.5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/5 mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">د</div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">Dashboard</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">Dr. Sarah Mansour</div>
                    </div>
                  </div>
                </div>
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
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-zinc-300">#{i}</div>
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
                  {isRtl ? "موثوقية تامة" : "Full Reliability"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {isRtl ? "امتثال كامل للخصوصية" : "Complete privacy compliance"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-center sm:text-start flex-col sm:flex-row">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <div className="font-semibold text-xl text-slate-900 dark:text-white leading-tight">
                  {isRtl ? "نمو مستدام" : "Sustainable Growth"}
                </div>
                <div className="text-sm text-slate-500 dark:text-zinc-400">
                  {isRtl ? "زيادة في عدد المرضى الجدد" : "Increase in new patients"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Bento Grid Features (existing) */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="mb-16 max-w-2xl text-center sm:text-start">
            <AnimatedReveal>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white">
                {isRtl ? "كل ما تحتاجه لإدارة عيادتك باحترافية." : "Everything you need to manage your clinic professionally."}
              </h2>
            </AnimatedReveal>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
            <AnimatedReveal delay={0.1} className="md:col-span-2 relative rounded-3xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 overflow-hidden p-8 md:p-10 flex flex-col justify-between">
              <div className="relative z-10 max-w-lg">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {isRtl ? "وفر وقتك الثمين" : "Save Your Valuable Time"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400 mb-6">
                  {isRtl
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

            <AnimatedReveal delay={0.2} className="relative rounded-3xl bg-primary/5 dark:bg-primary/10 border border-primary/10 overflow-hidden p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-6">
                  <Star className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {isRtl ? "تعزيز السمعة والـ SEO" : "Boost Reputation & SEO"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {isRtl
                    ? "ظهور في النتائج الأولى على جوجل مع تقييمات موثقة وحقيقية من مرضاك."
                    : "Rank higher on Google with verified and authentic reviews from your patients."}
                </p>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={0.3} className="relative rounded-3xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 overflow-hidden p-8 flex flex-col justify-between">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
                  <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                  {isRtl ? "حماية دخل العيادة" : "Protect Clinic Revenue"}
                </h3>
                <p className="text-slate-600 dark:text-zinc-400">
                  {isRtl
                    ? "تقليل نسبة الغياب بفضل تذكيرات الواتساب التلقائية والمتابعة اللحظية للمرضى."
                    : "Reduce no-show rates with automated WhatsApp reminders and live patient tracking."}
                </p>
              </div>
            </AnimatedReveal>

            <AnimatedReveal delay={0.4} className="md:col-span-2 relative rounded-3xl bg-slate-900 dark:bg-zinc-950 border border-slate-800 dark:border-white/10 overflow-hidden p-8 md:p-10 flex flex-col justify-between text-white">
              <div className="relative z-10 max-w-lg">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">
                  {isRtl ? "حماية كاملة للبيانات" : "Complete Data Protection"}
                </h3>
                <p className="text-slate-400">
                  {isRtl
                    ? "نمتثل لأعلى معايير الخصوصية لضمان أمان سجلات مرضاك الطبية."
                    : "We comply with the highest privacy standards to ensure the security of your patients' medical records."}
                </p>
              </div>
            </AnimatedReveal>
          </div>
        </section>

        {/* 4. Full Features List */}
        <section id="features" className="px-4 sm:px-6 lg:px-8 pb-8 scroll-mt-16">
          <AnimatedReveal>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-xs font-semibold tracking-wide border border-slate-200 dark:border-white/10">
                {isRtl ? "٢٥ ميزة • ٤ مستويات" : "25 features · 4 tiers"}
              </div>
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mb-4">
                {isRtl ? "كل شيء مدرج. لا مفاجآت." : "Everything listed. No surprises."}
              </h2>
              <p className="text-slate-500 dark:text-zinc-400 max-w-xl mx-auto">
                {isRtl
                  ? "مرتّبة من ما تحتاجه العيادة الصغيرة فعلاً من اليوم الأول، وصولاً إلى الأدوات المتقدمة."
                  : "Ranked from what a small clinic actually needs from day one, down to general platform polish."}
              </p>
            </div>

            {/* Tier Pills nav */}
            <div className="flex flex-wrap justify-center gap-3 mb-16">
              {TIERS.map((tier) => {
                const c = colorMap[tier.color];
                return (
                  <a
                    key={tier.tier}
                    href={`#${tier.tier.toLowerCase().replace(" ", "-")}`}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:scale-[0.97] ${c.badge}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {isRtl ? tier.tierAr : tier.tier} — {isRtl ? tier.labelAr : tier.label}
                  </a>
                );
              })}
            </div>
          </AnimatedReveal>

          {TIERS.map((tier, ti) => {
            const c = colorMap[tier.color];
            return (
              <div
                key={tier.tier}
                id={tier.tier.toLowerCase().replace(" ", "-")}
                className="mb-20 scroll-mt-20"
              >
                <AnimatedReveal>
                  <div className="flex items-center gap-4 mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${c.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {isRtl ? tier.tierAr : tier.tier}
                    </span>
                    <div className="h-px flex-1 bg-slate-100 dark:bg-white/5" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-1">
                    {isRtl ? tier.labelAr : tier.label}
                  </h3>
                  <p className="text-slate-500 dark:text-zinc-400 mb-8">
                    {isRtl ? tier.descriptionAr : tier.description}
                  </p>
                </AnimatedReveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {tier.features.map((feature, fi) => {
                    const Icon = feature.icon;
                    const isHighlight = !!(feature as any).highlight;
                    const bullets = (feature as any).bullets as { en: string; ar: string }[] | undefined;
                    const badge = isRtl ? (feature as any).badgeAr : (feature as any).badge;
                    return (
                      <AnimatedReveal
                        key={fi}
                        delay={fi * 0.05}
                        className={isHighlight ? "md:col-span-2" : ""}
                      >
                        <div
                          className={`relative h-full rounded-2xl border p-6 flex flex-col gap-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                            isHighlight
                              ? "bg-slate-900 dark:bg-zinc-950 border-slate-800 dark:border-white/10"
                              : `${c.bg} ${c.border}`
                          }`}
                        >
                          {badge && (
                            <span className="absolute top-4 end-4 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20">
                              {badge}
                            </span>
                          )}

                          <div
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                              isHighlight ? "bg-white/10 border-white/10" : `${c.iconBg}`
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isHighlight ? "text-white" : c.text}`} />
                          </div>

                          <div>
                            <h4 className={`text-base font-semibold mb-1.5 ${isHighlight ? "text-white" : "text-slate-900 dark:text-white"}`}>
                              {isRtl ? (feature as any).titleAr : feature.title}
                            </h4>
                            <p className={`text-sm leading-relaxed ${isHighlight ? "text-slate-400" : "text-slate-500 dark:text-zinc-400"}`}>
                              {isRtl ? (feature as any).descriptionAr : feature.description}
                            </p>
                          </div>

                          {bullets && (
                            <ul className="flex flex-col gap-2 mt-1">
                              {bullets.map((b, bi) => (
                                <li key={bi} className="flex items-start gap-2.5 text-sm text-slate-400">
                                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                  {isRtl ? b.ar : b.en}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </AnimatedReveal>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* 5. Final CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 mb-12">
          <AnimatedReveal className="max-w-4xl mx-auto text-center bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-white/5 rounded-[3rem] p-12 md:p-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-tr from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-slate-900 dark:text-white mb-6">
                {isRtl ? "مستعد لرقمنة عيادتك؟" : "Ready to digitize your clinic?"}
              </h2>
              <p className="text-slate-600 dark:text-zinc-400 mb-8 max-w-lg mx-auto">
                {isRtl
                  ? "انضم إلى الأطباء الرائدين الذين يثقون في مرمر لإدارة سمعتهم وحجوزاتهم."
                  : "Join leading doctors who trust mermer to manage their reputation and bookings."}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/sign-in"
                  prefetch={true}
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-slate-900 dark:bg-white px-10 text-base font-medium text-white dark:text-black transition-transform hover:scale-[0.98] active:scale-95"
                >
                  {isRtl ? "سجل كطبيب الآن" : "Register as a Doctor"}
                </Link>
                <Link
                  href="tel:+201035555282"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-black px-10 text-base font-medium text-slate-700 dark:text-zinc-300 transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 hover:scale-[0.98] active:scale-95"
                >
                  {isRtl ? "تواصل مع الدعم" : "Contact Support"}
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
            <a href="#features" className="hover:text-primary transition-colors">{isRtl ? "المميزات" : "Features"}</a>
            <Link href="/privacy" className="hover:text-primary transition-colors">{t("landing.privacy")}</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">{t("landing.terms")}</Link>
            <span>© {new Date().getFullYear()} {isRtl ? "جميع الحقوق محفوظة." : "All rights reserved."}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
