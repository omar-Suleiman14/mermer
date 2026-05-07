"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { PatientIntakeDrawer } from "@/components/patient-intake-drawer";
import { VisitDrawer } from "@/components/visit-drawer";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Phone,
  Edit,
  UserPlus,
  PlusCircle,
  Clock,
  Pill,
  FlaskConical,
  FileText,
  Download,
  ImageIcon,
  StickyNote,
} from "lucide-react";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.id as Id<"patients">;
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<{
    appointmentId: Id<"appointments">;
    visitDate: number;
  } | null>(null);

  const patient = useQuery(api.patients.getPatient, clerkId ? { patientId, clerkId } : "skip");
  const visits = useQuery(api.appointments.getVisitsByPatient, clerkId ? { patientId, clerkId } : "skip");

  async function handleAddToQueue() {
    // Queue table is being phased out — appointments table is the single source.
    // This button is kept for UX but could be wired to addManualAppointment in a future update.
  }

  if (patient === undefined) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Patient Profile" />
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
        <PageHeader title="Patient Not Found" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">This patient doesn&apos;t exist or belongs to another doctor.</p>
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
          Edit
        </button>
        <button
          onClick={handleAddToQueue}
          className="flex items-center gap-1.5 text-xs border border-border text-foreground px-3 py-1.5 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add to Queue
        </button>
        <button
          onClick={() => setVisitOpen(true)}
          className="flex items-center gap-1.5 text-xs bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          New Visit
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Patient header card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-[#007AFF]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold tracking-tight mb-1">{patient.name}</h2>
              <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{patient.age} years old</span>
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

        {/* Visit history */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#007AFF]" />
            Visit History
            {visits !== undefined && (
              <span className="text-xs text-muted-foreground font-normal">
                ({visits.length} {visits.length === 1 ? "visit" : "visits"})
              </span>
            )}
          </h3>

          {visits === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : visits.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">No visits recorded yet</p>
              <button
                onClick={() => setVisitOpen(true)}
                className="text-sm font-medium text-[#007AFF] hover:underline"
              >
                Record first visit
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
                        {new Date(visit.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {/* Source badge */}
                      {visit.source === "appointment" ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
                          Online
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                          Manual
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {visit.prescriptionPdfUrl && (
                        <a
                          href={visit.prescriptionPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-[#007AFF] border border-[#007AFF]/30 px-2.5 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Rx PDF
                        </a>
                      )}
                      {!visit.prescriptionPdfUrl && (
                        <button
                          onClick={() =>
                            setCompletionTarget({
                              appointmentId: visit._id,
                              visitDate: visit.date,
                            })
                          }
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border px-2.5 py-1 rounded-lg hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" />
                          Add Rx
                        </button>
                      )}
                    </div>
                  </div>

                  {visit.reasonForVisit && (
                    <p className="text-sm font-medium">{visit.reasonForVisit}</p>
                  )}

                  {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <Pill className="w-3 h-3" />
                        Medications
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
                        Analysis
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
                        Notes
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{visit.notes}</p>
                    </div>
                  )}

                  {/* Prescription photo thumbnail */}
                  {visit.prescriptionImageUrl && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <ImageIcon className="w-3 h-3" />
                        Prescription Photo
                      </div>
                      <a href={visit.prescriptionImageUrl} target="_blank" rel="noreferrer">
                        <img
                          src={visit.prescriptionImageUrl}
                          alt="Prescription"
                          className="w-24 h-32 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {/* Extra documents */}
                  {visit.documentUrls && visit.documentUrls.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <FileText className="w-3 h-3" />
                        Attached Documents
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visit.documentUrls.map((url: string | null, i: number) =>
                          url ? (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-[#007AFF] border border-[#007AFF]/30 px-2.5 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Doc {i + 1}
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
          appointmentId={completionTarget.appointmentId}
          patientName={patient.name}
          patientAge={patient.age}
          onComplete={() => setCompletionTarget(null)}
        />
      )}
    </div>
  );
}
