"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { translations, Lang } from "./index";
export type { Lang } from "./index";

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType>({
  lang: "ar",
  setLang: () => {},
  t: (key) => key,
  dir: "rtl",
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ 
  children, 
  initialLang = "ar" 
}: { 
  children: React.ReactNode, 
  initialLang?: Lang 
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    const stored = localStorage.getItem("marmer_lang") as Lang | null;
    if (stored === "ar" || stored === "en") {
      setLangState(stored);
      // Sync cookie so server components see it
      document.cookie = `marmer_lang=${stored}; path=/; max-age=31536000`;
    }
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("marmer_lang", newLang);
    document.cookie = `marmer_lang=${newLang}; path=/; max-age=31536000`;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    // Only set family for html, we'll let layout.tsx handle the CSS vars
    if (lang === "ar") {
      document.documentElement.style.fontFamily = "var(--font-cairo), sans-serif";
    } else {
      document.documentElement.style.fontFamily = "var(--font-inter), sans-serif";
    }
  }, [lang]);

  const t = useCallback(
    (key: string) => translations[lang]?.[key] ?? translations["en"]?.[key] ?? key,
    [lang]
  );

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}
