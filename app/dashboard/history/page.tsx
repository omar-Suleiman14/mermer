"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { useCurrentUser } from "@/components/providers/user-provider";
import { useI18n } from "@/lib/i18n/client";
import { IOSSpinner } from "@/components/ui/spinner";
import { useState, useMemo, useEffect, useRef } from "react";
import { 
  CalendarIcon, Filter, Activity, History, Globe, 
  CheckCircle2, Clock, XCircle, Users, 
  Trash2, PlusCircle, Edit3, FileEdit, UserPlus, ArrowRightLeft,
  MessageSquare
} from "lucide-react";

type UnifiedLog = {
  _id: string;
  type: "visit" | "audit" | "message";
  timestamp: number;
  actionBy: string;
  
  // Visit specific
  patientName?: string;
  source?: string;
  status?: string;
  date?: number;
  reasonForVisit?: string;
  
  // Audit specific
  action?: string;
  details?: string;

  // Message specific
  patientPhone?: string;
  messageText?: string;
  messageStatus?: "success" | "failed";
  messageError?: string;
};

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

function getAuditIcon(action: string) {
  if (action.includes("Delete")) return <Trash2 className="w-4 h-4 text-red-500" />;
  if (action.includes("Create") || action === "Added Patient") return <PlusCircle className="w-4 h-4 text-emerald-500" />;
  if (action === "Batch Added Patients") return <UserPlus className="w-4 h-4 text-emerald-500" />;
  if (action === "Updated Appointment") return <ArrowRightLeft className="w-4 h-4 text-amber-500" />;
  if (action === "Completed Visit") return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
  if (action === "Updated Visit Files/Notes") return <FileEdit className="w-4 h-4 text-indigo-500" />;
  if (action.includes("Update")) return <Edit3 className="w-4 h-4 text-amber-500" />;
  return <Activity className="w-4 h-4 text-muted-foreground" />;
}

export default function HistoryPage() {
  const { clerkId } = useCurrentUser();
  const { t, lang } = useI18n();

  const rawLogs = useQuery(api.visits.getActivityLog, clerkId ? { clerkId, limit: 500 } : "skip");
  const auditLogs = useQuery(api.auditLogs.getAuditLogs, clerkId ? { clerkId, limit: 500 } : "skip");
  const messageLogs = useQuery(api.whatsappAutomations.getAllMessageLogs, clerkId ? { clerkId, limit: 500 } : "skip");

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, dateFilter, staffFilter]);

  const unifiedLogs: UnifiedLog[] = useMemo(() => {
    if (!rawLogs || !auditLogs) return [];

    const unified: UnifiedLog[] = [];

    // Map visits
    rawLogs.forEach(v => {
      unified.push({
        _id: v._id,
        type: "visit",
        timestamp: v.createdAt,
        actionBy: (v.actionBy as string) || (v.source === "online" ? "Online Booking" : "Staff"),
        patientName: v.patientName,
        source: v.source,
        status: v.status,
        date: v.date,
        reasonForVisit: v.reasonForVisit,
      });
    });

    // Map audit logs
    auditLogs.forEach(a => {
      unified.push({
        _id: a._id,
        type: "audit",
        timestamp: a.timestamp,
        actionBy: a.userName || "System",
        action: a.action,
        details: a.details,
      });
    });

    // Map message logs
    if (messageLogs) {
      messageLogs.forEach(m => {
        unified.push({
          _id: m._id,
          type: "message" as any, // extended type
          timestamp: m.createdAt,
          actionBy: "System",
          patientPhone: m.patientPhone,
          messageText: m.messageText,
          messageStatus: m.status,
          messageError: m.error,
        });
      });
    }

    return unified.sort((a, b) => b.timestamp - a.timestamp);
  }, [rawLogs, auditLogs, messageLogs]);

  // Extract unique staff members
  const staffMembers = useMemo(() => {
    const staff = new Set<string>();
    unifiedLogs.forEach(log => {
      if (log.actionBy && log.actionBy !== "System" && log.actionBy !== "Online Booking") {
        staff.add(log.actionBy);
      }
    });
    return Array.from(staff).sort();
  }, [unifiedLogs]);

  const filteredLogs = useMemo(() => {
    let filtered = unifiedLogs;

    if (typeFilter !== "all") {
      filtered = filtered.filter(l => l.type === typeFilter);
    }

    if (staffFilter !== "all") {
      filtered = filtered.filter(l => l.actionBy === staffFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(l => {
        const d = new Date(l.timestamp);
        return d.toISOString().split("T")[0] === dateFilter;
      });
    }

    return filtered;
  }, [unifiedLogs, typeFilter, staffFilter, dateFilter]);

  const paginatedLogs = useMemo(() => {
    const end = currentPage * itemsPerPage;
    return filteredLogs.slice(0, end);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [currentPage, totalPages]);

  if (rawLogs === undefined || auditLogs === undefined) {
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
        {/* Unified Filter Bar */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm flex-wrap">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={`bg-background border border-border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow w-full sm:w-auto ${lang === "ar" ? "pr-3 pl-8" : "pl-3 pr-8"}`}
            >
              <option value="all">{lang === "ar" ? "كل الأحداث" : "All Events"}</option>
              <option value="visit">{lang === "ar" ? "الزيارات والحجوزات" : "Visits & Bookings"}</option>
              <option value="audit">{lang === "ar" ? "إجراءات النظام" : "System Actions"}</option>
              <option value="message">{lang === "ar" ? "رسائل واتساب" : "WhatsApp Messages"}</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              dir={lang === "ar" ? "rtl" : "ltr"}
              className={`bg-background border border-border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow w-full sm:w-auto ${lang === "ar" ? "pr-3 pl-8" : "pl-3 pr-8"}`}
            >
              <option value="all">{lang === "ar" ? "كل الموظفين" : "All Staff"}</option>
              <option value="Online Booking">{lang === "ar" ? "حجز عبر الإنترنت" : "Online Bookings"}</option>
              {staffMembers.map(staff => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow w-full sm:w-auto"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter("")}
                className="text-xs text-[#007AFF] hover:underline whitespace-nowrap"
              >
                {t("history.clearFilters") || "Clear"}
              </button>
            )}
          </div>
        </div>

        {/* Unified List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-semibold">{t("history.noActivity") || "No activity yet"}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                {t("history.noActivityDesc") || "Actions will appear here as you add visits and patients."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedLogs.map((log) => {
                if (log.type === "visit") {
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isOnline ? "bg-primary/10 text-primary" : 
                        isInstallment ? "bg-[#AF52DE]/10 text-[#AF52DE]" : 
                        "bg-emerald-500/10 text-emerald-600"
                      }`}>
                        <ActionIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-1">
                          <div>
                            <p className="text-sm font-semibold truncate">
                              {isOnline ? (t("history.actionOnline") || "Online Booking") : 
                               isInstallment ? (t("history.actionInstallment") || "Installment Visit") : 
                               (t("history.actionManual") || "Manual Visit")}
                            </p>
                            <p className="text-[13px] text-foreground mt-0.5 flex items-center gap-1">
                              <span className="text-muted-foreground">{t("installments.patient") || "Patient"}:</span>
                              <span className="font-medium">{log.patientName}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(log.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { 
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit" 
                              })}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1 mt-1">
                               {log.actionBy}
                             </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            {t("history.visitOn") || "Visit on"} {new Date(log.date || 0).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/30 border border-border text-xs font-medium ${statusColor}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {log.status === "completed" ? (t("history.statusCompleted") || "Completed") : 
                             log.status === "cancelled" ? (t("history.statusCancelled") || "Cancelled") : 
                             (t("history.statusConfirmed") || "Scheduled")}
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
                } else if (log.type === "message") {
                  return (
                    <div key={log._id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        log.messageStatus === "success" ? "bg-[#25D366]/10 text-[#25D366]" : "bg-red-500/10 text-red-500"
                      }`}>
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {log.messageStatus === "success" 
                                ? (lang === "ar" ? "تم إرسال رسالة واتساب" : "WhatsApp Message Sent")
                                : (lang === "ar" ? "فشل إرسال واتساب" : "WhatsApp Message Failed")}
                            </p>
                            <p className="text-xs text-foreground mt-0.5">
                              {lang === "ar" ? "إلى:" : "To:"} <span className="font-medium" dir="ltr">{log.patientPhone}</span>
                            </p>
                            {log.messageError && (
                              <p className="text-xs text-red-500 mt-1">{log.messageError}</p>
                            )}
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg max-w-lg border border-border/50">
                              <pre className="whitespace-pre-wrap font-sans">
                                {log.messageText}
                              </pre>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(log.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Audit Log Render
                  const { action: tAction, details: tDetails } = translateAuditLog(log.action || "", log.details || "", lang);
                  const Icon = getAuditIcon(log.action || "");
                  
                  return (
                    <div key={log._id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-border flex items-center justify-center shrink-0">
                        {Icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{tAction}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{tDetails}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground flex items-center justify-end gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(log.timestamp).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                                month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
                              })}
                            </p>
                            <p className="text-[10px] font-medium mt-1.5 text-foreground bg-muted/50 px-2 py-0.5 rounded-full inline-block">
                              {log.actionBy}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {currentPage < totalPages && (
          <div ref={observerTarget} className="py-6 flex justify-center">
            <IOSSpinner size={24} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
