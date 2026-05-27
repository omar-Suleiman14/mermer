"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Phone, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const PatientIntakeDrawer = dynamic(() => import("@/components/patient-intake-drawer").then(m => m.PatientIntakeDrawer));
import { useI18n } from "@/lib/i18n/client";

export default function PatientsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir } = useI18n();
  const [search, setSearch] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);

  const patients = useQuery(
    api.patients.searchPatients,
    clerkId ? { clerkId, search } : "skip"
  );
  const allPatients = useQuery(
    api.patients.searchPatients,
    clerkId ? { clerkId, search: "" } : "skip"
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("patients.title")}
        description={`${allPatients?.length ?? "…"} ${t("patients.registered")}`}
      >
        <button
          onClick={() => setIntakeOpen(true)}
          className="flex items-center gap-2 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors shadow-sm text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("patients.newPatient")}</span>
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative">
            <Search className={`absolute ${dir === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("patients.search")}
              className={`w-full ${dir === "rtl" ? "pr-11 pl-4" : "pl-11 pr-4"} py-3 text-sm bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent`}
            />
          </div>

          {patients === undefined ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
                <UserPlus className="w-8 h-8 text-[#007AFF]" />
              </div>
              <p className="font-semibold text-base mb-1">
                {search ? t("patients.noResults").replace("{q}", search) : t("patients.noPatients")}
              </p>
              <p className="text-sm text-muted-foreground mb-5">
                {search ? t("patients.tryDifferent") : t("patients.addFirst")}
              </p>
              {!search && (
                <button onClick={() => setIntakeOpen(true)} className="text-sm font-semibold text-[#007AFF] hover:underline">
                  + {t("patients.addFirstAction")}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patients.map((patient) => {
                const initials = patient.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                const palettes = [
                  { bg: "bg-[#007AFF]/10", text: "text-[#007AFF]" },
                  { bg: "bg-[#34c759]/10", text: "text-[#34c759]" },
                  { bg: "bg-[#FF9500]/10", text: "text-[#FF9500]" },
                  { bg: "bg-[#5856D6]/10", text: "text-[#5856D6]" },
                  { bg: "bg-[#FF2D55]/10", text: "text-[#FF2D55]" },
                ];
                const pal = palettes[patient.name.charCodeAt(0) % palettes.length];

                return (
                  <Link
                    key={patient._id}
                    href={`/dashboard/patients/${patient._id}`}
                    className="group bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#007AFF]/20 transition-all flex items-center gap-4"
                  >
                    <div className={`relative w-12 h-12 rounded-full ${pal.bg} flex items-center justify-center shrink-0`}>
                      <span className={`text-base font-bold ${pal.text}`}>{initials}</span>
                      {(patient as any).hasActiveinstallment && (
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-white dark:bg-[#1c1c1a] rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#AF52DE] animate-pulse" title="Active installment" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm group-hover:text-[#007AFF] transition-colors truncate">{patient.name}</p>
                        {(patient as any).hasActiveinstallment && (
                          <span className="shrink-0 text-[9px] font-bold text-[#AF52DE] bg-[#AF52DE]/10 px-1.5 py-0.5 rounded-md border border-[#AF52DE]/20 uppercase">
                            {t("dashboard.installment") || "installment"}
                          </span>
                        )}
                        {(patient as any).hasPastDue && (
                          <span className="shrink-0 text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md border border-red-500/20 uppercase">
                            Past Due
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{patient.age}y</span>
                        <span className="flex items-center gap-1 truncate"><Phone className="w-3 h-3" />{patient.phone}</span>
                      </div>
                      {patient.chronicConditions.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {patient.chronicConditions.slice(0, 2).map((c: string) => (
                            <span key={c} className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full text-muted-foreground">{c}</span>
                          ))}
                          {patient.chronicConditions.length > 2 && (
                            <span className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded-full text-muted-foreground">+{patient.chronicConditions.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground/40 group-hover:text-[#007AFF] shrink-0 transition-colors ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <PatientIntakeDrawer open={intakeOpen} onOpenChange={setIntakeOpen} clerkId={clerkId} />
    </div>
  );
}
