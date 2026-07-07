"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import dynamic from "next/dynamic";
const PatientIntakeDrawer = dynamic(() => import("@/components/patient-intake-drawer").then(m => m.PatientIntakeDrawer));
const VisitDrawer = dynamic(() => import("@/components/visit-drawer").then(m => m.VisitDrawer));
const VisitCompletionModal = dynamic(() => import("@/components/visit-completion-modal").then(m => m.VisitCompletionModal));
const MergePatientModal = dynamic(() => import("@/components/merge-patient-modal").then(m => m.MergePatientModal));
import { IOSSpinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Printer,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Merge,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import Link from "next/link";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.id as Id<"patients">;
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const [editOpen, setEditOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<{
    visitId: Id<"visits">;
    visitDate: number;
    installmentId?: string;
  } | null>(null);
  const [waiveConfirm, setWaiveConfirm] = useState<Id<"installments"> | null>(null);

  const patient = useQuery(api.patients.getPatient, clerkId ? { patientId, clerkId } : "skip");
  const visits = useQuery(api.visits.getVisitsByPatient, clerkId ? { patientId, clerkId } : "skip");
  const installments = useQuery(
    api.installments.listinstallmentsByPatient,
    clerkId ? { patientId, clerkId } : "skip"
  );
  const messageLogs = useQuery(
    api.whatsappAutomations.getMessageLogs,
    clerkId && patient?.phone ? { clerkId, patientPhone: patient.phone } : "skip"
  );

  const waiveBalance = useMutation(api.installments.waiveUnpaidBalance);
  
  const handleWaive = async (installmentId: Id<"installments">) => {
    try {
      await waiveBalance({ clerkId, installmentId });
      toast.success(lang === "ar" ? "تم إعفاء المبلغ المتبقي" : "Unpaid balance waived");
    } catch (err) {
      toast.error(lang === "ar" ? "حدث خطأ أثناء الإعفاء" : "Failed to waive balance");
    }
  };

  if (patient === undefined) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title={t("patient.title")} />
        <div className="flex-1 flex items-center justify-center">
          <IOSSpinner size={32} className="text-[#007AFF]" />
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

  const initials = patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

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
        <button
          onClick={() => setMergeOpen(true)}
          className="flex items-center gap-1.5 text-xs border border-border text-foreground px-3 py-1.5 rounded-lg hover:border-[#FF9500]/40 hover:text-[#FF9500] transition-colors"
        >
          <Merge className="w-3.5 h-3.5" />
          {lang === "ar" ? "دمج" : "Merge"}
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
              <div className="w-16 h-16 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <span className="text-xl font-bold text-[#007AFF]">{initials}</span>
              </div>
              {installments?.some((c: any) => c.status === "active") && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-background rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#AF52DE] animate-pulse" title="Active installment" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold tracking-tight">{patient.name}</h2>
                {installments?.some((c: any) => c.status === "active") && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#AF52DE]/10 border border-[#AF52DE]/20">
                    <span className="text-[10px] font-bold text-[#AF52DE] uppercase tracking-wider">{t("dashboard.installment") || "installment"}</span>
                  </div>
                )}
                {installments?.some((c: any) => (c.unpaidBalance ?? 0) > 0) && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{t("installments.unpaidBalance") || "Past Due"}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("patient.yearsOld").replace("{age}", String(patient.age))}
                  {patient.gender && patient.gender !== "other" && ` · ${patient.gender === "male" ? (lang === "ar" ? "ذكر" : "Male") : (lang === "ar" ? "أنثى" : "Female")}`}
                </span>
                <a
                  href={`tel:${patient.phone}`}
                  className="flex items-center gap-1.5 hover:text-[#007AFF] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {patient.phone}
                </a>
                {patient.additionalPhones?.map((phone: string, idx: number) => (
                  <a
                    key={idx}
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#8E8E93]/10 text-[#8E8E93] dark:bg-white/10 dark:text-gray-300 px-2 py-0.5 rounded-md border border-[#8E8E93]/20 hover:bg-[#8E8E93]/20 transition-colors"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{lang === "ar" ? "ثانوي:" : "Secondary:"} {phone}</span>
                  </a>
                ))}
              </div>
              {patient.chronicConditions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {patient.chronicConditions.map((c: string) => (
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
                  <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#007AFF]" />
                  <span className="leading-relaxed">{(patient as any).notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* installments (Moved to top if they exist) */}
        {(installments === undefined || installments.length > 0) && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#AF52DE]" />
              {t("installments.title") || "installments"}
              {installments !== undefined && installments.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({installments.length})
                </span>
              )}
            </h3>

            {installments === undefined ? (
              <div className="flex items-center justify-center py-6">
                <IOSSpinner size={24} className="text-[#007AFF]" />
              </div>
            ) : (
              <div className="space-y-3">
                {installments.map((installment: any) => {
                  const isActive = installment.status === "active";
                  const progress = installment.numVisits > 0
                    ? Math.min(100, Math.round(((installment.completedVisits ?? 0) / installment.numVisits) * 100))
                    : 0;
                  const hasUnpaid = (installment.unpaidBalance ?? 0) > 0;
                  return (
                    <div
                      key={installment._id}
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
                            {isActive ? (t("installments.active") || "Active") : (t("installments.expired") || "Expired")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("installments.started") || "Started"} {new Date(installment.startDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        <Link
                          href="/dashboard/installments"
                          className="text-xs text-[#007AFF] hover:underline"
                        >
                          {t("installments.view") || "View"} →
                        </Link>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {installment.totalAmount && (
                          <span className="text-xs text-muted-foreground">
                            {t("installments.total") || "Total"}: <span className="font-semibold text-foreground">{installment.totalAmount.toLocaleString()} {t("common.currency")}</span>
                          </span>
                        )}
                        {installment.costPerVisit && (
                          <span className="text-xs text-muted-foreground">
                            {t("installments.costPerVisitShort") || "Per visit"}: <span className="font-semibold text-foreground">{installment.costPerVisit.toLocaleString()} {t("common.currency")}</span>
                          </span>
                        )}
                      </div>

                      {/* Visit progress */}
                      {installment.numVisits > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {installment.completedVisits ?? 0} / {installment.numVisits} {t("installments.visitsText") || "visits"}
                            </span>
                            <span className="text-muted-foreground">
                              {installment.paidVisits ?? 0} {t("installments.paid") || "paid"} · {(installment.completedVisits ?? 0) - (installment.paidVisits ?? 0)} {t("installments.unpaid") || "unpaid"}
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
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <p className="text-xs font-semibold text-red-500">
                              {t("installments.unpaidBalance") || "Unpaid balance"}: {installment.unpaidBalance.toLocaleString()} {t("common.currency")}
                            </p>
                          </div>
                          <button
                            onClick={() => setWaiveConfirm(installment._id)}
                            className="text-xs font-medium text-red-600 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                          >
                            {lang === "ar" ? "إعفاء" : "Waive"}
                          </button>
                        </div>
                      )}

                      {/* Next visit */}
                      {isActive && installment.nextVisitDate && (
                        <div className="flex items-center gap-2 text-xs">
                          <CalendarIcon className="w-3 h-3 text-[#007AFF]" />
                          <span className="text-muted-foreground">{t("installments.nextVisit") || "Next visit"}:</span>
                          <span className="font-semibold text-[#007AFF]">
                            {new Date(installment.nextVisitDate).toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      )}

                      {/* Notes */}
                      {installment.notes && (
                        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">{installment.notes}</p>
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
            <div className="flex items-center justify-center py-10">
              <IOSSpinner size={24} className="text-[#007AFF]" />
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
                      ) : visit.source === "installment" ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                          {t("dashboard.installment")}
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
                      <button
                        onClick={() => window.open(`/print/${visit._id}`, '_blank')}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-[#007AFF] border border-[#007AFF]/30 px-2.5 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                      >
                        <Printer className="w-3 h-3" />
                        {t("visit.printPrescription")}
                      </button>
                      
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
                              installmentId: visit.installmentId,
                            })
                          }
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border px-2.5 py-1 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {t("patient.addRx")}
                        </button>
                      )}
                    </div>
                  </div>

                  {visit.reasonForVisit && (
                    <p className="text-sm font-medium">
                      {visit.reasonForVisit === "installment visit" ? (t("stats.sourceinstallments") || "installment Visit") : visit.reasonForVisit}
                    </p>
                  )}

                  {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <Pill className="w-3 h-3" />
                        {t("patient.medications")}
                      </div>
                      <div className="space-y-1.5">
                        {visit.prescribedMedications.map((m: any, idx: number) => {
                          // Support both legacy string and new object format
                          if (typeof m === "string") {
                            return (
                              <span key={idx} className="inline-block text-xs bg-[#34c759]/10 text-[#34c759] px-2.5 py-1 rounded-full font-medium">
                                {m}
                              </span>
                            );
                          }
                          return (
                            <div key={idx} className="flex items-start gap-2 bg-[#34c759]/5 border border-[#34c759]/20 rounded-xl px-3 py-2">
                              <Pill className="w-3.5 h-3.5 text-[#34c759] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground">{m.name}</p>
                                {(m.frequency || m.notes) && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {[m.frequency, m.notes].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
                gender: patient.gender,
                chronicConditions: patient.chronicConditions,
              }
            : null
        }
      />

      {patient && (
        <MergePatientModal
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          clerkId={clerkId}
          sourcePatientId={patientId}
          sourcePatientName={patient.name}
          sourcePatientPhone={patient.phone}
        />
      )}

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
          onOpenChange={(v: boolean) => !v && setCompletionTarget(null)}
          clerkId={clerkId}
          visitId={completionTarget.visitId}
          patientId={patientId}
          patientName={patient.name}
          patientAge={patient.age}
          installmentId={completionTarget.installmentId as Id<"installments"> | undefined}
          onComplete={() => setCompletionTarget(null)}
        />
      )}

      <AlertDialog open={!!waiveConfirm} onOpenChange={(v: boolean) => !v && setWaiveConfirm(null)}>
        <AlertDialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">{t("installments.waive") || "Waive Balance"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("installments.waiveConfirm") || "Are you sure you want to waive the unpaid balance? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel") || "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (waiveConfirm) {
                  handleWaive(waiveConfirm);
                  setWaiveConfirm(null);
                }
              }}
            >
              {t("installments.waive") || "Waive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
