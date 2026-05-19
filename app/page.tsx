"use client";

import Link from "next/link";
import { Search, Stethoscope, CalendarCheck, Shield } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { PublicNav } from "@/components/public/public-nav";
import { DOCTOR_SPECIALTIES } from "@/lib/doctor-constants";
import { translateSpecialty } from "@/lib/doctor-display";

export default function LandingPage() {
  const { t, dir, lang } = useI18n();
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSearch(specialty?: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (specialty) params.set("specialty", specialty);
    router.push(`/find-a-doctor${params.toString() ? `?${params}` : ""}`);
  }

  const popularSpecialties = DOCTOR_SPECIALTIES.slice(0, 8);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground" dir={dir}>
      <PublicNav />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 md:pt-32 md:pb-36 relative">
            <p className="text-sm font-medium text-primary mb-4">
              {dir === "rtl" ? "منصة حجز طبية موثوقة" : "Trusted medical booking"}
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight text-foreground max-w-4xl leading-[1.1]">
              {dir === "rtl"
                ? "ابحث عن طبيبك واحجز في دقائق"
                : "Find your doctor. Book in minutes."}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {dir === "rtl"
                ? "ابحث بالاسم أو العيادة أو التخصص أو المدينة — وقارن الأسعار والتقييمات."
                : "Search by doctor, clinic, specialty, or city — compare fees and ratings."}
            </p>

            <div className="mt-12 max-w-3xl">
              <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl bg-card border border-border shadow-2xl shadow-primary/[0.04]">
                <div className="flex-1 flex items-center gap-4 px-5 py-4">
                  <Search className="w-6 h-6 text-primary shrink-0" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={
                      dir === "rtl"
                        ? "طبيب، عيادة، تخصص، مدينة..."
                        : "Doctor, clinic, specialty, city..."
                    }
                    className="w-full bg-transparent outline-none text-lg placeholder:text-muted-foreground/50"
                    dir={dir}
                    aria-label={dir === "rtl" ? "بحث" : "Search"}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="px-10 py-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg transition-colors shadow-sm"
                >
                  {dir === "rtl" ? "بحث" : "Search"}
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {popularSpecialties.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSearch(s)}
                  className="text-sm px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {translateSpecialty(t, s)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                icon: Stethoscope,
                title: dir === "rtl" ? "أطباء موثّقون" : "Verified doctors",
                desc:
                  dir === "rtl"
                    ? "ملفات عامة مع تخصصات وتقييمات حقيقية"
                    : "Public profiles with specialties and real reviews",
              },
              {
                icon: CalendarCheck,
                title: dir === "rtl" ? "حجز فوري" : "Instant booking",
                desc:
                  dir === "rtl"
                    ? "اختر الموعد المناسب واحجز مباشرة"
                    : "Pick a slot and book without hassle",
              },
              {
                icon: Shield,
                title: dir === "rtl" ? "آمن ومحمي" : "Safe & secure",
                desc:
                  dir === "rtl"
                    ? "بياناتك محمية بمعايير عالية"
                    : "Your data handled with care",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-5 bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {dir === "rtl" ? "مرمر" : "Marmar"}
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {t("landing.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {t("landing.terms")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
