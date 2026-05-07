"use client";

import { useState, useMemo } from "react";
import { useMutation, useConvex, useQuery } from "convex/react";
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
import { TagInput } from "@/components/tag-input";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface PatientIntakeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  editPatient?: {
    _id: Id<"patients">;
    name: string;
    age: number;
    phone: string;
    chronicConditions: string[];
  } | null;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDaySlots(dayTs: number, startHour: number, endHour: number, slotMin: number): number[] {
  const slots: number[] = [];
  const cursor = new Date(dayTs);
  cursor.setHours(startHour, 0, 0, 0);
  const end = new Date(dayTs);
  end.setHours(endHour, 0, 0, 0);
  while (cursor < end) {
    slots.push(cursor.getTime());
    cursor.setMinutes(cursor.getMinutes() + slotMin);
  }
  return slots;
}

const defaultForm = {
  name: "",
  age: "",
  phone: "",
  chronicConditions: [] as string[],
  notes: "",
};

export function PatientIntakeDrawer({
  open,
  onOpenChange,
  clerkId,
  editPatient,
}: PatientIntakeDrawerProps) {
  const isEdit = !!editPatient;

  const [form, setForm] = useState(() =>
    isEdit
      ? { ...defaultForm, ...editPatient, age: String(editPatient?.age ?? "") }
      : defaultForm
  );
  const [loading, setLoading] = useState(false);

  // Visit date & slot
  const [visitDate, setVisitDate] = useState(() => startOfDay(Date.now()));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Doctor profile for slot generation
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");

  // Get booked slots for selected day (appointments + queue entries)
  const bookedAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId ? { clerkId, dayStart: visitDate } : "skip"
  );
  
  const takenTimestamps = useMemo(() => {
    if (!bookedAppointments) return new Set<number>();
    return new Set(
      bookedAppointments
        .filter((a) => a.status !== "cancelled")
        .map((a) => a.date)
    );
  }, [bookedAppointments]);

  const daySlots = useMemo(() => {
    const startHour = (currentUser as any)?.workingHoursStart ?? 9;
    const endHour = (currentUser as any)?.workingHoursEnd ?? 17;
    const slotMin = currentUser?.slotDurationMinutes ?? 30;
    return buildDaySlots(visitDate, startHour, endHour, slotMin);
  }, [currentUser, visitDate]);

  const createPatient = useMutation(api.patients.createPatient);
  const updatePatient = useMutation(api.patients.updatePatient);
  const addManualAppointment = useMutation(api.appointments.addManualAppointment);
  const convex = useConvex();

  function handleOpen(v: boolean) {
    if (v && isEdit && editPatient) {
      setForm({
        ...defaultForm,
        name: editPatient.name,
        age: String(editPatient.age),
        phone: editPatient.phone,
        chronicConditions: editPatient.chronicConditions,
        notes: "",
      });
    } else if (v && !isEdit) {
      setForm(defaultForm);
      setVisitDate(startOfDay(Date.now()));
      setSelectedSlot(null);
    }
    onOpenChange(v);
  }

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.age || !form.phone.trim()) {
      toast.error("Name, age, and phone are required");
      return;
    }
    setLoading(true);
    try {
      if (isEdit && editPatient) {
        await updatePatient({
          patientId: editPatient._id,
          clerkId,
          name: form.name,
          age: Number(form.age),
          phone: form.phone,
          chronicConditions: form.chronicConditions,
        });
        toast.success("Patient updated");
      } else {
        const existing = await convex.query(api.patients.findPatientByNameAndPhone, {
          clerkId,
          name: form.name.trim(),
          phone: form.phone.trim(),
        });

        let patientId: Id<"patients">;
        if (existing) {
          patientId = existing._id;
          toast.success("Returning patient — visit added to history");
        } else {
          patientId = await createPatient({
            clerkId,
            name: form.name,
            age: Number(form.age),
            phone: form.phone,
            chronicConditions: form.chronicConditions,
          });
          toast.success("New patient created");
        }

        // The appointment date = selected slot OR noon of selected day
        const visitTs = selectedSlot ?? (visitDate + 12 * 60 * 60 * 1000);
        
        await addManualAppointment({
          clerkId,
          patientId,
          date: visitTs,
          notes: form.notes || undefined,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message ?? "";
      if (msg.includes("already booked")) {
        toast.error("This time slot is already taken — pick another");
      } else {
        toast.error("Something went wrong");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Build 7-day strip for date selection
  const todayTs = startOfDay(Date.now());
  const dayStrip = useMemo(() => {
    const days: number[] = [];
    for (let i = -1; i <= 5; i++) days.push(todayTs + i * 86400000);
    return days;
  }, [todayTs]);

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>{isEdit ? "Edit Patient" : "Patient Intake"}</DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update patient information."
              : "Register a new patient and log their visit."}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-4 space-y-4 pb-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="intake-name">Full Name *</Label>
              <input
                id="intake-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Patient full name"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                required
              />
            </div>

            {/* Age + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="intake-age">Age *</Label>
                <input
                  id="intake-age"
                  type="number"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  min={0}
                  max={150}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="intake-phone">Phone *</Label>
                <input
                  id="intake-phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Chronic conditions */}
            <div className="space-y-1.5">
              <Label>Chronic Conditions</Label>
              <TagInput
                value={form.chronicConditions}
                onChange={(v) => set("chronicConditions", v)}
                placeholder="Type condition and press Enter..."
              />
              <p className="text-[11px] text-muted-foreground">e.g. Diabetes Type 2, Hypertension</p>
            </div>

            {/* Visit fields — hidden in edit mode */}
            {!isEdit && (
              <>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Visit Date &amp; Time
                  </p>
                </div>

                {/* Day strip */}
                <div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {dayStrip.map((dayTs) => {
                      const isSelected = visitDate === dayTs;
                      const isToday = dayTs === todayTs;
                      return (
                        <button
                          key={dayTs}
                          type="button"
                          onClick={() => {
                            setVisitDate(dayTs);
                            setSelectedSlot(null); // reset slot when date changes
                          }}
                          className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl text-xs transition-all min-w-[52px] ${
                            isSelected
                              ? "bg-[#007AFF] text-white"
                              : isToday
                              ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold"
                              : "text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          <span className="font-medium">
                            {new Date(dayTs).toLocaleDateString("en-US", { weekday: "short" })}
                          </span>
                          <span className="text-base font-bold mt-0.5">
                            {new Date(dayTs).getDate()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slot picker */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Time Slot
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(null)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all border ${
                        selectedSlot === null
                          ? "bg-[#007AFF] text-white border-[#007AFF]"
                          : "border-border text-muted-foreground hover:border-[#007AFF]/40"
                      }`}
                    >
                      No time
                    </button>
                    {daySlots.map((ts) => {
                      const isTaken = takenTimestamps.has(ts);
                      const isSelected = selectedSlot === ts;
                      return (
                        <button
                          key={ts}
                          type="button"
                          onClick={() => { if (!isTaken) setSelectedSlot(ts); }}
                          disabled={isTaken}
                          className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-0.5 ${
                            isTaken
                              ? "border-border/40 bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-[#007AFF] text-white border-[#007AFF]"
                              : "border-border hover:border-[#007AFF]/40 hover:text-[#007AFF]"
                          }`}
                        >
                          {formatTime(ts)}
                          {isTaken && <span className="text-[9px]" style={{ textDecoration: "none" }}>Taken</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="intake-notes">Notes</Label>
                  <textarea
                    id="intake-notes"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Optional free-form notes..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </form>

        <DrawerFooter className="flex flex-row gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Submit"}
          </button>
          <DrawerClose className="flex-shrink-0 text-sm text-muted-foreground border border-border rounded-lg px-4 py-2.5 hover:text-foreground">
            Cancel
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
