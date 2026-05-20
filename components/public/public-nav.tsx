"use client";

import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/utils";

interface PublicNavProps {
  className?: string;
  backHref?: string;
  backLabel?: string;
}

export function PublicNav({ className, backHref, backLabel }: PublicNavProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, dir } = useI18n();

  useEffect(() => setMounted(true), []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80",
        className
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && backLabel ? (
            <Link
              href={backHref}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors truncate"
            >
              {backLabel}
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="font-semibold text-[17px] tracking-tight">
                {dir === "rtl" ? "مرمر" : "Marmar"}
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">

          <LanguageToggle compact className="!px-2" />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
          {mounted && (
            <>
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-2 inline-flex"
                >
                  {dir === "rtl" ? "تسجيل الدخول" : "Sign In"}
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
                >
                  {t("nav.dashboard")}
                </Link>
              </SignedIn>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


