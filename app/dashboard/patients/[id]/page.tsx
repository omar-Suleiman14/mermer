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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, Edit, UserPlus, PlusCircle, Clock, Pill, FlaskConical, FileText } from "lucide-react";

export default function PatientProfilePage() {
  const params = useParams();
  const patientId = params.id as Id<"patients">;
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);

  const patient = useQuery(api.patients.getPatient, clerkId ? { patientId, clerkId } : "skip");
  const visits = useQuery(api.visits.getVisitsByPatient, clerkId ? { patientId, clerkId } : "skip");
  const addToQueue = useMutation(api.queue.addToQueue);

  async function handleAddToQueue() {
    try {
      await addToQueue({ clerkId, patientId });
      toast.success(`${patient?.name} added to queue`);
    } catch {
      toast.error("Failed to add to queue");
    }
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
              {visits.map((visit) => (
                <div
                  key={visit._id}
                  className="bg-card border border-border rounded-xl p-5 border-l-2 border-l-[#007AFF]"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 font-mono">
                      {new Date(visit.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>

                  {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <Pill className="w-3 h-3" />
                        Medications
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.prescribedMedications.map((m) => (
                          <span key={m} className="text-xs bg-muted/60 px-2 py-0.5 rounded-full">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.analysisRequested && visit.analysisRequested.length > 0 && (
                    <div className="mb-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        <FlaskConical className="w-3 h-3" />
                        Analysis
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visit.analysisRequested.map((a) => (
                          <span key={a} className="text-xs bg-[#007AFF]/8 text-[#007AFF] px-2 py-0.5 rounded-full">
                            {a}
                          </span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit patient drawer */}
      <PatientIntakeDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        clerkId={clerkId}
        editPatient={patient ? {
          _id: patient._id,
          name: patient.name,
          age: patient.age,
          phone: patient.phone,
          chronicConditions: patient.chronicConditions,
        } : null}
      />

      {/* New visit drawer */}
      <VisitDrawer
        open={visitOpen}
        onOpenChange={setVisitOpen}
        clerkId={clerkId}
        patientId={patientId}
        patientName={patient.name}
      />
    </div>
  );
}
