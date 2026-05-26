"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang, dir } = useI18n();
  const isAr = lang === "ar";

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center p-8 text-center" dir={dir}>
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute -inset-3 rounded-full bg-amber-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />
        <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-amber-500"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="max-w-sm space-y-3 mb-8">
        <h2 className="text-xl font-bold text-foreground">
          {isAr ? "حدث خطأ ما" : "Something went wrong"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAr
            ? "حدث خطأ في هذا الجزء من لوحة التحكم. بياناتك آمنة."
            : "An error occurred in this section of the dashboard. Your data is safe."}
        </p>
        {error?.digest && (
          <p className="text-xs font-mono text-muted-foreground/70 bg-muted/50 px-3 py-1.5 rounded-lg inline-block">
            {error.digest}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0062cc] transition-colors shadow-md shadow-[#007AFF]/20"
        >
          {isAr ? "حاول مرة أخرى" : "Try Again"}
        </button>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-semibold hover:bg-muted/80 transition-colors border border-border"
        >
          {isAr ? "العودة للوحة التحكم" : "Back to Dashboard"}
        </Link>
      </div>
    </div>
  );
}
