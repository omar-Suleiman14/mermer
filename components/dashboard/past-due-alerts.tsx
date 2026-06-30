"use client";

import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/components/providers/user-provider";
import { useWhatsAppTemplate } from "@/lib/scheduling";
import { MessageCircle } from "lucide-react";

export function PastDueAlerts() {
  const { clerkId } = useCurrentUser();
  const { t, lang, dir } = useI18n();

  const pastDueInstallments = useQuery(
    api.installments.listPastDueinstallments,
    clerkId ? { clerkId } : "skip"
  );

  const pastDueVisits = useQuery(
    api.visits.getPastDueInstallmentVisits,
    clerkId ? { clerkId } : "skip"
  );

  const templates = useQuery(api.messageTemplates.listTemplates, clerkId ? { clerkId } : "skip");
  const pastDueTemplate = templates?.find(t => t.name === "قسط متأخر")?.body || "مرحباً {patient_name}\nنود تذكيركم بوجود قسط متأخر بقيمة {amount} مستحق الدفع بتاريخ {date}.\nنتمنى لكم دوام الصحة والعافية.";
  
  const generateWhatsApp = useWhatsAppTemplate(lang);

  const hasInstallments = pastDueInstallments && pastDueInstallments.length > 0;
  const hasVisits = pastDueVisits && pastDueVisits.length > 0;

  if (!hasInstallments && !hasVisits) {
    return null;
  }

  return (
    <div className="space-y-4 mt-6">
      {/* ── Past Due Installment Visits (Missed Sessions) ── */}
      {hasVisits && (
        <div className="bg-white dark:bg-[#1c1c1a] border border-red-500/30 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-red-500/5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-500" />
              <h2 className="font-bold text-base">
                {dir === "rtl" ? "زيارات التقسيط المتأخرة" : "Past Due Visits"}
              </h2>
              <span className="ms-auto text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                {pastDueVisits.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dir === "rtl"
                ? "زيارات تقسيط مجدولة لم يتم حضورها"
                : "Scheduled installment sessions that were not attended"}
            </p>
          </div>
          <div className="p-4 space-y-2.5">
            {pastDueVisits.map((visit: any) => {
              const dateObj = new Date(visit.date);
              const dateStr = dateObj.toLocaleDateString(
                lang === "ar" ? "ar-EG" : "en-US",
                { weekday: "short", month: "short", day: "numeric" }
              );
              const timeStr = dateObj.toLocaleTimeString(
                lang === "ar" ? "ar-EG" : "en-US",
                { hour: "numeric", minute: "2-digit", hour12: true }
              );
              return (
                <div
                  key={visit._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 shadow-sm"
                >
                  <div>
                    <Link
                      href={
                        visit.installmentId
                          ? `/dashboard/patients/${visit.patientId}?tab=installments`
                          : `/dashboard/patients/${visit.patientId}`
                      }
                      prefetch={true}
                      className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
                    >
                      {visit.patientName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dir === "rtl" ? "موعد:" : "Scheduled:"}{" "}
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {dateStr} — {timeStr}
                      </span>
                    </p>
                  </div>
                  <Link
                    href={
                      visit.installmentId
                        ? `/dashboard/patients/${visit.patientId}?tab=installments`
                        : `/dashboard/patients/${visit.patientId}`
                    }
                    prefetch={true}
                    className="shrink-0 inline-flex items-center justify-center text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    {dir === "rtl" ? "عرض" : "View"}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Financial Past Due (Unpaid Balances) ── */}
      {hasInstallments && (
        <div className="bg-white dark:bg-[#1c1c1a] border border-amber-500/30 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-base">
                {t("dashboard.pastDuePatients") || "Past Due Patients"}
              </h2>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {pastDueInstallments.map((installment: any) => (
              <div
                key={installment._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 shadow-sm"
              >
                <div>
                  <Link
                    href={`/dashboard/patients/${installment.patientId}?tab=installments`}
                    prefetch={true}
                    className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
                  >
                    {installment.patientName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("dashboard.outstandingBalance") || "Outstanding Balance"}:{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-500">
                      {installment.unpaidBalance} {t("common.currency")}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {installment.patientPhone && (
                    <button
                      onClick={() => {
                        const date = installment.nextVisitDate || Date.now();
                        const amountStr = `${installment.unpaidBalance} ${t("common.currency")}`;
                        generateWhatsApp(pastDueTemplate, installment.patientName, installment.patientPhone, date, undefined, amountStr);
                      }}
                      className="shrink-0 inline-flex items-center justify-center text-xs font-semibold bg-green-500/10 hover:bg-green-500/20 text-green-600 px-3 py-2 rounded-xl transition-colors"
                      title={dir === "rtl" ? "إرسال تذكير واتساب" : "Send WhatsApp Reminder"}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <Link
                    href={`/dashboard/patients/${installment.patientId}?tab=installments`}
                    prefetch={true}
                    className="shrink-0 inline-flex items-center justify-center text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl transition-colors"
                  >
                    {t("dashboard.resolve") || "Resolve"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
