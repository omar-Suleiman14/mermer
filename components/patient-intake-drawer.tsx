"use client";

import { useState } from "react";
import { useMutation, useConvex } from "convex/react";
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

interface PatientIntakeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  // If provided, pre-fills patient data for editing (no visit fields)
  editPatient?: {
    _id: Id<"patients">;
    name: string;
    age: number;
    phone: string;
    chronicConditions: string[];
  } | null;
}

const now = new Date();

const defaultForm = {
  name: "",
  age: "",
  phone: "",
  chronicConditions: [] as string[],
  visitDate: now.toLocaleDateString("en-CA"),
  visitTime: now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
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

  const createPatient = useMutation(api.patients.createPatient);
  const updatePatient = useMutation(api.patients.updatePatient);
  const createVisit = useMutation(api.visits.createVisit);
  const convex = useConvex();

  // Reset form when drawer opens
  function handleOpen(open: boolean) {
    if (open && isEdit && editPatient) {
      setForm({
        ...defaultForm,
        name: editPatient.name,
        age: String(editPatient.age),
        phone: editPatient.phone,
        chronicConditions: editPatient.chronicConditions,
        visitDate: defaultForm.visitDate,
        visitTime: defaultForm.visitTime,
        notes: "",
      });
    } else if (open && !isEdit) {
      setForm(defaultForm);
    }
    onOpenChange(open);
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
        // Check for existing patient
        const existing = await checkExisting();
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

        // Create the visit if there are notes
        if (form.notes.trim() || !isEdit) {
          await createVisit({
            clerkId,
            patientId,
            date: new Date(`${form.visitDate}T${form.visitTime}`).getTime(),
            notes: form.notes,
          });
        }
      }
      onOpenChange(false);
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Imperatively fetch to see if patient already exists
  async function checkExisting() {
    return await convex.query(api.patients.findPatientByNameAndPhone, {
      clerkId,
      name: form.name.trim(),
      phone: form.phone.trim(),
    });
  }

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>
            {isEdit ? "Edit Patient" : "Patient Intake"}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Update patient information."
              : "Register a new patient or add a visit for a returning one."}
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
                <Label htmlFor="intake-phone">Phone Number *</Label>
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
                    Visit Details
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="intake-date">Visit Date</Label>
                    <input
                      id="intake-date"
                      type="date"
                      value={form.visitDate}
                      onChange={(e) => set("visitDate", e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="intake-time">Visit Time</Label>
                    <input
                      id="intake-time"
                      type="time"
                      value={form.visitTime}
                      onChange={(e) => set("visitTime", e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                      required
                    />
                  </div>
                </div>

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
