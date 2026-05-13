"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation, useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Clock, X, Search, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IOSSpinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { useI18n } from "@/lib/i18n";

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

/** Normalise phone: strips +20/0 prefix for display, stores with 20 prefix */
function normaliseForStorage(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return "20" + digits.slice(1);
  return "20" + digits;
}

/** Strip 20 prefix for display in input field */
function stripPrefix(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits.slice(2);
  if (digits.startsWith("0")) return digits.slice(1);
  return digits;
}

const defaultForm = {
  name: "",
  age: "",
  phone: "",
  chronicConditions: [] as string[],
  notes: "",
};

const inputClass = "w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow";

export function PatientIntakeDrawer({
  open,
  onOpenChange,
  clerkId,
  editPatient,
}: PatientIntakeDrawerProps) {
  const isEdit = !!editPatient;
  const { t, lang } = useI18n();

  const [form, setForm] = useState(() =>
    isEdit
      ? { ...defaultForm, ...editPatient, age: String(editPatient?.age ?? ""), phone: stripPrefix(editPatient?.phone ?? "") }
      : defaultForm
  );
  const [loading, setLoading] = useState(false);

  // Visit date & slot
  const [visitDate, setVisitDate] = useState(() => startOfDay(Date.now()));
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  // Doctor profile for slot generation
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");

  /** Working days from doctor profile (e.g. ["Mon","Tue","Wed"]) */
  const workingDays: string[] = (currentUser as any)?.availableDays ?? [];
  const hasWorkingDays = workingDays.length > 0;

  /** JS getDay() → abbreviation map */
  const DOW_ABBR: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

  // Chronic conditions options
  const conditionOptions = useQuery(api.chronicConditions.listOptions, clerkId ? { clerkId } : "skip");
  const addConditionOption = useMutation(api.chronicConditions.addOption);

  // Chronic conditions dropdown state
  const [conditionSearch, setConditionSearch] = useState("");
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const conditionRef = useRef<HTMLDivElement>(null);

  const filteredConditions = useMemo(() => {
    const opts = conditionOptions ?? [];
    if (!conditionSearch.trim()) return opts.slice(0, 15);
    const q = conditionSearch.toLowerCase();
    return opts.filter((c) => c.toLowerCase().includes(q));
  }, [conditionOptions, conditionSearch]);

  const canAddCustom = conditionSearch.trim().length > 0 &&
    !filteredConditions.some((c) => c.toLowerCase() === conditionSearch.trim().toLowerCase()) &&
    !form.chronicConditions.some((c) => c.toLowerCase() === conditionSearch.trim().toLowerCase());

  // Close dropdown on outside click
  useEffect(() => {
    if (!conditionDropdownOpen) return;
    function handle(e: MouseEvent) {
      if (conditionRef.current && !conditionRef.current.contains(e.target as Node)) {
        setConditionDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [conditionDropdownOpen]);

  // Get booked slots for selected day
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

  // Sync form when editPatient changes
  useEffect(() => {
    if (open && isEdit && editPatient) {
      setForm({
        ...defaultForm,
        name: editPatient.name,
        age: String(editPatient.age),
        phone: stripPrefix(editPatient.phone),
        chronicConditions: editPatient.chronicConditions,
        notes: "",
      });
    } else if (open && !isEdit) {
      setForm(defaultForm);
      setVisitDate(startOfDay(Date.now()));
      setSelectedSlot(null);
    }
  }, [open, isEdit, editPatient]);

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCondition(c: string) {
    if (form.chronicConditions.includes(c)) {
      set("chronicConditions", form.chronicConditions.filter((x) => x !== c));
    } else {
      set("chronicConditions", [...form.chronicConditions, c]);
    }
  }

  async function addCustomCondition() {
    const trimmed = conditionSearch.trim();
    if (!trimmed) return;
    // Add to the doctor's custom list
    await addConditionOption({ clerkId, name: trimmed });
    // Also select it
    if (!form.chronicConditions.includes(trimmed)) {
      set("chronicConditions", [...form.chronicConditions, trimmed]);
    }
    setConditionSearch("");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.name.trim() || !form.age || !form.phone.trim()) {
      toast.error("Name, age, and phone are required");
      return;
    }
    const fullPhone = normaliseForStorage(form.phone);
    setLoading(true);
    try {
      if (isEdit && editPatient) {
        await updatePatient({
          patientId: editPatient._id,
          clerkId,
          name: form.name,
          age: Number(form.age),
          phone: fullPhone,
          chronicConditions: form.chronicConditions,
        });
        toast.success("Patient updated");
      } else {
        const existing = await convex.query(api.patients.findPatientByNameAndPhone, {
          clerkId,
          name: form.name.trim(),
          phone: fullPhone,
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
            phone: fullPhone,
            chronicConditions: form.chronicConditions,
          });
          toast.success("New patient created");
        }

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

  if (!open) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{isEdit ? t("drawer.editPatient") : t("drawer.patientIntake")}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? t("drawer.updatePatient") : t("drawer.registerPatient")}
          </DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.fullName")} *</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Patient full name"
              className={inputClass}
              required
            />
          </div>

          {/* Age + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.age")} *</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                placeholder="45"
                className={inputClass}
                min={0}
                max={150}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.phone")} *</label>
              <div className="flex">
                <span className="flex items-center px-3 bg-muted/60 border border-border border-r-0 rounded-l-xl text-sm text-muted-foreground font-mono flex-shrink-0">+20</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="1142529590"
                  className={`flex-1 ${inputClass} rounded-l-none`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Chronic Conditions — Searchable Dropdown */}
          <div ref={conditionRef}>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.chronicConditions")}</label>

            {/* Selected tags */}
            {form.chronicConditions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.chronicConditions.map((c) => (
                  <span key={c} className="flex items-center gap-1 bg-[#007AFF]/10 text-[#007AFF] text-xs font-medium px-2 py-0.5 rounded-full">
                    {c}
                    <button type="button" onClick={() => toggleCondition(c)} className="hover:text-[#007AFF]/70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#007AFF] bg-background">
                <Search className="w-3.5 h-3.5 text-muted-foreground ml-3 flex-shrink-0" />
                <input
                  value={conditionSearch}
                  onChange={(e) => { setConditionSearch(e.target.value); setConditionDropdownOpen(true); }}
                  onFocus={() => setConditionDropdownOpen(true)}
                  placeholder={t("drawer.searchConditions")}
                  className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none"
                />
              </div>

              {/* Dropdown */}
              <AnimatePresence>
                {conditionDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 right-0 mt-1 bg-[var(--background)] border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto z-30"
                  >
                    {filteredConditions.map((c) => {
                      const selected = form.chronicConditions.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => { toggleCondition(c); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 ${selected ? "text-[#007AFF] font-medium" : ""}`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0" />}
                          <span className={selected ? "" : "ml-5"}>{c}</span>
                        </button>
                      );
                    })}
                    {canAddCustom && (
                      <button
                        type="button"
                        onClick={addCustomCondition}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-[#007AFF] font-medium hover:bg-[#007AFF]/5 border-t border-border transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add &quot;{conditionSearch.trim()}&quot;
                      </button>
                    )}
                    {filteredConditions.length === 0 && !canAddCustom && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">No conditions found</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{t("drawer.searchOrAdd")}</p>
          </div>

          {/* Visit fields — hidden in edit mode */}
          {!isEdit && (
            <>
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t("drawer.visitDateTime")}
                </p>
              </div>

              {/* Day strip — working days only */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {dayStrip.map((ts) => {
                  const isSelected = visitDate === ts;
                  const isToday = ts === todayTs;
                  const isPast = ts < todayTs;
                  const dow = DOW_ABBR[new Date(ts).getDay()];
                  const isWorking = !hasWorkingDays || workingDays.includes(dow);
                  const isDisabled = isPast || !isWorking;
                  return (
                    <button
                      key={ts}
                      type="button"
                      onClick={() => { if (!isDisabled) { setVisitDate(ts); setSelectedSlot(null); } }}
                      disabled={isDisabled}
                      className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl text-xs transition-all min-w-[52px] ${
                        isDisabled
                          ? "text-muted-foreground/30 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#007AFF] text-white"
                          : isToday
                          ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold"
                          : "text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span className="font-medium">
                        {new Date(ts).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" })}
                      </span>
                      <span className="text-base font-bold mt-0.5">
                        {new Date(ts).getDate()}
                      </span>
                      {!isWorking && !isPast && (
                        <span className="text-[8px] font-medium text-muted-foreground/40 mt-0.5">
                          {lang === "ar" ? "مغلق" : "Off"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Slot picker */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t("visit.timeSlot")}
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
                    {t("drawer.noTime")}
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
                        {isTaken && <span className="text-[9px]" style={{ textDecoration: "none" }}>{t("drawer.taken")}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("visit.notes")}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </>
          )}
        </form>

        <DrawerFooter className="flex flex-row gap-3 px-6 py-4 border-t border-border">
          <DrawerClose asChild>
            <button
              type="button"
              className="flex-shrink-0 text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-muted/40 transition-colors"
            >
              {t("common.cancel")}
            </button>
          </DrawerClose>
          <button
            onClick={() => handleSubmit()}
            disabled={loading}
            className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <><IOSSpinner size={16} className="text-white" /> {t("onboarding.saving")}</> : isEdit ? t("drawer.saveChanges") : t("drawer.submit")}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
