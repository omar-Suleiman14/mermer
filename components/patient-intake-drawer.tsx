"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useMutation, useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Clock, X, Search, Plus, Check, CalendarIcon, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IOSSpinner } from "@/components/ui/spinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

interface PatientIntakeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  editPatient?: {
    _id: Id<"patients">;
    name: string;
    age: number;
    phone: string;
    gender?: "male" | "female" | "other";
    chronicConditions: string[];
  } | null;
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
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) {
    digits = digits.slice(2);
  }
  return digits.replace(/^0+/, "");
}

/** Sanitise phone input: strip non-digits, strip leading zeros, cap at 10 */
function sanitisePhoneInput(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10);
}

interface FormState {
  name: string;
  age: string;
  phone: string;
  gender: "male" | "female" | "other";
  chronicConditions: string[];
  notes: string;
  reasonForVisit: string;
}

const defaultForm: FormState = {
  name: "",
  age: "",
  phone: "",
  gender: "other",
  chronicConditions: [],
  notes: "",
  reasonForVisit: "",
};

const inputClass =
  "w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow";

export function PatientIntakeDrawer({
  open,
  onOpenChange,
  clerkId,
  editPatient,
}: PatientIntakeDrawerProps) {
  const isEdit = !!editPatient;
  const { t, lang, dir } = useI18n();
  const isDesktop = useIsDesktop();
  const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();

  const [form, setForm] = useState<FormState>(() =>
    isEdit && editPatient
      ? {
          name: editPatient.name,
          age: String(editPatient.age ?? ""),
          phone: stripPrefix(editPatient.phone ?? ""),
          gender: editPatient.gender ?? "other",
          chronicConditions: editPatient.chronicConditions ?? [],
          notes: "",
          reasonForVisit: "",
        }
      : defaultForm
  );
  const [loading, setLoading] = useState(false);

  // Optional visit toggle
  const [addVisit, setAddVisit] = useState(true);

  // Visit date & time
  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date());
  const [visitTime, setVisitTime] = useState<string>("10:00");
  const [calOpen, setCalOpen] = useState(false);

  // Doctor profile for slot generation
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");

  function isNonWorkingDay(): boolean {
    return false;
  }

  // Query booked slots for selected date
  const activeDateStart = visitDate
    ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, 0, 0, 0).getTime()
    : 0;
  const activeDateEnd = visitDate
    ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 23, 59, 59, 999).getTime()
    : 0;

  const existingVisitsOnDate = useQuery(
    api.visits.getVisitsByDateRange,
    clerkId && visitDate ? { clerkId, startDate: activeDateStart, endDate: activeDateEnd } : "skip"
  );

  const timeSlots = useMemo(() => {
    const startHour = currentUser?.workingHoursStart ?? 9;
    const endHour = currentUser?.workingHoursEnd ?? 17;
    const slotMin = currentUser?.slotDurationMinutes ?? 30;

    const reservedTimes = new Set<string>();
    if (existingVisitsOnDate) {
      for (const v of existingVisitsOnDate) {
        const d = new Date(v.date);
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        reservedTimes.add(`${hh}:${mm}`);
      }
    }

    const slots: { timeStr: string; label: string; isWorkingHour: boolean; isReserved: boolean }[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += slotMin) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const timeStr = `${hh}:${mm}`;
        const ampm = h >= 12 ? (lang === "ar" ? "م" : "PM") : lang === "ar" ? "ص" : "AM";
        const displayH = h % 12 || 12;
        const label = `${displayH}:${mm} ${ampm}`;
        const isWorkingHour = h >= startHour && h < endHour;
        const isReserved = reservedTimes.has(timeStr);
        slots.push({ timeStr, label, isWorkingHour, isReserved });
      }
    }
    return slots;
  }, [currentUser, existingVisitsOnDate, lang]);

  // Auto-select first available working slot
  useEffect(() => {
    if (timeSlots.length > 0 && visitTime === "10:00") {
      const firstAvailable = timeSlots.find((s) => s.isWorkingHour && !s.isReserved);
      if (firstAvailable) {
        setTimeout(() => setVisitTime(firstAvailable.timeStr), 0);
      }
    }
  }, [timeSlots, visitTime]);

  // Chronic conditions options
  const conditionOptions = useQuery(api.chronicConditions.listOptions, clerkId ? { clerkId } : "skip");
  const addConditionOption = useMutation(api.chronicConditions.addOption);

  const [conditionSearch, setConditionSearch] = useState("");
  const [conditionDropdownOpen, setConditionDropdownOpen] = useState(false);
  const conditionRef = useRef<HTMLDivElement>(null);

  const filteredConditions = useMemo(() => {
    const opts = conditionOptions ?? [];
    if (!conditionSearch.trim()) return opts.slice(0, 15);
    const q = conditionSearch.toLowerCase();
    return opts.filter((c) => c.toLowerCase().includes(q));
  }, [conditionOptions, conditionSearch]);

  const canAddCustom =
    conditionSearch.trim().length > 0 &&
    !filteredConditions.some((c) => c.toLowerCase() === conditionSearch.trim().toLowerCase()) &&
    !form.chronicConditions.some((c) => c.toLowerCase() === conditionSearch.trim().toLowerCase());

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

  const createPatient = useMutation(api.patients.createPatient);
  const updatePatient = useMutation(api.patients.updatePatient);
  const addManualAppointment = useMutation(api.appointments.addManualAppointment);
  const convex = useConvex();

  // Sync form when editPatient changes
  useEffect(() => {
    setTimeout(() => {
      if (open && isEdit && editPatient) {
        setForm({
          ...defaultForm,
          name: editPatient.name,
          age: String(editPatient.age),
          phone: stripPrefix(editPatient.phone),
          gender: editPatient.gender ?? "other",
          chronicConditions: editPatient.chronicConditions,
          notes: "",
          reasonForVisit: "",
        });
      } else if (open && !isEdit) {
        setForm(defaultForm);
        setAddVisit(true);
        setVisitDate(new Date());
        setVisitTime("10:00");
      }
    }, 0);
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
    await addConditionOption({ clerkId, name: trimmed });
    if (!form.chronicConditions.includes(trimmed)) {
      set("chronicConditions", [...form.chronicConditions, trimmed]);
    }
    setConditionSearch("");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.name.trim() || !form.age || !form.phone.trim()) {
      toast.error(lang === "ar" ? "الاسم والعمر ورقم الهاتف مطلوبة" : "Name, age, and phone are required");
      return;
    }

    const phoneRegex = /^1[0125][0-9]{8}$/;
    if (!phoneRegex.test(form.phone)) {
      toast.error(lang === "ar" ? "رقم الهاتف غير صالح." : "Invalid phone number.");
      return;
    }

    if (!isEdit && addVisit && !visitDate) {
      toast.error("Please pick a visit date");
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
          gender: form.gender as "male" | "female" | "other",
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
          toast.success(addVisit ? "Returning patient — visit added to history" : "Returning patient found");
        } else {
          patientId = await createPatient({
            clerkId,
            name: form.name,
            age: Number(form.age),
            gender: form.gender as "male" | "female" | "other",
            phone: fullPhone,
            chronicConditions: form.chronicConditions,
          });
          toast.success(addVisit ? "New patient created & visit scheduled" : "New patient created");
        }

        if (addVisit && visitDate) {
          const selectedSlot = timeSlots.find((s) => s.timeStr === visitTime);
          if (selectedSlot?.isReserved) {
            toast.error("This time slot is already reserved — pick another");
            setLoading(false);
            return;
          }
          const [hh, mm] = visitTime.split(":").map(Number);
          const exactDate = new Date(visitDate);
          exactDate.setHours(hh ?? 9, mm ?? 0, 0, 0);

          await addManualAppointment({
            clerkId,
            patientId,
            date: exactDate.getTime(),
            notes: form.notes || undefined,
          });
        }
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
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

  const formContent = (
    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
      {/* Name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.fullName")} *</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={dir === "rtl" ? "الاسم الكامل للمريض" : "Patient full name"}
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
            placeholder={dir === "rtl" ? "مثال: 45" : "45"}
            className={inputClass}
            min={0}
            max={150}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.phone")} *</label>
          <div className="flex" dir="ltr">
            <span className="flex items-center px-3 bg-muted/60 border border-border border-r-0 rounded-l-xl text-sm text-muted-foreground font-mono shrink-0">+20</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", sanitisePhoneInput(e.target.value))}
              placeholder={dir === "rtl" ? "1023456789" : "1023456789"}
              className={`flex-1 ${inputClass} rounded-l-none`}
              maxLength={10}
              required
            />
          </div>
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">{dir === "rtl" ? "الجنس" : "Gender"}</label>
        <select
          value={form.gender}
          onChange={(e) => set("gender", e.target.value)}
          className={inputClass}
        >
          <option value="male">{dir === "rtl" ? "ذكر" : "Male"}</option>
          <option value="female">{dir === "rtl" ? "أنثى" : "Female"}</option>
        </select>
      </div>

      {/* Chronic Conditions */}
      <div ref={conditionRef}>
        <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("drawer.chronicConditions")}</label>
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
        <div className="relative">
          <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#007AFF] bg-background">
            <Search className="w-3.5 h-3.5 text-muted-foreground ml-3 shrink-0" />
            <input
              value={conditionSearch}
              onChange={(e) => {
                setConditionSearch(e.target.value);
                setConditionDropdownOpen(true);
              }}
              onFocus={() => setConditionDropdownOpen(true)}
              placeholder={t("drawer.searchConditions")}
              className="flex-1 px-2 py-2.5 text-sm bg-transparent outline-none"
            />
          </div>
          <AnimatePresence>
            {conditionDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 right-0 mt-1 bg-background border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto z-30"
              >
                {filteredConditions.map((c) => {
                  const selected = form.chronicConditions.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        toggleCondition(c);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-start text-sm transition-colors hover:bg-muted/40 ${selected ? "text-[#007AFF] font-medium" : ""}`}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-[#007AFF] shrink-0" />}
                      <span className={selected ? "" : "ml-5"}>{c}</span>
                    </button>
                  );
                })}
                {canAddCustom && (
                  <button
                    type="button"
                    onClick={addCustomCondition}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-start text-sm text-[#007AFF] font-medium hover:bg-[#007AFF]/5 border-t border-border transition-colors"
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

      {/* Visit section — hidden in edit mode */}
      {!isEdit && (
        <>
          {/* Toggle */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t("drawer.visitDateTime") || "Schedule a Visit"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("drawer.visitOptional") || "Optional - you can add a visit later"}</p>
              </div>
              <Switch checked={addVisit} onCheckedChange={setAddVisit} />
            </div>
          </div>

          <AnimatePresence>
            {addVisit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Date + Time grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Calendar */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> {t("visit.date") || "Date"} *
                      </p>
                      <Popover open={calOpen} onOpenChange={setCalOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border border-border rounded-xl hover:border-[#007AFF]/50 transition-colors text-start"
                          >
                            <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>
                              {visitDate
                                ? visitDate.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : (dir === "rtl" ? "اختر تاريخاً" : "Pick a date")}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={visitDate}
                            onSelect={(d) => {
                              if (d) {
                                setVisitDate(d);
                                setCalOpen(false);
                                setVisitTime("10:00");
                              }
                            }}
                            disabled={(d) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return d < today || isNonWorkingDay();
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time slots */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t("visit.timeSlot")}
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                        {timeSlots
                          .filter((s) => s.isWorkingHour)
                          .map((slot) => (
                            <button
                              key={slot.timeStr}
                              type="button"
                              onClick={() => !slot.isReserved && setVisitTime(slot.timeStr)}
                              disabled={slot.isReserved}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                slot.isReserved
                                  ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through"
                                  : visitTime === slot.timeStr
                                  ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold"
                                  : "hover:bg-muted/30"
                              }`}
                            >
                              <span>{slot.label}</span>
                              {slot.isReserved && (
                                <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
                                  {t("visit.reserved") || "Reserved"}
                                </span>
                              )}
                              {!slot.isReserved && visitTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        {timeSlots.filter((s) => s.isWorkingHour).length === 0 && (
                          <p className="px-3 py-4 text-xs text-muted-foreground text-center">{dir === "rtl" ? "لم يتم تحديد ساعات عمل" : "No working hours configured"}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reason for visit */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("visit.reasonForVisit")}</label>
                    <input
                      type="text"
                      value={form.reasonForVisit}
                      onChange={(e) => set("reasonForVisit", e.target.value)}
                      placeholder={dir === "rtl" ? "مثال: متابعة، فحص، شكوى حادة..." : "e.g. Follow-up, checkup, acute complaint…"}
                      className={inputClass}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("visit.notes")}</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes", e.target.value)}
                      placeholder={dir === "rtl" ? "ملاحظات اختيارية..." : "Optional notes..."}
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </form>
  );

  const footerContent = (
    <div className="flex flex-row gap-3 px-6 py-4 border-t border-border">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="shrink-0 text-sm text-muted-foreground border border-border rounded-xl px-4 py-2.5 hover:bg-muted/40 transition-colors"
      >
        {t("common.cancel")}
      </button>
      <button
        onClick={() => handleSubmit()}
        disabled={loading}
        className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 px-4 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <IOSSpinner size={16} className="text-white" /> {t("onboarding.saving")}
          </>
        ) : isEdit ? (
          t("drawer.saveChanges")
        ) : addVisit ? (
          t("drawer.submit")
        ) : (
          dir === "rtl" ? "حفظ المريض فقط" : "Save Patient Only"
        )}
      </button>
    </div>
  );

  // ── DESKTOP: centered modal popup ─────────────────────────────────────────
  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            dir={dir}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => onOpenChange(false)}
            />
            {/* Panel */}
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative z-10 w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold">{isEdit ? t("drawer.editPatient") : t("drawer.patientIntake")}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isEdit ? t("drawer.updatePatient") : t("drawer.registerPatient")}
                  </p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {formContent}
              {footerContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // ── MOBILE: bottom drawer ──────────────────────────────────────────────────
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[0.65, 0.9]}
    >
      <DrawerContent
        dir={dir}
        style={
          isKeyboardOpen && keyboardHeight > 0
            ? { paddingBottom: keyboardHeight }
            : undefined
        }
      >
        <DrawerHeader>
          <DrawerTitle>{isEdit ? t("drawer.editPatient") : t("drawer.patientIntake")}</DrawerTitle>
          <DrawerDescription>
            {isEdit ? t("drawer.updatePatient") : t("drawer.registerPatient")}
          </DrawerDescription>
        </DrawerHeader>
        {formContent}
        <DrawerFooter className="p-0">
          {footerContent}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
