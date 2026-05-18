"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { PatientIntakeDrawer } from "@/components/patient-intake-drawer";
import { VisitDrawer } from "@/components/visit-drawer";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Edit,
  PlusCircle,
  Clock,
  Pill,
  FlaskConical,
  FileText,
  Download,
  ImageIcon,
  StickyNote,
  ScrollText,
  AlertCircle,
  CalendarIcon,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.id as Id<"patients">;
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<{
    visitId: Id<"visits">;
    visitDate: number;
    contractId?: string;
  } | null>(null);

  const patient = useQuery(api.patients.getPatient, clerkId ? { patientId, clerkId } : "skip");
  const visits = useQuery(api.visits.getVisitsByPatient, clerkId ? { patientId, clerkId } : "skip");
  const contracts = useQuery(
    api.contracts.listContractsByPatient,
    clerkId ? { patientId, clerkId } : "skip"
  );

  if (patient === undefined) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title={t("patient.title")} />
        <div className="p-6 space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title={t("patient.notFoundTitle")} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{t("patient.notFoundDesc")}</p>
        </div>
      </div>
    );
  }

  const initials = patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={patient.name}>
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1.5 text-xs border border-border text-foreground px-3 py-1.5 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          {t("patient.edit")}
        </button>
        {/* <button
          onClick={handleAddToQueue}
          className="flex items-center gap-1.5 text-xs border border-border text-foreground px-3 py-1.5 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add to Queue
        </button> */}
        <button
          onClick={() => setVisitOpen(true)}
          className="flex items-center gap-1.5 text-xs bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          {t("patient.newVisit")}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Patient header card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-[#007AFF]">{initials}</span>
              </div>
              {contracts?.some(c => c.status === "active") && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-background rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#AF52DE] animate-pulse" title="Active Contract" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold tracking-tight">{patient.name}</h2>
                {contracts?.some(c => c.status === "active") && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#AF52DE]/10 border border-[#AF52DE]/20">
                    <span className="text-[10px] font-bold text-[#AF52DE] uppercase tracking-wider">{t("dashboard.contract") || "Contract"}</span>
                  </div>
                )}
                {contracts?.some(c => (c.unpaidBalance ?? 0) > 0) && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{t("contracts.unpaidBalance") || "Past Due"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("patient.yearsOld").replace("{age}", String(patient.age))}</span>
                <a
                  href={`tel:${patient.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#007AFF] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone}
                </a>
              </div>
              {patient.chronicConditions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {patient.chronicConditions.map((c) => (
                    <Badge
                      key={c}
                      className="bg-[#007AFF]/10 text-[#007AFF] border-0 text-xs font-medium"
                    >
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
              {(patient as any).notes && (
                <div className="mt-3 text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 flex items-start gap-2">
                  <StickyNote className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#007AFF]" />
                  <span className="leading-relaxed">{(patient as any).notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contracts (Moved to top if they exist) */}
        {(contracts === undefined || contracts.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#AF52DE]" />
              {t("contracts.title") || "Contracts"}
              {contracts !== undefined && contracts.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({contracts.length})
                </span>
              )}
            </h3>

            {contracts === undefined ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : (
              <div className="space-y-3">
                {contracts.map((contract: any) => {
                  const isActive = contract.status === "active";
                  const progress = contract.numVisits > 0
                    ? Math.min(100, Math.round(((contract.completedVisits ?? 0) / contract.numVisits) * 100))
                    : 0;
                  const hasUnpaid = (contract.unpaidBalance ?? 0) > 0;
                  return (
                    <div
                      key={contract._id}
                      className={`bg-card border rounded-xl p-4 space-y-3 ${
                        hasUnpaid ? "border-red-500/30" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isActive
                              ? "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30"
                              : "bg-red-500/10 text-red-500 border-red-500/30"
                          }`}>
                            {isActive ? (t("contracts.active") || "Active") : (t("contracts.expired") || "Expired")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("contracts.started") || "Started"} {new Date(contract.startDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <Link
                          href="/dashboard/contracts"
                          className="text-xs text-[#007AFF] hover:underline"
                        >
                          {t("contracts.view") || "View"} →
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {contract.totalAmount && (
                          <span className="text-xs text-muted-foreground">
                            {t("contracts.total") || "Total"}: <span className="font-semibold text-foreground">{contract.totalAmount.toLocaleString()} {t("common.currency")}</span>
                          </span>
                        )}
                        {contract.costPerVisit && (
                          <span className="text-xs text-muted-foreground">
                            {t("contracts.costPerVisitShort") || "Per visit"}: <span className="font-semibold text-foreground">{contract.costPerVisit.toLocaleString()} {t("common.currency")}</span>
                          </span>
                        )}
                      </div>

                      {/* Visit progress */}
                      {contract.numVisits > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {contract.completedVisits ?? 0} / {contract.numVisits} {t("contracts.visitsText") || "visits"}
                            </span>
                            <span className="text-muted-foreground">
                              {contract.paidVisits ?? 0} {t("contracts.paid") || "paid"} · {(contract.completedVisits ?? 0) - (contract.paidVisits ?? 0)} {t("contracts.unpaid") || "unpaid"}
                            </span>
                          </div>
                          <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#AF52DE] rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Unpaid balance warning */}
                      {hasUnpaid && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          <p className="text-xs font-semibold text-red-500">
                            {t("contracts.unpaidBalance") || "Unpaid balance"}: {contract.unpaidBalance.toLocaleString()} {t("common.currency")}
                          </p>
                        </div>
                      )}

                      {/* Next visit */}
                      {isActive && contract.nextVisitDate && (
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarIcon className="w-3 h-3 text-[#007AFF]" />
                          <span className="text-muted-foreground">{t("contracts.nextVisit") || "Next visit"}:</span>
                          <span className="font-semibold text-[#007AFF]">
                            {new Date(contract.nextVisitDate).toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {contract.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">{contract.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Visit history */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#007AFF]" />
            {t("patient.visitHistory")}
            {visits !== undefined && (
              <span className="text-xs text-muted-foreground font-normal">
                ({visits.length} {visits.length === 1 ? t("patient.visitLabel") : t("patient.visitsLabel")})
              </span>
            )}
          </h3>

          {visits === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : visits.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">{t("patient.noVisitsYet")}</p>
              <button
                onClick={() => setVisitOpen(true)}
                className="text-sm font-medium text-[#007AFF] hover:underline"
              >
                {t("patient.recordFirstVisit")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {(visits as any[]).map((visit) => (
                <div
                  key={visit._id}
                  className="bg-card border border-border rounded-xl p-5 border-l-2 border-l-[#007AFF] space-y-3"
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(visit.date).toLocaleDateString(dateLocale, {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {/* Source badge */}
                      {visit.source === "online" ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
                          {t("dashboard.online")}
                        </span>
                      ) : visit.source === "contract" ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                          {t("dashboard.contract")}
                        </span>
                      ) : visit.source === "follow-up" ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 px-1.5 py-0.5 rounded-full">
                          {t("dashboard.followUp")}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                          {t("dashboard.manual")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {visit.prescriptionPdfUrl && (
                        <a
                          href={visit.prescriptionPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#007AFF] border border-[#007AFF]/30 px-2.5 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          {t("patient.rxPdf")}
                        </a>
                      )}
                      {!visit.prescriptionPdfUrl && (
                        <button
                          onClick={() =>
                            setCompletionTarget({
                              visitId: visit._id as Id<"visits">,
                              visitDate: visit.date,
                              contractId: visit.contractId,
                            })
                          }
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border px-2.5 py-1 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" />
                          {t("patient.addRx")}
                        </button>
                      )}
                    </div>
                  </div>

                  {visit.reasonForVisit && (
                    <p className="text-sm font-medium">
                      {visit.reasonForVisit === "Contract visit" ? (t("stats.sourceContracts") || "Contract Visit") : visit.reasonForVisit}
                    </p>
                  )}

                  {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <Pill className="w-3 h-3" />
                        {t("patient.medications")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.prescribedMedications.map((m: string) => (
                          <span key={m} className="text-xs bg-muted/60 px-2 py-0.5 rounded-full">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.analysisRequested && visit.analysisRequested.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <FlaskConical className="w-3 h-3" />
                        {t("patient.analysis")}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.analysisRequested.map((a: string) => (
                          <span key={a} className="text-xs bg-[#007AFF]/8 text-[#007AFF] px-2 py-0.5 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.notes && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <FileText className="w-3 h-3" />
                        {t("patient.notesSection")}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{visit.notes}</p>
                    </div>
                  )}

                  {/* Prescription photo link */}
                  {visit.prescriptionImageUrl && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <ImageIcon className="w-3 h-3" />
                        {t("patient.prescriptionPhoto")}
                      </div>
                      <a
                        href={visit.prescriptionImageUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="flex items-center gap-2 text-xs text-[#007AFF] border border-[#007AFF]/30 px-3 py-1.5 rounded-lg hover:bg-[#007AFF]/10 transition-colors w-fit"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {t("patient.rxPdf") || "Open Prescription"}
                        <Download className="w-3 h-3 text-muted-foreground ml-1" />
                      </a>
                    </div>
                  )}

                  {/* Extra documents */}
                  {visit.documentUrls && visit.documentUrls.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <FileText className="w-3 h-3" />
                        {t("patient.attachedDocuments")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visit.documentUrls.map((url: string | null, i: number) =>
                          url ? (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="flex items-center gap-1.5 text-xs text-[#007AFF] border border-[#007AFF]/30 px-2.5 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              {t("patient.docNumber").replace("{n}", String(i + 1))}
                            </a>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contracts section moved to top */}
      </div>

      {/* Drawers */}
      <PatientIntakeDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        clerkId={clerkId}
        editPatient={
          patient
            ? {
                _id: patient._id,
                name: patient.name,
                age: patient.age,
                phone: patient.phone,
                chronicConditions: patient.chronicConditions,
              }
            : null
        }
      />

      <VisitDrawer
        open={visitOpen}
        onOpenChange={setVisitOpen}
        clerkId={clerkId}
        patientId={patientId}
        patientName={patient.name}
      />

      {completionTarget && (
        <VisitCompletionModal
          open={!!completionTarget}
          onOpenChange={(v) => !v && setCompletionTarget(null)}
          clerkId={clerkId}
          visitId={completionTarget.visitId}
          patientId={patientId}
          patientName={patient.name}
          patientAge={patient.age}
          contractId={completionTarget.contractId as Id<"contracts"> | undefined}
          onComplete={() => setCompletionTarget(null)}
        />
      )}
    </div>
  );
}
