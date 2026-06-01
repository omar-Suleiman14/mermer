"use client";

import { BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { IOSSpinner } from "@/components/ui/spinner";

export function TodayAnalytics({ todayAppointments }: { todayAppointments: any[] | undefined }) {
  const { lang } = useI18n();

  if (todayAppointments === undefined) {
    return (
      <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden p-4 sm:p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#007AFF]" />
          <h2 className="font-bold text-base">{lang === "ar" ? "إحصائيات اليوم" : "Today's Analytics"}</h2>
        </div>
        <div className="flex justify-center py-4">
          <IOSSpinner size={24} className="text-[#007AFF]" />
        </div>
      </div>
    );
  }

  const todayFollowUps = todayAppointments.filter((a) => a.source === "follow-up").length;
  const todayInstallments = todayAppointments.filter((a) => a.source === "installment").length;
  const todayFirstVisits = todayAppointments.filter((a) => a.source !== "follow-up" && a.source !== "installment").length;
  const todayCompleted = todayAppointments.filter((a) => a.status === "completed").length;
  const todayCancelled = todayAppointments.filter((a) => a.status === "cancelled").length;
  const todayMissed = todayAppointments.filter((a) => a.status === "no-show").length;
  const todayRescheduled = todayAppointments.filter((a) => a.status === "rescheduled").length;

  return (
    <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden p-4 sm:p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-[#007AFF]" />
        <h2 className="font-bold text-base">{lang === "ar" ? "إحصائيات اليوم" : "Today's Analytics"}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "متابعات" : "Follow-ups"}</p>
          <p className="text-lg font-bold text-[#FF9500]">{todayFollowUps}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "أقساط" : "Installments"}</p>
          <p className="text-lg font-bold text-[#AF52DE]">{todayInstallments}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "زيارات أولى" : "First visits"}</p>
          <p className="text-lg font-bold text-sky-500">{todayFirstVisits}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "مكتملة" : "Completed"}</p>
          <p className="text-lg font-bold text-emerald-500">{todayCompleted}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "ملغاة" : "Cancelled"}</p>
          <p className="text-lg font-bold text-red-500">{todayCancelled}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "فائتة" : "Missed"}</p>
          <p className="text-lg font-bold text-orange-500">{todayMissed}</p>
        </div>
        <div className="p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground">{lang === "ar" ? "مؤجلة" : "Rescheduled"}</p>
          <p className="text-lg font-bold text-blue-500">{todayRescheduled}</p>
        </div>
      </div>
    </div>
  );
}
