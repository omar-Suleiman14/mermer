"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Globe,
  Users,
  CalendarDays,
  CheckCircle2,
  Clock,
  Zap,
  Crown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatEGP(n: number) {
  return n.toLocaleString("en-EG") + " EGP";
}

function formatDate(ts: number, short = false) {
  return new Date(ts).toLocaleDateString("en-US", short
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" }
  );
}

function RevenueBarChart({
  actual,
  projected,
}: {
  actual: { date: number; revenue: number }[];
  projected: { date: number; revenue: number; isProjected: boolean }[];
}) {
  const allData = [...actual, ...projected];
  const maxRevenue = Math.max(...allData.map((d) => d.revenue), 1);

  const combined = [
    ...actual.slice(-30).map((d) => ({ ...d, isProjected: false })),
    ...projected,
  ];

  return (
    <div className="flex items-end gap-px h-28 overflow-x-auto pb-1 mt-1">
      {combined.map((day, i) => {
        const barH = Math.max((day.revenue / maxRevenue) * 112, day.revenue > 0 ? 4 : 2);
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-0.5 flex-shrink-0 group/bar relative"
            style={{ width: "calc(100% / 60)", minWidth: 6 }}
          >
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-[#1a1916] dark:bg-white text-white dark:text-[#1a1916] text-[9px] font-semibold px-1.5 py-1 rounded-md whitespace-nowrap shadow-lg">
                {formatDate(day.date, true)}
                <br />
                {day.revenue > 0 ? formatEGP(day.revenue) : "0 EGP"}
                {(day as any).isProjected ? " (est.)" : ""}
              </div>
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ duration: 0.4, delay: i * 0.008, ease: "easeOut" }}
              style={{ height: barH }}
              className={`w-full rounded-t-[2px] ${
                (day as any).isProjected
                  ? "bg-[#007AFF]/30 border border-dashed border-[#007AFF]/50"
                  : day.revenue > 0
                  ? "bg-[#007AFF]"
                  : "bg-muted/30"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

function DowBar({ day, avg, maxAvg }: { day: string; avg: number; maxAvg: number }) {
  const pct = maxAvg > 0 ? (avg / maxAvg) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-10 text-muted-foreground flex-shrink-0">{day.slice(0, 3)}</span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full bg-[#007AFF] rounded-full"
        />
      </div>
      <span className="text-xs font-bold text-muted-foreground w-24 text-right">{avg > 0 ? formatEGP(Math.round(avg)) : "—"}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir } = useI18n();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const allAppointments = useQuery(
    api.appointments.listAppointments,
    clerkId ? { clerkId } : "skip"
  );

  const revenueData = useQuery(
    api.doctors.getRevenueData,
    clerkId ? { clerkId } : "skip"
  );


  const stats = useMemo(() => {
    if (!allAppointments) return null;

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = todayStart - 6 * DAY_MS;
    const monthStart = todayStart - 29 * DAY_MS;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();

    const completed = allAppointments.filter((a) => a.status === "completed");
    const online = allAppointments.filter((a) => a.source === "online");
    const manual = allAppointments.filter((a) => a.source === "manual");

    // Period counts
    const today = completed.filter((a) => a.date >= todayStart).length;
    const thisWeek = completed.filter((a) => a.date >= weekStart).length;
    const thisMonth = completed.filter((a) => a.date >= monthStart).length;
    const thisYear = completed.filter((a) => a.date >= yearStart).length;

    // Day-by-day breakdown for the last 30 days
    const dayMap = new Map<number, { total: number; online: number; manual: number }>();
    for (let i = 29; i >= 0; i--) {
      const day = todayStart - i * DAY_MS;
      dayMap.set(day, { total: 0, online: 0, manual: 0 });
    }
    completed.forEach((a) => {
      const day = startOfDay(a.date);
      if (dayMap.has(day)) {
        const entry = dayMap.get(day)!;
        entry.total++;
        if (a.source === "online") entry.online++;
        else entry.manual++;
      }
    });

    const days = Array.from(dayMap.entries()).map(([ts, counts]) => ({ ts, ...counts }));
    const maxDay = Math.max(...days.map((d) => d.total), 1);

    // Best and worst days
    const sortedDays = [...days].sort((a, b) => b.total - a.total);
    const bestDays = sortedDays.slice(0, 3).filter((d) => d.total > 0);
    const worstDays = sortedDays.slice(-3).reverse().filter((d) => d.total === 0 ? false : true);

    // Day-of-week analysis (which weekday gets most visits)
    const dowMap: Record<string, number> = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    completed.forEach((a) => { dowMap[dowNames[new Date(a.date).getDay()]]++; });
    const dowEntries = dowNames.map((name) => ({ name, count: dowMap[name] }));
    const maxDow = Math.max(...dowEntries.map((d) => d.count), 1);

    // Source split
    const totalCompleted = completed.length;
    const onlineCompleted = completed.filter((a) => a.source === "online").length;
    const manualCompleted = totalCompleted - onlineCompleted;
    const onlinePct = totalCompleted > 0 ? Math.round((onlineCompleted / totalCompleted) * 100) : 0;

    // Completion & cancellation rates
    const cancelled = allAppointments.filter((a) => a.status === "cancelled").length;
    const completionRate = allAppointments.length > 0 ? Math.round((totalCompleted / allAppointments.length) * 100) : 0;
    const cancellationRate = allAppointments.length > 0 ? Math.round((cancelled / allAppointments.length) * 100) : 0;

    // Unique patients
    const uniquePatients = new Set(completed.map((a) => a.patientId?.toString()).filter(Boolean)).size;

    // Best week (7-day window in last 30 days)
    let bestWeekStart = todayStart;
    let bestWeekCount = 0;
    for (let i = 0; i <= 23; i++) {
      const wStart = todayStart - (29 - i) * DAY_MS;
      const wEnd = wStart + 7 * DAY_MS;
      const count = completed.filter((a) => a.date >= wStart && a.date < wEnd).length;
      if (count > bestWeekCount) { bestWeekCount = count; bestWeekStart = wStart; }
    }

    // Avg visits per working day (days with at least 1 visit)
    const workingDays = days.filter((d) => d.total > 0).length;
    const avgVisitsPerDay = workingDays > 0 ? Math.round((thisMonth / Math.max(workingDays, 1)) * 10) / 10 : 0;

    return {
      today, thisWeek, thisMonth, thisYear,
      totalAll: allAppointments.length,
      totalCompleted,
      onlineCompleted, manualCompleted, onlinePct,
      days, maxDay,
      bestDays, worstDays,
      dowEntries, maxDow,
      onlineBookings: online.length,
      manualBookings: manual.length,
      completionRate, cancellationRate, cancelled,
      uniquePatients, avgVisitsPerDay,
      bestWeekStart, bestWeekCount,
    };
  }, [allAppointments]);

  const isLoading = allAppointments === undefined;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t("stats.title")} description={t("stats.subtitle")} />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Period stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: t("stats.today"), value: stats?.today, icon: CalendarDays, color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
              { label: t("stats.thisWeek"), value: stats?.thisWeek, icon: TrendingUp, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
              { label: t("stats.thisMonth"), value: stats?.thisMonth, icon: BarChart3, color: "text-[#FF9500]", bg: "bg-[#FF9500]/10" },
              { label: t("stats.thisYear"), value: stats?.thisYear, icon: CheckCircle2, color: "text-[#5856D6]", bg: "bg-[#5856D6]/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-2xl font-bold">{isLoading ? "—" : (value ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Online vs Manual */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[#007AFF]" />
              {t("stats.bookingSource")}
            </h2>
            {isLoading ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#007AFF]">{t("stats.online")}</span>
                    <span className="text-muted-foreground">{stats?.onlineCompleted} {t("stats.visits")} · {stats?.onlinePct}%</span>
                  </div>
                  <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats?.onlinePct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-[#007AFF] rounded-full"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-muted-foreground">{t("stats.manual")}</span>
                    <span className="text-muted-foreground">{stats?.manualCompleted} {t("stats.visits")} · {100 - (stats?.onlinePct ?? 0)}%</span>
                  </div>
                  <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${100 - (stats?.onlinePct ?? 0)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      className="h-full bg-muted-foreground/50 rounded-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {stats?.onlinePct ?? 0}{t("stats.onlinePctDesc")}
                  {(stats?.onlinePct ?? 0) > 50 ? t("stats.onlineGreat") : t("stats.onlineConsider")}
                </p>
              </div>
            )}
          </div>

          {/* 30-day chart */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#FF9500]" />
              {t("stats.last30Days")}
            </h2>
            {isLoading ? (
              <Skeleton className="h-24 rounded-xl" />
            ) : (
              <div className="flex items-end gap-0.5 h-24 overflow-x-auto pb-1">
                {stats?.days.map((day) => (
                  <div key={day.ts} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: "calc(100%/30)" }}>
                    <div className="w-full relative" style={{ height: "80px" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: day.total > 0 ? `${(day.total / (stats?.maxDay ?? 1)) * 80}px` : "2px" }}
                        transition={{ duration: 0.5, delay: 0.01 * stats!.days.indexOf(day) }}
                        className={`absolute bottom-0 w-full rounded-t-sm ${day.total > 0 ? "bg-[#007AFF]" : "bg-muted/30"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Day of week */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#5856D6]" />
              {t("stats.busiestDays")}
            </h2>
            {isLoading ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (
              <div className="space-y-2">
                {stats?.dowEntries.map((dow) => (
                  <div key={dow.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-8 text-muted-foreground">{dow.name}</span>
                    <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(dow.count / (stats?.maxDow ?? 1)) * 100}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-[#5856D6] rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-6 text-right">{dow.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Best days */}
          {!isLoading && (stats?.bestDays?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#f5a623]" />
                  {t("stats.bestDays")}
                </h2>
                <div className="space-y-2">
                  {stats?.bestDays.map((d, i) => (
                    <div key={d.ts} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 text-center ${i === 0 ? "text-[#f5a623]" : "text-muted-foreground"}`}>
                          #{i + 1}
                        </span>
                        <span className="text-muted-foreground">{formatDay(d.ts)}</span>
                      </div>
                      <span className="font-bold">{d.total} {t("stats.visits")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#007AFF]" />
                  {t("stats.summary")}
                </h2>
                <div className="space-y-2">
                  {[
                    { label: t("stats.totalAppointments"), value: stats?.totalAll },
                    { label: t("stats.completedVisits"), value: stats?.totalCompleted },
                    { label: t("stats.onlineBookings"), value: stats?.onlineBookings },
                    { label: t("stats.manualBookings"), value: stats?.manualBookings },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-bold">{value ?? 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Completion & Cancellation Rates */}
          {!isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t("stats.completionRate")}</p>
                  <CheckCircle2 className="w-4 h-4 text-[#34c759]" />
                </div>
                <p className="text-3xl font-bold text-[#34c759]">{stats?.completionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.totalCompleted ?? 0} {t("stats.completed")}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t("stats.cancellationRate")}</p>
                  <TrendingDown className="w-4 h-4 text-[#FF3B30]" />
                </div>
                <p className="text-3xl font-bold text-[#FF3B30]">{stats?.cancellationRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.cancelled ?? 0} {t("stats.cancelled")}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t("stats.patientInsights")}</p>
                  <Users className="w-4 h-4 text-[#5856D6]" />
                </div>
                <p className="text-3xl font-bold">{stats?.uniquePatients ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{t("stats.totalPatientsSeen")}</p>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("stats.avgVisitsPerDay")}</span>
                    <span className="font-bold">{stats?.avgVisitsPerDay ?? 0}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Best Week */}
          {!isLoading && (stats?.bestWeekCount ?? 0) > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-[#007AFF]/5 to-[#5856D6]/5 border border-[#007AFF]/10 rounded-2xl p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{t("stats.bestWeek")}</p>
                  <p className="text-sm font-bold mt-0.5">
                    {t("stats.weekOf")} {formatDay(stats!.bestWeekStart)} — {stats!.bestWeekCount} {t("stats.visits")}
                  </p>
                </div>
              </div>
            </motion.div>
          )}


          {/* ── Revenue Section ── */}
          {revenueData === undefined ? (
            <div className="flex justify-center p-8 text-[#007AFF]">
              <IOSSpinner size={32} />
            </div>
          ) : revenueData === null ? null : (
            <div className="space-y-5 pt-4 border-t border-black/5 dark:border-white/5">
              <h2 className="text-lg font-bold">{t("stats.financialPerformance")}</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="sm:col-span-2 bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{t("stats.thisMonthVsLast")}</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-3xl font-bold">{formatEGP(revenueData.thisMonthRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("stats.thisMonthLabel")}</p>
                    </div>
                    <div className="pb-1">
                      <div className={`flex items-center gap-1 text-sm font-bold ${
                        revenueData.pctChange > 0 ? "text-[#34c759]" : revenueData.pctChange < 0 ? "text-[#FF3B30]" : "text-muted-foreground"
                      }`}>
                        {revenueData.pctChange > 0
                          ? <ArrowUpRight className="w-4 h-4" />
                          : revenueData.pctChange < 0
                          ? <ArrowDownRight className="w-4 h-4" />
                          : <Minus className="w-4 h-4" />}
                        {Math.abs(Math.round(revenueData.pctChange))}%
                      </div>
                      <p className="text-xs text-muted-foreground">{formatEGP(revenueData.lastMonthRevenue)} {t("stats.lastMonth")}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#34c759]/10 flex items-center justify-center mb-3">
                    <DollarSign className="w-4 h-4 text-[#34c759]" />
                  </div>
                  <p className="text-2xl font-bold">{formatEGP(revenueData.totalAllTime)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("stats.allTimeRevenue")}</p>
                </motion.div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#007AFF]" />
                    {t("stats.revenueTimeline")}
                  </h2>
                  <div className="flex items-center gap-4 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-[2px] bg-[#007AFF]" />
                      <span className="text-muted-foreground">{t("stats.actualLast30")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-[2px] bg-[#007AFF]/30 border border-dashed border-[#007AFF]/50" />
                      <span className="text-muted-foreground">{t("stats.estimatedNext30")}</span>
                    </div>
                  </div>
                </div>
                <RevenueBarChart actual={revenueData.dailyRevenue} projected={revenueData.projected} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-[#FF9500]" />
                    {t("stats.revByDow")}
                  </h2>
                  <div className="space-y-2">
                    <div className="bg-[#FF9500]/8 border border-[#FF9500]/20 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{t("stats.bestPerformingDay")}</p>
                      <p className="text-base font-bold mt-0.5">{revenueData.bestDow?.day ?? "—"}</p>
                      <p className="text-xs text-[#FF9500] font-medium">
                        {t("stats.insightAvg")} {revenueData.bestDow?.avg ? formatEGP(Math.round(revenueData.bestDow.avg)) : "—"} {t("stats.perVisit")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#5856D6]" />
                    {t("stats.projection30")}
                  </h2>
                  <div className="space-y-3">
                    {(() => {
                      const projTotal = revenueData.projected.reduce((s, d) => s + d.revenue, 0);
                      const projAvg = revenueData.projected.length > 0
                        ? projTotal / revenueData.projected.length
                        : 0;
                      return (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground">{t("stats.estimatedNext30Days")}</p>
                            <p className="text-2xl font-bold mt-0.5">{formatEGP(projTotal)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-muted/20 rounded-xl p-3">
                              <p className="text-[10px] text-muted-foreground">{t("stats.dailyAvg")}</p>
                              <p className="text-sm font-bold">{formatEGP(Math.round(projAvg))}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3">
                              <p className="text-[10px] text-muted-foreground">{t("stats.feePerVisit")}</p>
                              <p className="text-sm font-bold">{revenueData.consultationFee > 0 ? formatEGP(revenueData.consultationFee) : t("stats.notSet")}</p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
