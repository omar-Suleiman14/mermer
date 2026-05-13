"use client";

import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

/**
 * Mounts inside the I18nProvider and keeps <html lang> and <html dir>
 * in sync with the selected language.
 * The root layout is a Server Component, so we handle this here instead.
 */
export function HtmlDirSync() {
  const { lang, dir } = useI18n();

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", dir);
    // Switch font family so Arabic text uses Cairo
    document.documentElement.style.fontFamily =
      dir === "rtl"
        ? "var(--font-cairo), sans-serif"
        : "var(--font-sans), sans-serif";
  }, [lang, dir]);

  return null;
}
