"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang, dir } = useI18n();
  const isAr = lang === "ar";

  useEffect(() => {
    // Log to error tracking service if available
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex flex-col items-center justify-center px-6 font-sans" dir={dir}>
        {/* Illustration */}
        <div className="relative mb-10 select-none">
          <div className="text-[120px] sm:text-[160px] font-black text-red-500/8 leading-none tracking-tighter">
            500
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-red-500/10 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="absolute -inset-2 rounded-full bg-red-500/10" />
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 backdrop-blur-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-9 h-9 text-red-500"
                >
                  <path d="M12 9v4M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {isAr ? "حدث خطأ ما" : "Something went wrong"}
          </h1>
          <p className="text-[#6b6a63] dark:text-[#8e8d86] text-base leading-relaxed">
            {isAr
              ? "حدث خطأ غير متوقع. تم إبلاغ فريقنا. يرجى المحاولة مرة أخرى، أو الاتصال بالدعم إذا استمرت المشكلة."
              : "An unexpected error occurred. Our team has been notified. Please try again, or contact support if the problem persists."}
          </p>
          {error?.digest && (
            <p className="text-xs font-mono text-[#8e8d86] bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg inline-block">
              {isAr ? "معرف الخطأ:" : "Error ID:"} {error.digest}
            </p>
          )}
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-2xl bg-[#007AFF] text-white font-semibold text-sm hover:bg-[#0062cc] transition-colors shadow-lg shadow-[#007AFF]/20"
          >
            {isAr ? "حاول مرة أخرى" : "Try Again"}
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-2xl bg-white/60 dark:bg-white/5 border border-black/10 dark:border-white/10 text-[#1a1916] dark:text-[#f0efea] font-semibold text-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          >
            {isAr ? "العودة للرئيسية" : "Go to Home"}
          </Link>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace("+", "") ?? "201012756994"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-sm hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
          >
            {isAr ? "اتصل بالدعم" : "Contact Support"}
          </a>
        </div>

        <div className="mt-16 text-sm font-bold text-[#007AFF] opacity-60 tracking-tight">
          mermer
        </div>
      </body>
    </html>
  );
}
