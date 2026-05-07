"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { PatientIntakeDrawer } from "@/components/patient-intake-drawer";
import { toast } from "sonner";
import { Search, UserPlus } from "lucide-react";

interface AddToQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  selectedDate?: number; // midnight timestamp of the target day
  /** If provided, booking goes into this specific slot */
  preselectedSlot?: number | null;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AddToQueueDrawer({
  open,
  onOpenChange,
  clerkId,
  selectedDate,
  preselectedSlot,
}: AddToQueueDrawerProps) {
  const dayTs = selectedDate ?? startOfDay(Date.now());

  // ── Search ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);

  const patients = useQuery(
    api.patients.searchPatients,
    clerkId ? { clerkId, search } : "skip"
  );
  const addManualAppointment = useMutation(api.appointments.addManualAppointment);

  function resetState() {
    setSearch("");
  }

  async function handleSelectPatient(patientId: Id<"patients">) {
    // If no preselected slot, we use the start of the day (doctor will see it
    // as a general booking and can reschedule if needed).
    const bookingTime = preselectedSlot ?? dayTs;
    try {
      await addManualAppointment({
        clerkId,
        patientId,
        date: bookingTime,
      });
      toast.success(
        preselectedSlot
          ? `Patient booked at ${formatTime(preselectedSlot)}`
          : "Patient added to schedule"
      );
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("already booked")) {
        toast.error("This time slot is already taken — pick another slot first");
      } else {
        toast.error("Failed to add to schedule");
      }
    }
  }

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) resetState();
          onOpenChange(v);
        }}
      >
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Add Patient to Schedule</DrawerTitle>
            <DrawerDescription>
              {preselectedSlot
                ? `Booking for ${formatTime(preselectedSlot)} — select a patient below.`
                : "Search for a patient or create a new one."}
            </DrawerDescription>
          </DrawerHeader>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Patient list */}
          <div className="px-4 overflow-y-auto flex-1 space-y-1.5 pb-2">
            {patients === undefined ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Loading...
              </p>
            ) : patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  {search
                    ? `No patients found for "${search}"`
                    : "No patients yet"}
                </p>
              </div>
            ) : (
              patients.map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleSelectPatient(p._id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#007AFF]">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-[#007AFF]">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.age}y · {p.phone}
                    </p>
                  </div>
                  <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-[#007AFF] flex-shrink-0" />
                </button>
              ))
            )}
          </div>

          {/* New patient */}
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={() => {
                onOpenChange(false);
                setTimeout(() => setIntakeOpen(true), 150);
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#007AFF] hover:underline py-2"
            >
              <UserPlus className="w-4 h-4" />
              New patient — create profile
            </button>
          </div>

          <DrawerFooter>
            <DrawerClose className="text-sm text-muted-foreground hover:text-foreground">
              Cancel
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <PatientIntakeDrawer
        open={intakeOpen}
        onOpenChange={(v) => {
          setIntakeOpen(v);
          if (!v) resetState();
        }}
        clerkId={clerkId}
      />
    </>
  );
}
