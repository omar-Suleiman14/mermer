import re

with open("app/dashboard/stats/page.tsx", "r") as f:
    content = f.read()

# 1. Imports
imports_target = """import {
  BarChart3,
  TrendingUp,
  Globe,
  Users,
  CalendarDays,
  CheckCircle2,
  Clock,
  Zap,
  Crown,
} from "lucide-react";"""

imports_repl = """import {
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
import { IOSSpinner } from "@/components/ui/spinner";"""

content = content.replace(imports_target, imports_repl)

# 2. Helpers
helpers_target = """// ─── Component ────────────────────────────────────────────────────────────────"""

helpers_repl = """function formatEGP(n: number) {
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

// ─── Component ────────────────────────────────────────────────────────────────"""

content = content.replace(helpers_target, helpers_repl)

# 3. Use Query
query_target = """  const allAppointments = useQuery(
    api.appointments.listAppointments,
    clerkId ? { clerkId } : "skip"
  );"""

query_repl = """  const allAppointments = useQuery(
    api.appointments.listAppointments,
    clerkId ? { clerkId } : "skip"
  );

  const revenueData = useQuery(
    api.doctors.getRevenueData,
    clerkId ? { clerkId } : "skip"
  );"""

content = content.replace(query_target, query_repl)

# 4. JSX injection
jsx_target = """        </div>
      </div>

    </div>"""

jsx_repl = """
          {/* ── Revenue Section ── */}
          {revenueData === undefined ? (
            <div className="flex justify-center p-8 text-[#007AFF]">
              <IOSSpinner size={32} />
            </div>
          ) : revenueData === null ? null : (
            <div className="space-y-5 pt-4 border-t border-black/5 dark:border-white/5">
              <h2 className="text-lg font-bold">Financial Performance</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="sm:col-span-2 bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">This Month vs Last Month</p>
                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-3xl font-bold">{formatEGP(revenueData.thisMonthRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This month</p>
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
                      <p className="text-xs text-muted-foreground">{formatEGP(revenueData.lastMonthRevenue)} last month</p>
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
                  <p className="text-xs text-muted-foreground mt-0.5">All-time revenue</p>
                </motion.div>
              </div>

              <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#007AFF]" />
                    Revenue Timeline
                  </h2>
                  <div className="flex items-center gap-4 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-[2px] bg-[#007AFF]" />
                      <span className="text-muted-foreground">Actual (last 30d)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-[2px] bg-[#007AFF]/30 border border-dashed border-[#007AFF]/50" />
                      <span className="text-muted-foreground">Estimated (next 30d)</span>
                    </div>
                  </div>
                </div>
                <RevenueBarChart actual={revenueData.dailyRevenue} projected={revenueData.projected} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-[#FF9500]" />
                    Revenue by Day of Week
                  </h2>
                  <div className="space-y-2">
                    <div className="bg-[#FF9500]/8 border border-[#FF9500]/20 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Best performing day</p>
                      <p className="text-base font-bold mt-0.5">{revenueData.bestDow?.day ?? "—"}</p>
                      <p className="text-xs text-[#FF9500] font-medium">
                        avg {revenueData.bestDow?.avg ? formatEGP(Math.round(revenueData.bestDow.avg)) : "—"} per visit
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm">
                  <h2 className="font-semibold text-sm flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#5856D6]" />
                    30-Day Projection
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
                            <p className="text-xs text-muted-foreground">Estimated next 30 days</p>
                            <p className="text-2xl font-bold mt-0.5">{formatEGP(projTotal)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="bg-muted/20 rounded-xl p-3">
                              <p className="text-[10px] text-muted-foreground">Daily avg</p>
                              <p className="text-sm font-bold">{formatEGP(Math.round(projAvg))}</p>
                            </div>
                            <div className="bg-muted/20 rounded-xl p-3">
                              <p className="text-[10px] text-muted-foreground">Fee / visit</p>
                              <p className="text-sm font-bold">{revenueData.consultationFee > 0 ? formatEGP(revenueData.consultationFee) : "Not set"}</p>
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

    </div>"""

content = content.replace(jsx_target, jsx_repl)

with open("app/dashboard/stats/page.tsx", "w") as f:
    f.write(content)

