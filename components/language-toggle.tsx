"use client";

import { useI18n } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  /** compact: show just globe + short label */
  compact?: boolean;
}

export function LanguageToggle({ className, compact = false }: LanguageToggleProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <button
      onClick={() => setLang(lang === "en" ? "ar" : "en")}
      aria-label={`Switch to ${lang === "en" ? "Arabic" : "English"}`}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "text-sm font-medium transition-all duration-200",
        "text-muted-foreground hover:text-foreground",
        "hover:bg-accent/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2",
        className
      )}
    >
      <Globe className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {!compact && (
        <span>{t("nav.language")}</span>
      )}
    </button>
  );
}
