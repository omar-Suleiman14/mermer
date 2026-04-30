"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { PatientIntakeDrawer } from "@/components/patient-intake-drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus } from "lucide-react";
import Link from "next/link";

type PatientWithLastVisit = Doc<"patients"> & {
  lastVisit: Doc<"visits"> | null;
};

export default function PatientsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const [search, setSearch] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);

  const allPatients = useQuery(api.patients.listPatients, clerkId ? { clerkId } : "skip");
  const searchResults = useQuery(
    api.patients.searchPatients,
    clerkId && search.trim() ? { clerkId, search } : "skip"
  );

  const patients = (search.trim() ? searchResults : allPatients) as PatientWithLastVisit[] | undefined;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Patients" description="All your patients in one place">
        <button
          id="new-patient-btn"
          onClick={() => setIntakeOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          New Patient
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Search */}
        <div className="relative mb-5 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="patient-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
          />
        </div>

        {patients === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-base font-medium mb-1">
              {search ? "No patients found" : "No patients yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? "Try a different search term." : "Add your first patient to get started."}
            </p>
            {!search && (
              <button
                onClick={() => setIntakeOpen(true)}
                className="text-sm font-medium text-[#007AFF] hover:underline"
              >
                Add first patient
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {patients.map((patient) => {
              const initials = patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const lastVisitDate = patient.lastVisit
                ? new Date(patient.lastVisit.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null;

              return (
                <Link
                  key={patient._id}
                  href={`/dashboard/patients/${patient._id}`}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-[#007AFF]/30 hover:shadow-sm transition-all group"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#007AFF]">{initials}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm group-hover:text-[#007AFF] transition-colors truncate">
                        {patient.name}
                      </p>
                      <span className="text-xs text-muted-foreground">{patient.age}y</span>
                      {patient.chronicConditions[0] && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 bg-[#007AFF]/10 text-[#007AFF] border-0"
                        >
                          {patient.chronicConditions[0]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{patient.phone}</p>
                  </div>

                  {/* Last visit */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-[11px] text-muted-foreground">Last visit</p>
                    <p className="text-xs font-medium">{lastVisitDate ?? "No visits"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <PatientIntakeDrawer
        open={intakeOpen}
        onOpenChange={setIntakeOpen}
        clerkId={clerkId}
      />
    </div>
  );
}
