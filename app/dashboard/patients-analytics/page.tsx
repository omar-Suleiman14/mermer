"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { IOSSpinner } from "@/components/ui/spinner";
import { Users, Sparkles, Activity, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { type ComponentType } from "react";

function cardClass() {
  return "rounded-2xl border border-border/70 bg-card/90 shadow-sm backdrop-blur-sm";
}

function PulseCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: "emerald" | "sky" | "violet" | "amber";
}) {
  const ring =
    tone === "emerald"
      ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
      : tone === "sky"
        ? "bg-sky-500/12 text-sky-600 dark:text-sky-400"
        : tone === "violet"
          ? "bg-violet-500/12 text-violet-600 dark:text-violet-400"
          : "bg-amber-500/12 text-amber-600 dark:text-amber-400";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(cardClass(), "p-4 sm:p-5 flex flex-col relative")}
    >
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", ring)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug flex items-center gap-1.5">
        {label}
      </p>
    </motion.div>
  );
}

export default function PatientsAnalyticsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { dir } = useI18n();

  const patientAnalytics = useQuery(api.patients.getPatientAnalytics, clerkId ? { clerkId } : "skip");

  return (
    <div className="flex flex-col min-h-0 h-full bg-muted/15">
      <PageHeader title={dir === "rtl" ? "تحليلات المرضى" : "Patient Analytics"} description={dir === "rtl" ? "نظرة عامة على المرضى وتوزيعهم" : "Overview and distribution of your patients"} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-24">
            {patientAnalytics === undefined ? (
              <div className="flex items-center justify-center h-48">
                <IOSSpinner />
              </div>
            ) : patientAnalytics === null ? (
              <div className="text-center text-muted-foreground p-8">{dir === "rtl" ? "لا توجد بيانات" : "No data available"}</div>
            ) : (
              <>
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 ms-0.5">
                    {dir === "rtl" ? "نظرة عامة على المرضى" : "Patient Overview"}
                  </p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <PulseCard label={dir === "rtl" ? "إجمالي المرضى" : "Total Patients"} value={String(patientAnalytics.totalPatients)} icon={Users} tone="sky" />
                    <PulseCard label={dir === "rtl" ? "مرضى جدد (30 يوم)" : "New Patients (30d)"} value={String(patientAnalytics.newPatients)} icon={Sparkles} tone="emerald" />
                    <PulseCard label={dir === "rtl" ? "مرضى عائدون" : "Returning Patients"} value={String(patientAnalytics.returningPatients)} icon={Activity} tone="violet" />
                    <PulseCard label={dir === "rtl" ? "متوسط الزيارات" : "Avg. Visits / Patient"} value={String(patientAnalytics.avgVisits)} icon={TrendingUp} tone="amber" />
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className={cn(cardClass(), "p-5 sm:p-6")}>
                    <h2 className="font-semibold text-sm mb-4">{dir === "rtl" ? "حالة المرضى" : "Patient Status"}</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium">{dir === "rtl" ? "نشط (آخر 90 يوم)" : "Active (last 90d)"}</span>
                        </div>
                        <span className="font-semibold">{patientAnalytics.activePatients}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full bg-muted-foreground" />
                          <span className="text-sm font-medium">{dir === "rtl" ? "غير نشط" : "Inactive"}</span>
                        </div>
                        <span className="font-semibold">{patientAnalytics.inactivePatients}</span>
                      </div>
                    </div>
                  </section>

                  <section className={cn(cardClass(), "p-5 sm:p-6")}>
                    <h2 className="font-semibold text-sm mb-4">{dir === "rtl" ? "توزيع الجنس" : "Gender Distribution"}</h2>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dir === "rtl" ? "ذكور" : "Male"}</span>
                        <span className="font-semibold">{patientAnalytics.genderDistribution.male}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dir === "rtl" ? "إناث" : "Female"}</span>
                        <span className="font-semibold">{patientAnalytics.genderDistribution.female}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dir === "rtl" ? "أخرى" : "Other"}</span>
                        <span className="font-semibold">{patientAnalytics.genderDistribution.other}</span>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <section className={cn(cardClass(), "p-5 sm:p-6")}>
                    <h2 className="font-semibold text-sm mb-4">{dir === "rtl" ? "التوزيع العمري" : "Age Distribution"}</h2>
                    <div className="space-y-3">
                      {Object.entries(patientAnalytics.ageDistribution).map(([range, count]) => (
                        <div key={range} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{range} {dir === "rtl" ? "سنة" : "years"}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className={cn(cardClass(), "p-5 sm:p-6")}>
                    <h2 className="font-semibold text-sm mb-4">{dir === "rtl" ? "أكثر المرضى زيارة" : "Top Returning Patients"}</h2>
                    <div className="space-y-3">
                      {patientAnalytics.topReturning.map((p, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground">{p.phone}</p>
                          </div>
                          <div className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {p.visits} {dir === "rtl" ? "زيارات" : "visits"}
                          </div>
                        </div>
                      ))}
                      {patientAnalytics.topReturning.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">{dir === "rtl" ? "لا يوجد مرضى عائدون" : "No returning patients yet"}</p>
                      )}
                    </div>
                  </section>
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
