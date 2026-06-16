"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/components/providers/user-provider";

export function PastDueAlerts() {
  const { clerkId } = useCurrentUser();
  const { t } = useI18n();

  const pastDueinstallments = useQuery(
    api.installments.listPastDueinstallments,
    clerkId ? { clerkId } : "skip"
  );

  if (!pastDueinstallments || pastDueinstallments.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1c1c1a] border border-amber-500/30 rounded-2xl shadow-sm overflow-hidden mt-6">
      <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-base">{t("dashboard.pastDuePatients") || "Past Due Patients"}</h2>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        {pastDueinstallments.map((installment: any) => (
          <div key={installment._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
            <div>
              <Link href={`/dashboard/patients/${installment.patientId}?tab=installments`} prefetch={true} className="font-semibold text-sm hover:text-[#007AFF] transition-colors">
                {installment.patientName}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("dashboard.outstandingBalance") || "Outstanding Balance"}: <span className="font-bold text-amber-600 dark:text-amber-500">{installment.unpaidBalance} {t("common.currency")}</span>
              </p>
            </div>
            <Link
              href={`/dashboard/patients/${installment.patientId}?tab=installments`}
              prefetch={true}
              className="shrink-0 inline-flex items-center justify-center text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl transition-colors"
            >
              {t("dashboard.resolve") || "Resolve"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
