"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n/client";
import { IOSSpinner } from "@/components/ui/spinner";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Filter, Search, Activity, History, Globe, CheckCircle2, Clock, XCircle, AlertCircle, Users, ShieldCheck } from "lucide-react";

function translateAuditLog(action: string, details: string, lang: string) {
  if (lang !== "ar") return { action, details };

  let tAction = action;
  let tDetails = details;

  const actionMap: Record<string, string> = {
    "Updated Appointment": "تحديث موعد",
    "Completed Visit": "إتمام زيارة",
    "Created Visit": "إنشاء زيارة",
    "Deleted Visit": "حذف زيارة",
    "Updated Visit": "تحديث زيارة",
    "Updated Visit Files/Notes": "تحديث ملفات/ملاحظات الزيارة",
    "Added Patient": "إضافة مريض",
    "Updated Patient": "تحديث مريض",
    "Batch Added Patients": "إضافة مرضى دفعة واحدة",
  };
  if (actionMap[action]) tAction = actionMap[action];

  if (details.startsWith("Updated visit status to ")) {
    const status = details.replace("Updated visit status to ", "");
    const statusMap: Record<string, string> = { completed: "مكتمل", changed: "تم تغييره", cancelled: "ملغى" };
    tDetails = `تم تحديث حالة الزيارة إلى ${statusMap[status] || status}`;
  } else if (details === "Completed visit for patient") {
    tDetails = "تم إتمام الزيارة للمريض";
  } else if (details.startsWith("Registered new patient: ")) {
    tDetails = `تم تسجيل مريض جديد: ${details.replace("Registered new patient: ", "")}`;
  } else if (details.startsWith("Updated details for ")) {
    tDetails = `تم تحديث بيانات: ${details.replace("Updated details for ", "")}`;
  } else if (details.startsWith("Scheduled visit for patient ID: ")) {
    tDetails = `تم جدولة زيارة للمريض: ${details.replace("Scheduled visit for patient ID: ", "")}`;
  } else if (details === "Added files or notes to visit") {
    tDetails = "تم إضافة ملفات أو ملاحظات للزيارة";
  } else if (details === "Deleted visit record") {
    tDetails = "تم حذف سجل الزيارة";
  } else if (details === "Updated visit timeline/status") {
    tDetails = "تم تحديث الجدول الزمني/الحالة للزيارة";
  }

  return { action: tAction, details: tDetails };
}

export default function HistoryPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();

  const rawLogs = useQuery(api.visits.getActivityLog, clerkId ? { clerkId, limit: 500 } : "skip");
  const auditLogs = useQuery(api.auditLogs.getAuditLogs, clerkId ? { clerkId, limit: 200 } : "skip");

  const [activeTab, setActiveTab] = useState<"activity" | "audit">("activity");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const logs = useMemo(() => {
    if (!rawLogs) return [];
    let filtered = rawLogs;

    if (sourceFilter !== "all") {
      filtered = filtered.filter(l => l.source === sourceFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(l => {
        const d = new Date(l.createdAt);
        return d.toISOString().split("T")[0] === dateFilter;
      });
    }

    return filtered;
  }, [rawLogs, sourceFilter, dateFilter]);

  if (rawLogs === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <IOSSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <PageHeader 
        title={t("history.title") || "Activity History"} 
        description={t("history.subtitle") || "A log of all actions — visits, bookings, and changes."} 
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-5xl mx-auto w-full">
        {/* Tabs */}
        <div className="flex bg-card p-1 rounded-xl shadow-sm mb-6 w-full max-w-md mx-auto">
          {(["activity", "audit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors capitalize ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab === "activity" ? (lang === "ar" ? "النشاط" : "Activity") : (lang === "ar" ? "سجل الإجراءات" : "Audit Log")}
            </button>
          ))}
        </div>

        {activeTab === "activity" && (
          <>
            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow w-full sm:w-auto"
            >
              <option value="all">{t("history.allActions") || "All Actions"}</option>
              <option value="manual">{t("history.actionManual") || "Manual Visit"}</option>
              <option value="online">{t("history.actionOnline") || "Online Booking"}</option>
              <option value="installment">{t("history.actionInstallment") || "Installment Visit"}</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow w-full sm:w-auto"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter("")}
                className="text-xs text-[#007AFF] hover:underline"
              >
                {t("history.clearFilters") || "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold">{t("history.noActivity") || "No activity yet"}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t("history.noActivityDesc") || "Actions will appear here as you add visits and patients."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => {
                const isOnline = log.source === "online";
                const isInstallment = log.source === "installment";
                
                const StatusIcon = log.status === "completed" ? CheckCircle2 :
                                   log.status === "cancelled" ? XCircle : Clock;
                
                const statusColor = log.status === "completed" ? "text-emerald-500" :
                                    log.status === "cancelled" ? "text-red-500" : "text-amber-500";

                const ActionIcon = isOnline ? Globe : 
                                   isInstallment ? Activity : CalendarIcon;

                return (
                  <div key={log._id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isOnline ? "bg-primary/10 text-primary" : 
                      isInstallment ? "bg-[#AF52DE]/10 text-[#AF52DE]" : 
                      "bg-emerald-500/10 text-emerald-600"
                    }`}>
                      <ActionIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <p className="text-sm font-semibold truncate">
                            {isOnline ? t("history.actionOnline") || "Online Booking" : 
                             isInstallment ? t("history.actionInstallment") || "Installment Visit" : 
                             t("history.actionManual") || "Manual Visit"}
                          </p>
                          <p className="text-[13px] text-foreground mt-0.5 flex items-center gap-1">
                            <span className="text-muted-foreground">{t("installments.patient") || "Patient"}:</span>
                            <span className="font-medium">{log.patientName}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(log.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { 
                              month: "short", day: "numeric", hour: "numeric", minute: "2-digit" 
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
                             {isOnline ? t("history.actionOnline") || "Online" : ((log as any).actionBy || "Staff")}
                           </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {t("history.visitOn") || "Visit on"} {new Date(log.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                        
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border text-xs font-medium ${statusColor}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {log.status === "completed" ? t("history.statusCompleted") || "Completed" : 
                           log.status === "cancelled" ? t("history.statusCancelled") || "Cancelled" : 
                           t("history.statusConfirmed") || "Scheduled"}
                        </span>
                        
                        {log.reasonForVisit && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.reasonForVisit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}

        {/* Audit Logs Section */}
        {activeTab === "audit" && auditLogs && auditLogs.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-border">
              {auditLogs.map((log) => {
                const { action: tAction, details: tDetails } = translateAuditLog(log.action, log.details, lang);
                return (
                <div key={log._id} className="p-4 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-[#5AC8FA]/10 border border-[#5AC8FA]/20 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#5AC8FA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{tAction}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tDetails}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                          })}
                        </p>
                        <p className="text-[10px] text-[#5AC8FA] font-semibold mt-1">
                          {log.userName || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}
        {activeTab === "audit" && (!auditLogs || auditLogs.length === 0) && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <ShieldCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-semibold">{lang === "ar" ? "لا توجد سجلات إجراءات" : "No audit logs found"}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
