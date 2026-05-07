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
  Users,
  CalendarDays,
  CheckCircle2,
  Clock,
  Zap,
  Crown,
} from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const isPremium = currentUser?.tier === "premium";

  const allAppointments = useQuery(
    api.appointments.listAppointments,
    clerkId && isPremium ? { clerkId } : "skip"
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
    };
  }, [allAppointments]);

  const isLoading = allAppointments === undefined;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Statistics" description="A breakdown of your clinic performance" />

      {/* Premium gate */}
      {currentUser !== undefined && !isPremium && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#5856D6]/10 flex items-center justify-center mb-4 mx-auto">
              <Crown className="w-8 h-8 text-[#5856D6]" />
            </div>
            <h2 className="font-bold text-lg mb-2">Premium Feature</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Detailed statistics and analytics are available on the Premium plan. Upgrade to unlock insights about your busiest days, booking sources, and performance trends.
            </p>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 bg-[#5856D6] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#4340c4] transition-colors"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium
            </Link>
          </div>
        </div>
      )}

      {isPremium && (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Period stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Today", value: stats?.today, icon: CalendarDays, color: "text-[#007AFF]", bg: "bg-[#007AFF]/10" },
              { label: "This Week", value: stats?.thisWeek, icon: TrendingUp, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
              { label: "This Month", value: stats?.thisMonth, icon: BarChart3, color: "text-[#FF9500]", bg: "bg-[#FF9500]/10" },
              { label: "This Year", value: stats?.thisYear, icon: CheckCircle2, color: "text-[#5856D6]", bg: "bg-[#5856D6]/10" },
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
              Booking Source
            </h2>
            {isLoading ? (
              <Skeleton className="h-16 rounded-xl" />
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#007AFF]">Online</span>
                    <span className="text-muted-foreground">{stats?.onlineCompleted} visits · {stats?.onlinePct}%</span>
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
                    <span className="font-medium text-muted-foreground">Manual (Walk-in)</span>
                    <span className="text-muted-foreground">{stats?.manualCompleted} visits · {100 - (stats?.onlinePct ?? 0)}%</span>
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
                  {stats?.onlinePct ?? 0}% of your completed visits were booked online.
                  {(stats?.onlinePct ?? 0) > 50 ? " Great online presence! 🎉" : " Consider sharing your booking link with more patients."}
                </p>
              </div>
            )}
          </div>

          {/* 30-day chart */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-[#FF9500]" />
              Last 30 Days
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
              Busiest Days of the Week
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
                  Best Days (Last 30 days)
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
                      <span className="font-bold">{d.total} visit{d.total !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#007AFF]" />
                  Summary
                </h2>
                <div className="space-y-2">
                  {[
                    { label: "Total appointments", value: stats?.totalAll },
                    { label: "Completed visits", value: stats?.totalCompleted },
                    { label: "Online bookings", value: stats?.onlineBookings },
                    { label: "Manual bookings", value: stats?.manualBookings },
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

        </div>
      </div>
      )}

    </div>
  );
}
