"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  X,
  Clock,
  Phone,
  User,
  Loader2,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/30",
    confirmed: "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30",
    cancelled: "bg-red-100 text-red-500 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

export default function AppointmentsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");

  const appointments = useQuery(api.appointments.listAppointments, clerkId ? { clerkId } : "skip");
  const updateStatus = useMutation(api.appointments.updateAppointmentStatus);

  async function handleStatus(appointmentId: Id<"appointments">, status: "confirmed" | "cancelled") {
    try {
      await updateStatus({ clerkId, appointmentId, status });
      toast.success(status === "confirmed" ? "Appointment confirmed" : "Appointment cancelled");
    } catch {
      toast.error("Failed to update");
    }
  }

  if (currentUser?.tier !== "premium") {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="Appointments" />
        <div className="flex-1 flex items-center justify-center text-center px-6">
          <div>
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold mb-2">Premium Feature</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Online appointments with WhatsApp automation are available on the Premium plan. Contact your admin to upgrade.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = (appointments ?? [])
    .filter((a) => a.date >= today.getTime())
    .sort((a, b) => a.date - b.date);
  const past = (appointments ?? [])
    .filter((a) => a.date < today.getTime())
    .sort((a, b) => b.date - a.date);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Appointments"
        description="Online bookings from your public profile"
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Upcoming */}
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-[#007AFF]" />
            Upcoming
            {upcoming.length > 0 && (
              <span className="text-xs text-muted-foreground font-normal">({upcoming.length})</span>
            )}
          </h2>

          {appointments === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No upcoming appointments. Share your profile link with patients!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((appt, i) => (
                <motion.div
                  key={appt._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Date/time */}
                  <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-2xl font-bold leading-tight">
                      {new Date(appt.date).getDate()}
                    </p>
                    <p className="text-xs text-[#007AFF] font-medium">
                      {new Date(appt.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                    </p>
                  </div>

                  <div className="w-px h-10 bg-border flex-shrink-0" />

                  {/* Patient info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{appt.patientName}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {appt.patientPhone}
                      </span>
                      {appt.patientAge && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {appt.patientAge}y
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {appt.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStatus(appt._id, "confirmed")}
                        className="p-2 rounded-lg border border-[#34c759]/40 text-[#34c759] hover:bg-[#34c759]/10 transition-colors"
                        title="Confirm"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatus(appt._id, "cancelled")}
                        className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Past Appointments
            </h2>
            <div className="space-y-2">
              {past.slice(0, 20).map((appt) => (
                <div
                  key={appt._id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-60"
                >
                  <div className="flex-shrink-0 text-center min-w-[52px]">
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.date).toLocaleDateString("en-US", { month: "short" })}
                    </p>
                    <p className="text-xl font-bold leading-tight">
                      {new Date(appt.date).getDate()}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{appt.patientName}</p>
                      <StatusBadge status={appt.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{appt.patientPhone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
