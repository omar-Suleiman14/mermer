"use client";

import { use, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n/client";
import { IOSSpinner } from "@/components/ui/spinner";
import { format } from "date-fns";

export default function PrintPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const { visitId } = use(params);
  const { user, isLoaded } = useUser();
  const { t, dir, lang } = useI18n();

  const data = useQuery(
    api.visits.getVisit,
    isLoaded && user?.id
      ? { clerkId: user.id, visitId: visitId as Id<"visits"> }
      : "skip"
  );

  useEffect(() => {
    if (data) {
      // Delay printing slightly to ensure fonts and styles are loaded
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!isLoaded || data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IOSSpinner size={32} />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Visit not found</p>
      </div>
    );
  }

  const { visit, doctor, patient, followUp } = data;
  const isArabic = lang === "ar";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2rem;
            background: white;
            color: black;
          }
          /* Hide the sidebar and any extra dashboard elements */
          #print-area {
             margin: 0 !important;
          }
        }
      `}} />
      <div className="max-w-3xl mx-auto my-8 p-8 bg-white border border-border shadow-sm rounded-2xl" id="print-area" dir={dir}>
        {/* Header */}
        <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {t("print.dr")} {doctor.name}
            </h1>
            <p className="text-gray-600 text-lg">{doctor.specialty || t("specialty.Other")}</p>
            {(doctor.clinicName || doctor.clinicAddress) && (
              <div className="text-sm text-gray-500 mt-2 space-y-0.5">
                {doctor.clinicName && <p>{doctor.clinicName}</p>}
                {doctor.clinicAddress && <p>{doctor.clinicAddress}</p>}
              </div>
            )}
            {doctor.phone && <p className="text-sm text-gray-500">{doctor.phone}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-200 uppercase tracking-widest">{t("print.prescription")}</h2>
            <p className="text-sm text-gray-500 mt-2">
              {t("print.date")}: {format(new Date(visit.date), "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        {/* Patient Info */}
        <div className="flex gap-8 mb-8 text-sm text-gray-800 bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div>
            <span className="text-gray-500 mr-2 ml-2">{t("print.patient")}:</span>
            <span className="font-semibold text-base">{patient.name}</span>
          </div>
          {patient.age && (
            <div>
              <span className="text-gray-500 mr-2 ml-2">{t("print.age")}:</span>
              <span className="font-medium">{patient.age}</span>
            </div>
          )}
        </div>

        {/* Rx Symbol */}
        <div className="mb-6">
          <span className="text-4xl font-serif italic font-bold text-gray-800">Rx</span>
        </div>

        {/* Medications */}
        {visit.prescribedMedications && visit.prescribedMedications.length > 0 ? (
          <div className="space-y-6 min-h-[300px]">
            {visit.prescribedMedications.map((med: any, idx: number) => {
              if (typeof med === 'string') {
                return (
                  <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0">
                    <p className="text-lg font-bold text-gray-900">{med}</p>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex flex-col gap-1 border-b border-gray-100 pb-4 last:border-0">
                  <p className="text-lg font-bold text-gray-900">{med.name}</p>
                  <div className="flex gap-4 text-sm text-gray-700">
                    {med.frequency && <p>• {t(med.frequency) || med.frequency}</p>}
                    {med.notes && <p>• {t(med.notes) || med.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="min-h-[300px] flex items-center justify-center text-gray-400 italic">
            No medications prescribed
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-2">{t("patient.notesSection")}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.notes}</p>
          </div>
        )}

        {/* Follow Up */}
        {followUp && (
          <div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-700 text-center">
            <span className="font-medium text-gray-900">{t("schedule.followUp")}: </span>
            {format(new Date(followUp.followUpDate), "EEEE, dd MMMM yyyy")} {t("notifications.at")} {followUp.followUpTime}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>Powered by mermer</p>
        </div>
      </div>
    </>
  );
}
