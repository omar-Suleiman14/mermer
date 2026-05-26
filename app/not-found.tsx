import Link from "next/link";
import { getServerI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { lang, dir } = await getServerI18n();

  const isAr = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex flex-col items-center justify-center px-6"
      dir={dir}
    >
      {/* Animated illustration */}
      <div className="relative mb-10 select-none">
        <div className="text-[120px] sm:text-[160px] font-black text-[#007AFF]/10 dark:text-[#007AFF]/8 leading-none tracking-tighter">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Pulse rings */}
            <div className="absolute -inset-4 rounded-full bg-[#007AFF]/10 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="absolute -inset-2 rounded-full bg-[#007AFF]/15" />
            <div className="w-20 h-20 rounded-full bg-[#007AFF]/20 dark:bg-[#007AFF]/15 flex items-center justify-center border border-[#007AFF]/30 backdrop-blur-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-9 h-9 text-[#007AFF]"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" strokeOpacity="0.4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="text-center max-w-md space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          {isAr ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>
        <p className="text-[#6b6a63] dark:text-[#8e8d86] text-base leading-relaxed">
          {isAr
            ? "يبدو أن الصفحة التي تبحث عنها قد تم نقلها أو حذفها أو لم تكن موجودة من الأساس."
            : "The page you're looking for may have been moved, deleted, or never existed in the first place."}
        </p>
      </div>

      {/* CTAs */}
      <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="px-6 py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm hover:bg-[#0062cc] transition-colors shadow-lg shadow-[#007AFF]/20"
        >
          {isAr ? "العودة للرئيسية" : "Go to Home"}
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 rounded-2xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
        >
          {isAr ? "لوحة التحكم" : "Go to Dashboard"}
        </Link>
      </div>

      {/* Branding */}
      <div className="mt-16 text-sm font-bold text-[#007AFF] opacity-60 tracking-tight">
        mermer
      </div>
    </div>
  );
}
