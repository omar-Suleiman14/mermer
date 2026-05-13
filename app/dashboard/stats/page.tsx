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
  Globe,
  CalendarDays,
  CheckCircle2,
  Clock,
  Zap,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  SunMedium,
  CalendarRange,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useMemo, type ComponentType } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DAY_MS = 86400000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatMoney(n: number, lang: Lang, currencyLabel: string) {
  const loc = lang === "ar" ? "ar-EG" : "en-EG";
  const formatted = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(Math.round(n));
  return `${formatted} ${currencyLabel}`;
}

function formatDay(ts: number, locale: string) {
  return new Date(ts).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
}

function formatMedium(ts: number, locale: string) {
  return new Date(ts).toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function weekdayLabels(locale: string): string[] {
  const base = new Date(2024, 5, 23);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d.toLocaleDateString(locale, { weekday: "short" });
  });
}

function RevenueBarChart({
  actual,
  projected,
  locale,
  isRtl,
  estLabel,
  formatCurrency,
}: {
  actual: { date: number; revenue: number }[];
  projected: { date: number; revenue: number; isProjected: boolean }[];
  locale: string;
  isRtl: boolean;
  estLabel: string;
  formatCurrency: (n: number) => string;
}) {
  const combined = [...actual.slice(-30).map((d) => ({ ...d, isProjected: false })), ...projected];
  const maxRevenue = Math.max(...combined.map((d) => d.revenue), 1);

  return (
    <div
      className={cn(
        "flex items-end gap-px h-32 overflow-x-auto overscroll-x-contain pb-1 pt-1 -mx-1 px-1 scroll-smooth [scrollbar-width:thin]",
        isRtl && "flex-row-reverse"
      )}
      dir="ltr"
    >
      {combined.map((day, i) => {
        const barH = Math.max((day.revenue / maxRevenue) * 112, day.revenue > 0 ? 4 : 2);
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-0.5 flex-shrink-0 group/bar relative"
            style={{ width: "calc(100% / 60)", minWidth: 6 }}
          >
            <div className="absolute bottom-full mb-1 start-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-foreground text-background text-[9px] font-semibold px-1.5 py-1 rounded-md whitespace-nowrap shadow-lg text-center">
                {new Date(day.date).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                <br />
                {day.revenue > 0 ? formatCurrency(day.revenue) : formatCurrency(0)}
                {day.isProjected ? <span className="opacity-80"> · {estLabel}</span> : null}
              </div>
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.006, 0.25), ease: [0.22, 1, 0.36, 1] }}
              style={{ height: barH }}
              className={cn(
                "w-full rounded-t-[3px]",
                day.isProjected
                  ? "bg-primary/25 border border-dashed border-primary/50"
                  : day.revenue > 0
                    ? "bg-primary"
                    : "bg-muted/40"
              )}
            />
          </div>
        );
      })}
    </div>
  );
}

function VisitsSparkline({
  days,
  maxDay,
  locale,
  isRtl,
}: {
  days: { ts: number; total: number }[];
  maxDay: number;
  locale: string;
  isRtl: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-px h-32 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 scroll-smooth [scrollbar-width:thin]",
        isRtl && "flex-row-reverse"
      )}
    >
      {days.map((day, i) => {
        const h = day.total > 0 ? Math.max((day.total / maxDay) * 112, 4) : 2;
        return (
          <div
            key={day.ts}
            className="flex flex-col items-center justify-end flex-shrink-0 group/v relative"
            style={{ width: "calc(100% / 30)", minWidth: 5 }}
          >
            <div className="absolute bottom-full mb-1 start-1/2 -translate-x-1/2 opacity-0 group-hover/v:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="bg-foreground text-background text-[9px] font-semibold px-1.5 py-1 rounded-md shadow-lg whitespace-nowrap">
                {new Date(day.ts).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                <br />
                {day.total}
              </div>
            </div>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: h }}
              transition={{ duration: 0.35, delay: Math.min(i * 0.012, 0.3), ease: [0.22, 1, 0.36, 1] }}
              style={{ height: h }}
              className={cn("w-full rounded-t-[3px]", day.total > 0 ? "bg-amber-500" : "bg-muted/35")}
            />
          </div>
        );
      })}
    </div>
  );
}

function DowRow({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-10 text-muted-foreground flex-shrink-0 text-end tabular-nums">
        {label}
      </span>
      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden min-h-[8px]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="h-full bg-violet-500 rounded-full"
        />
      </div>
      <span className="text-xs font-semibold text-muted-foreground w-7 text-start tabular-nums">{count}</span>
    </div>
  );
}

function cardClass() {
  return "rounded-3xl border border-border/70 bg-card/90 shadow-sm backdrop-blur-sm";
}

export default function StatisticsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir, lang } = useI18n();
  const isRtl = dir === "rtl";
  const locale = lang === "ar" ? "ar-EG" : "en-US";
  const currencyLabel = t("common.currency");

  const allAppointments = useQuery(api.appointments.listAppointments, clerkId ? { clerkId } : "skip");
  const revenueData = useQuery(api.doctors.getRevenueData, clerkId ? { clerkId } : "skip");

  const fmt = (n: number) => formatMoney(n, lang, currencyLabel);

  const analytics = useMemo(() => {
    if (!allAppointments) return null;

    const now = Date.now();
    const todayStart = startOfDay(now);
    const weekStart = todayStart - 6 * DAY_MS;
    const monthStart = todayStart - 29 * DAY_MS;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();

    const completed = allAppointments.filter((a) => a.status === "completed");
    const online = allAppointments.filter((a) => a.source === "online");
    const manual = allAppointments.filter((a) => a.source === "manual");

    const today = completed.filter((a) => a.date >= todayStart).length;
    const thisWeek = completed.filter((a) => a.date >= weekStart).length;
    const thisMonth = completed.filter((a) => a.date >= monthStart).length;
    const thisYear = completed.filter((a) => a.date >= yearStart).length;

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

    const sortedDays = [...days].sort((a, b) => b.total - a.total);
    const bestDays = sortedDays.slice(0, 3).filter((d) => d.total > 0);

    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    completed.forEach((a) => {
      dowCounts[new Date(a.date).getDay()]++;
    });
    const maxDow = Math.max(...dowCounts, 1);

    const totalCompleted = completed.length;
    const onlineCompleted = completed.filter((a) => a.source === "online").length;
    const manualCompleted = totalCompleted - onlineCompleted;
    const onlinePct = totalCompleted > 0 ? Math.round((onlineCompleted / totalCompleted) * 100) : 0;

    const cancelled = allAppointments.filter((a) => a.status === "cancelled").length;
    const completionRate =
      allAppointments.length > 0 ? Math.round((totalCompleted / allAppointments.length) * 100) : 0;
    const cancellationRate =
      allAppointments.length > 0 ? Math.round((cancelled / allAppointments.length) * 100) : 0;

    const uniquePatients = new Set(completed.map((a) => a.patientId?.toString()).filter(Boolean)).size;

    let bestWeekStart = todayStart;
    let bestWeekCount = 0;
    for (let i = 0; i <= 23; i++) {
      const wStart = todayStart - (29 - i) * DAY_MS;
      const wEnd = wStart + 7 * DAY_MS;
      const count = completed.filter((a) => a.date >= wStart && a.date < wEnd).length;
      if (count > bestWeekCount) {
        bestWeekCount = count;
        bestWeekStart = wStart;
      }
    }

    const workingDays = days.filter((d) => d.total > 0).length;
    const avgVisitsPerDay = workingDays > 0 ? Math.round((thisMonth / Math.max(workingDays, 1)) * 10) / 10 : 0;

    const lastDay = days[days.length - 1];
    const prevDay = days[days.length - 2];
    const visitDelta = (lastDay?.total ?? 0) - (prevDay?.total ?? 0);

    let revenue30 = 0;
    let projected30 = 0;
    let revYesterday = 0;
    let revToday = 0;
    let bestRevenueDay = { date: 0, revenue: 0 };
    let bestMonth = { label: "", total: 0, monthStart: 0 };

    if (revenueData) {
      const dr = revenueData.dailyRevenue;
      const last30 = dr.slice(-30);
      revenue30 = last30.reduce((s, d) => s + d.revenue, 0);
      projected30 = revenueData.projected.reduce((s, d) => s + d.revenue, 0);
      if (dr.length >= 2) {
        revYesterday = dr[dr.length - 2]?.revenue ?? 0;
        revToday = dr[dr.length - 1]?.revenue ?? 0;
      }
      for (const d of dr) {
        if (d.revenue > bestRevenueDay.revenue) bestRevenueDay = { date: d.date, revenue: d.revenue };
      }
      const monthTotals = new Map<string, { total: number; start: number }>();
      for (const d of dr) {
        const x = new Date(d.date);
        const key = `${x.getFullYear()}-${x.getMonth()}`;
        const cur = monthTotals.get(key) ?? { total: 0, start: new Date(x.getFullYear(), x.getMonth(), 1).getTime() };
        cur.total += d.revenue;
        monthTotals.set(key, cur);
      }
      for (const [, v] of monthTotals) {
        if (v.total > bestMonth.total) bestMonth = { label: "", total: v.total, monthStart: v.start };
      }
    }

    const bestVisitDay = bestDays[0] ?? null;
    const weekEndTs = bestWeekStart + 6 * DAY_MS;

    return {
      today,
      thisWeek,
      thisMonth,
      thisYear,
      totalAll: allAppointments.length,
      totalCompleted,
      onlineCompleted,
      manualCompleted,
      onlinePct,
      days,
      maxDay,
      bestDays,
      dowCounts,
      maxDow,
      onlineBookings: online.length,
      manualBookings: manual.length,
      completionRate,
      cancellationRate,
      cancelled,
      uniquePatients,
      avgVisitsPerDay,
      bestWeekStart,
      bestWeekCount,
      weekEndTs,
      visitDelta,
      revenue30,
      projected30,
      revYesterday,
      revToday,
      bestRevenueDay,
      bestMonth,
      bestVisitDay,
    };
  }, [allAppointments, revenueData]);

  const isLoading = allAppointments === undefined;
  const wlabels = useMemo(() => weekdayLabels(locale), [locale]);

  const pros: string[] = [];
  const cons: string[] = [];
  if (!isLoading && analytics) {
    if (analytics.completionRate >= 72) pros.push(t("stats.proHighCompletion"));
    if (analytics.onlinePct >= 32) pros.push(t("stats.proOnline"));
    if (revenueData && revenueData.pctChange > 3) pros.push(t("stats.proRevenueUp"));
    if (analytics.cancellationRate >= 12) cons.push(t("stats.conCancellations"));
    if (analytics.onlinePct < 22 && analytics.totalCompleted > 8) cons.push(t("stats.conOnlineLow"));
    if (revenueData && revenueData.pctChange < -5) cons.push(t("stats.conRevenueDown"));
  }

  const revenueDelta =
    revenueData && analytics ? analytics.revToday - analytics.revYesterday : 0;
  const visitDeltaText =
    !analytics || analytics.days.length < 2
      ? t("stats.visitsDeltaSame")
      : analytics.visitDelta > 0
        ? t("stats.visitsDeltaUp").replace("{n}", String(analytics.visitDelta))
        : analytics.visitDelta < 0
          ? t("stats.visitsDeltaDown").replace("{n}", String(Math.abs(analytics.visitDelta)))
          : t("stats.visitsDeltaSame");

  const revenueDeltaLabel =
    !revenueData || !analytics
      ? t("stats.revenueDeltaSame")
      : revenueDelta > 1
        ? t("stats.revenueDeltaUp")
        : revenueDelta < -1
          ? t("stats.revenueDeltaDown")
          : t("stats.revenueDeltaSame");

  const bestMonthLabel =
    analytics && analytics.bestMonth.monthStart > 0
      ? new Date(analytics.bestMonth.monthStart).toLocaleDateString(locale, { month: "long", year: "numeric" })
      : "—";

  return (
    <div className="flex flex-col min-h-0 h-full bg-muted/15">
      <PageHeader title={t("stats.title")} description={t("stats.subtitle")} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-24">
          {/* Pulse */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 ms-0.5">
              {t("stats.atAGlance")}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {revenueData && revenueData !== null ? (
                <>
                  <PulseCard
                    label={t("stats.revenue30d")}
                    value={fmt(analytics?.revenue30 ?? 0)}
                    icon={DollarSign}
                    tone="emerald"
                  />
                  <PulseCard
                    label={t("stats.projectedNext30")}
                    value={fmt(analytics?.projected30 ?? 0)}
                    icon={SunMedium}
                    tone="sky"
                  />
                </>
              ) : (
                <>
                  <PulseCard label={t("stats.thisMonth")} value={isLoading ? "—" : String(analytics?.thisMonth ?? 0)} icon={BarChart3} tone="amber" />
                  <PulseCard label={t("stats.thisWeek")} value={isLoading ? "—" : String(analytics?.thisWeek ?? 0)} icon={Activity} tone="sky" />
                </>
              )}
              <PulseCard
                label={t("stats.visits30d")}
                value={isLoading ? "—" : String(analytics?.thisMonth ?? 0)}
                icon={CalendarDays}
                tone="violet"
              />
              <PulseCard
                label={t("stats.completionRate")}
                value={isLoading ? "—" : `${analytics?.completionRate ?? 0}%`}
                icon={CheckCircle2}
                tone="emerald"
              />
            </div>
          </section>

          {/* Best day / week / month */}
          {!isLoading && analytics && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <HighlightCard
                icon={Zap}
                kicker={t("stats.bestVisitDay")}
                title={
                  analytics.bestVisitDay
                    ? formatDay(analytics.bestVisitDay.ts, locale)
                    : "—"
                }
                subtitle={t("stats.visitsCount").replace("{n}", String(analytics.bestVisitDay?.total ?? 0))}
              />
              <HighlightCard
                icon={CalendarRange}
                kicker={t("stats.bestWeek")}
                titleOverride={t("stats.weekWindow")
                  .replace("{start}", formatMedium(analytics.bestWeekStart, locale))
                  .replace("{end}", formatMedium(analytics.weekEndTs, locale))}
                subtitle={t("stats.visitsCount").replace("{n}", String(analytics.bestWeekCount))}
              />
              <HighlightCard
                icon={Sparkles}
                kicker={t("stats.bestMonthCard")}
                title={bestMonthLabel}
                subtitle={revenueData ? fmt(analytics.bestMonth.total) : "—"}
              />
            </section>
          )}

          {/* Day over day */}
          {!isLoading && analytics && (
            <section className={cn(cardClass(), "p-5 sm:p-6")}>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-primary" />
                {t("stats.dayOverDay")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("stats.visits")}</p>
                  <p className="text-lg font-semibold tracking-tight">{visitDeltaText}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      {t("stats.yesterday")}: <strong className="text-foreground">{analytics.days[analytics.days.length - 2]?.total ?? 0}</strong>
                    </span>
                    <span>
                      {t("stats.todayLabel")}: <strong className="text-foreground">{analytics.days[analytics.days.length - 1]?.total ?? 0}</strong>
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 border border-border/60 p-4">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">{t("stats.revenueTrend")}</p>
                  <p className="text-lg font-semibold tracking-tight">{revenueDeltaLabel}</p>
                  {revenueData ? (
                    <p className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 tabular-nums">
                      <span>
                        {t("stats.yesterday")}: <strong className="text-foreground">{fmt(analytics.revYesterday)}</strong>
                      </span>
                      <span>
                        {t("stats.todayLabel")}: <strong className="text-foreground">{fmt(analytics.revToday)}</strong>
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">{t("stats.notSet")}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Pros / cons */}
          {!isLoading && analytics && (pros.length > 0 || cons.length > 0) && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={cn(cardClass(), "p-5 border-emerald-500/15 bg-emerald-500/[0.03]")}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("stats.pros")}
                </h3>
                <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
                  {pros.map((p) => (
                    <li key={p} className="flex gap-2 ps-1">
                      <span className="text-emerald-500 mt-1.5 size-1 rounded-full bg-emerald-500 shrink-0" />
                      {p}
                    </li>
                  ))}
                  {pros.length === 0 && <li className="text-muted-foreground text-sm">—</li>}
                </ul>
              </div>
              <div className={cn(cardClass(), "p-5 border-amber-500/20 bg-amber-500/[0.04]")}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("stats.cons")}
                </h3>
                <ul className="space-y-2 text-sm text-foreground/90 leading-relaxed">
                  {cons.map((c) => (
                    <li key={c} className="flex gap-2 ps-1">
                      <span className="text-amber-500 mt-1.5 size-1 rounded-full bg-amber-500 shrink-0" />
                      {c}
                    </li>
                  ))}
                  {cons.length === 0 && <li className="text-muted-foreground text-sm">—</li>}
                </ul>
              </div>
            </section>
          )}

          {/* Charts */}
          {!isLoading && analytics && (
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 ms-0.5">
                {t("stats.overview")}
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={cn(cardClass(), "p-5 sm:p-6")}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h2 className="font-semibold text-sm">{t("stats.visitsByDay")}</h2>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t("stats.chartHint")}</span>
                  </div>
                  <VisitsSparkline
                    days={analytics.days}
                    maxDay={analytics.maxDay}
                    locale={locale}
                    isRtl={isRtl}
                  />
                </div>
                {revenueData && revenueData !== null ? (
                  <div className={cn(cardClass(), "p-5 sm:p-6")}>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <h2 className="font-semibold text-sm">{t("stats.revenueTimeline")}</h2>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-primary" />
                          {t("stats.actualLast30")}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-2.5 rounded-sm bg-primary/30 border border-dashed border-primary/50" />
                          {t("stats.estimatedNext30")}
                        </span>
                      </div>
                    </div>
                    <RevenueBarChart
                      actual={revenueData.dailyRevenue}
                      projected={revenueData.projected}
                      locale={locale}
                      isRtl={isRtl}
                      estLabel={t("stats.est")}
                      formatCurrency={fmt}
                    />
                  </div>
                ) : (
                  <div className={cn(cardClass(), "p-5 flex items-center justify-center text-sm text-muted-foreground")}>
                    {t("stats.notSet")}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Booking mix + busiest weekday */}
          {!isLoading && analytics && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={cn(cardClass(), "p-5 sm:p-6")}>
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-primary" />
                  {t("stats.bookingSource")}
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-medium text-primary">{t("stats.online")}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0">
                        {analytics.onlineCompleted} {t("stats.visits")} · {analytics.onlinePct}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${analytics.onlinePct}%` }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-medium text-muted-foreground">{t("stats.manual")}</span>
                      <span className="text-muted-foreground tabular-nums shrink-0">
                        {analytics.manualCompleted} {t("stats.visits")} · {100 - analytics.onlinePct}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${100 - analytics.onlinePct}%` }}
                        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
                        className="h-full bg-muted-foreground/45 rounded-full"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {analytics.onlinePct}
                    {t("stats.onlinePctDesc")}
                    {analytics.onlinePct > 50 ? t("stats.onlineGreat") : t("stats.onlineConsider")}
                  </p>
                </div>
              </div>

              <div className={cn(cardClass(), "p-5 sm:p-6")}>
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-violet-500" />
                  {t("stats.busiestWeekday")}
                </h2>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                    <DowRow key={i} label={wlabels[i] ?? ""} count={analytics.dowCounts[i] ?? 0} max={analytics.maxDow} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* KPI strip */}
          {!isLoading && analytics && (
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(cardClass(), "p-5")}
              >
                <p className="text-[11px] font-semibold text-muted-foreground">{t("stats.cancellationRate")}</p>
                <p className="text-3xl font-bold text-red-500 tabular-nums mt-1">{analytics.cancellationRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.cancelled} {t("stats.cancelled")}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 }}
                className={cn(cardClass(), "p-5")}
              >
                <p className="text-[11px] font-semibold text-muted-foreground">{t("stats.totalPatientsSeen")}</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{analytics.uniquePatients}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("stats.avgVisitsPerDay")}: <span className="font-semibold text-foreground">{analytics.avgVisitsPerDay}</span>
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className={cn(cardClass(), "p-5")}
              >
                <p className="text-[11px] font-semibold text-muted-foreground">{t("stats.bestRevenueDay")}</p>
                <p className="text-base font-semibold mt-1 leading-snug">
                  {revenueData && analytics.bestRevenueDay.revenue > 0
                    ? formatDay(analytics.bestRevenueDay.date, locale)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {revenueData && analytics.bestRevenueDay.revenue > 0 ? fmt(analytics.bestRevenueDay.revenue) : "—"}
                </p>
              </motion.div>
            </section>
          )}

          {/* Top visit days + financial block */}
          {!isLoading && analytics && (analytics.bestDays?.length ?? 0) > 0 && (
            <section className={cn(cardClass(), "p-5 sm:p-6")}>
              <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                {t("stats.bestDays")}
              </h2>
              <div className="space-y-2">
                {analytics.bestDays.map((d, i) => (
                  <div key={d.ts} className="flex items-center justify-between text-sm gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "text-xs font-bold w-6 text-center tabular-nums shrink-0",
                          i === 0 ? "text-amber-500" : "text-muted-foreground"
                        )}
                      >
                        {t("stats.rank")}
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground truncate">{formatDay(d.ts, locale)}</span>
                    </div>
                    <span className="font-semibold tabular-nums shrink-0">
                      {d.total} {t("stats.visits")}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {revenueData === undefined ? (
            <div className="flex justify-center py-10 text-primary">
              <IOSSpinner size={28} />
            </div>
          ) : revenueData === null ? null : (
            <section className="space-y-4 pt-2 border-t border-border/60">
              <h2 className="text-base font-bold tracking-tight">{t("stats.financialPerformance")}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={cn(cardClass(), "p-5 sm:col-span-2")}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t("stats.thisMonthVsLast")}
                  </p>
                  <div className="flex flex-wrap items-end gap-6">
                    <div>
                      <p className="text-3xl font-bold tabular-nums tracking-tight">{fmt(revenueData.thisMonthRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("stats.thisMonthLabel")}</p>
                    </div>
                    <div className="pb-0.5">
                      <div
                        className={cn(
                          "flex items-center gap-1 text-sm font-bold tabular-nums",
                          revenueData.pctChange > 0
                            ? "text-emerald-600"
                            : revenueData.pctChange < 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                        )}
                      >
                        {revenueData.pctChange > 0 ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : revenueData.pctChange < 0 ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <Minus className="w-4 h-4" />
                        )}
                        {Math.abs(Math.round(revenueData.pctChange))}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {fmt(revenueData.lastMonthRevenue)} {t("stats.lastMonth")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cn(cardClass(), "p-5")}>
                  <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{fmt(revenueData.totalAllTime)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("stats.allTimeRevenue")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className={cn(cardClass(), "p-5")}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {t("stats.revByDow")}
                  </h3>
                  <div className="rounded-2xl bg-amber-500/8 border border-amber-500/15 p-4">
                    <p className="text-[11px] text-muted-foreground">{t("stats.bestPerformingDay")}</p>
                    <p className="text-lg font-bold mt-0.5">{revenueData.bestDow?.day ?? "—"}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                      {t("stats.insightAvg")}{" "}
                      {revenueData.bestDow?.avg ? fmt(Math.round(revenueData.bestDow.avg)) : "—"} {t("stats.perVisit")}
                    </p>
                  </div>
                </div>

                <div className={cn(cardClass(), "p-5")}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t("stats.projection30")}
                  </h3>
                  {(() => {
                    const projTotal = revenueData.projected.reduce((s, d) => s + d.revenue, 0);
                    const projAvg =
                      revenueData.projected.length > 0 ? projTotal / revenueData.projected.length : 0;
                    return (
                      <>
                        <p className="text-xs text-muted-foreground">{t("stats.estimatedNext30Days")}</p>
                        <p className="text-2xl font-bold tabular-nums mt-0.5">{fmt(projTotal)}</p>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] text-muted-foreground">{t("stats.dailyAvg")}</p>
                            <p className="text-sm font-bold tabular-nums">{fmt(Math.round(projAvg))}</p>
                          </div>
                          <div className="rounded-xl bg-muted/30 border border-border/50 p-3">
                            <p className="text-[10px] text-muted-foreground">{t("stats.feePerVisit")}</p>
                            <p className="text-sm font-bold tabular-nums">
                              {revenueData.consultationFee > 0 ? fmt(revenueData.consultationFee) : t("stats.notSet")}
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </section>
          )}

          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-3xl" />
              <Skeleton className="h-40 rounded-3xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
      className={cn(cardClass(), "p-4 sm:p-5")}
    >
      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-3", ring)}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{label}</p>
    </motion.div>
  );
}

function HighlightCard({
  icon: Icon,
  kicker,
  title,
  titleOverride,
  subtitle,
}: {
  icon: ComponentType<{ className?: string }>;
  kicker: string;
  title?: string;
  titleOverride?: string;
  subtitle: string;
}) {
  return (
    <div className={cn(cardClass(), "p-4 sm:p-5 flex flex-col gap-1")}>
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{kicker}</span>
      </div>
      <p className="text-base font-semibold text-foreground leading-snug">{titleOverride ?? title ?? "—"}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
