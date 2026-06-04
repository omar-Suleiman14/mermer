"use client";

import { useState, useRef, useCallback, useMemo, useEffect, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  X,
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  CalendarIcon,
  Clock,
  StickyNote,
  ImageIcon,
  AlertTriangle,
  Pill,
  Plus,
  Trash2,
  ChevronDown,
  Printer,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TOP_EGYPTIAN_MEDS } from "@/lib/topEgyptianMeds";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MedicationEntry {
  name: string;
  frequency: string;
  notes: string;
}

// ── Creatable Combobox ─────────────────────────────────────────────────────────
interface CreatableComboboxProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onCreateOption: (val: string) => void;
  placeholder: string;
  accentColor?: string;
}

function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateOption,
  placeholder,
  accentColor = "#007AFF",
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const [visibleCount, setVisibleCount] = useState(50);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Sync external value changes
  useEffect(() => {
    setInputVal(value);
  }, [value]);

  // Reset pagination on input change
  useEffect(() => {
    setVisibleCount(50);
  }, [inputVal]);

  // Position dropdown via portal using trigger's bounding rect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const filtered = useMemo(() => {
    const q = inputVal.toLowerCase().trim();
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, visibleCount);
  }, [options, inputVal, visibleCount]);

  const showCreate =
    inputVal.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === inputVal.toLowerCase().trim());

  const handleSelect = (opt: string) => {
    onChange(opt);
    setInputVal(opt);
    setOpen(false);
  };

  const handleCreate = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    onCreateOption(trimmed);
    onChange(trimmed);
    setOpen(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setVisibleCount(c => c + 50);
    }
  };

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12 }}
          style={dropdownStyle}
          className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="max-h-44 overflow-y-auto" onScroll={handleScroll}>
            {filtered.length === 0 && !showCreate && (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">No options</p>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${
                  value === opt ? "font-semibold text-[#007AFF]" : ""
                }`}
              >
                {opt}
              </button>
            ))}
            {showCreate && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                className="w-full text-left px-3 py-2 text-sm text-[#34c759] hover:bg-[#34c759]/5 transition-colors flex items-center gap-2 border-t border-border"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Add <strong>&quot;{inputVal.trim()}&quot;</strong>
                </span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={triggerRef}>
      <div
        className={`flex items-center gap-1.5 w-full px-3 py-2 text-sm bg-background border rounded-xl transition-colors ${
          open ? "border-[#007AFF]/60 ring-1 ring-[#007AFF]/20" : "border-border"
        }`}
      >
        <input
          type="text"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => { updatePosition(); setOpen(true); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/60 min-w-0 text-sm"
        />
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform cursor-pointer ${open ? "rotate-180" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); updatePosition(); setOpen((p) => !p); }}
        />
      </div>
      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}

// ── Default options ────────────────────────────────────────────────────────────
const DEFAULT_FREQUENCIES = [
  "med.freq.onceDaily",
  "med.freq.twiceDaily",
  "med.freq.threeTimesDaily",
  "med.freq.every6Hours",
  "med.freq.every8Hours",
  "med.freq.every12Hours",
  "med.freq.onceWeekly",
  "med.freq.asNeeded",
];

const DEFAULT_NOTES = [
  "med.note.beforeMeals",
  "med.note.afterMeals",
  "med.note.withFood",
  "med.note.onEmptyStomach",
  "med.note.atBedtime",
  "med.note.inMorning",
  "med.note.withWater",
];

// ── LocalStorage draft key ─────────────────────────────────────────────────────
function draftKey(visitId: string) { return `visit_draft_${visitId}`; }
interface DraftState {
  notes: string;
  diagnosis: string;
  measurements: string;
  vitals: string;
  medications: { name: string; frequency: string; notes: string }[];
  fuNote: string;
  fuTime: string;
}

// ── Modal Props ────────────────────────────────────────────────────────────────
interface VisitCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  visitId: Id<"visits">;
  patientId?: Id<"patients">;
  patientName: string;
  patientAge?: number;
  installmentId?: Id<"installments">; // if set → installment visit mode
  onComplete?: () => void;
  tag?: "current" | "next";
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function VisitCompletionModal({
  open,
  onOpenChange,
  clerkId,
  visitId,
  patientId,
  patientName,
  patientAge,
  installmentId,
  onComplete,
  tag,
}: VisitCompletionModalProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addVisitFiles = useMutation(api.visits.addVisitFiles);
  const createFollowUp = useMutation(api.followUps.createFollowUp);
  const completeinstallmentVisit = useMutation(api.installments.completeinstallmentVisit);
  const waiveUnpaidBalance = useMutation(api.installments.waiveUnpaidBalance);

  // Clinical options mutations
  const addMedicationOption = useMutation(api.clinicalOptions.addMedicationOption);
  const addFrequencyOption = useMutation(api.clinicalOptions.addFrequencyOption);
  const addNoteOption = useMutation(api.clinicalOptions.addNoteOption);

  // Clinical options query
  const allClinicalOptions = useQuery(api.clinicalOptions.getAllClinicalOptions, clerkId ? { clerkId } : "skip");
  const medOptions = allClinicalOptions?.medications;
  const freqOptions = allClinicalOptions?.frequencies;
  const noteOptions = allClinicalOptions?.notes;
  const diagnosisOptions = allClinicalOptions?.diagnoses;
  const measurementOptions = allClinicalOptions?.measurements;
  const vitalsOptions = allClinicalOptions?.vitals;

  const addDiagnosisOption = useMutation(api.clinicalOptions.addDiagnosisOption);
  const addMeasurementOption = useMutation(api.clinicalOptions.addMeasurementOption);
  const addVitalsOption = useMutation(api.clinicalOptions.addVitalsOption);

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const isinstallmentVisit = !!installmentId;
  const { t, lang, dir } = useI18n();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  const enableDiagnosis = (currentUser as any)?.enableDiagnosis === true;
  const enableMeasurements = (currentUser as any)?.enableMeasurements === true;
  const enableVitals = (currentUser as any)?.enableVitals === true;
  const enableNotes = (currentUser as any)?.enableNotes === true;
  const isAssistant = currentUser?.role === "assistant";
  const enablePrescription = currentUser?.enablePrescription ?? true;
  const showPrescription = !!currentUser && enablePrescription && !isAssistant;


  /** installment data (for unpaid / past-due banner) */
  const installmentData = useQuery(
    api.installments.getinstallment,
    clerkId && installmentId ? { clerkId, installmentId } : "skip"
  );

  /** Working days from doctor profile — falls back to blocking Sat+Sun */
  const workingDayAbbrs: string[] = (currentUser as { availableDays?: string[] })?.availableDays ?? [];
  const DOW_ABBR: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
  const WEEKEND_DAYS = new Set([0, 6]); // Sun & Sat
  function isNonWorkingDay(): boolean {
    return false;
  }

  // Follow-up date for slot availability check
  const [fuDate, setFuDate] = useState<Date | undefined>(undefined);
  const [fuCalOpen, setFuCalOpen] = useState(false);

  // installment visit state (declared early so activeDate can reference it)
  const [nextinstallmentDate, setNextinstallmentDate] = useState<Date | undefined>(undefined);

  // Use the correct date for slot availability depending on mode
  const activeScheduleDate = isinstallmentVisit ? nextinstallmentDate : fuDate;

  // Query existing visits on the selected scheduling date to grey out taken slots
  const activeDateStart = activeScheduleDate ? new Date(activeScheduleDate.getFullYear(), activeScheduleDate.getMonth(), activeScheduleDate.getDate(), 0, 0, 0, 0).getTime() : 0;
  const activeDateEnd = activeScheduleDate ? new Date(activeScheduleDate.getFullYear(), activeScheduleDate.getMonth(), activeScheduleDate.getDate(), 23, 59, 59, 999).getTime() : 0;
  
  const existingVisitsOnDate = useQuery(
    api.visits.getVisitsByDateRange,
    clerkId && activeScheduleDate ? { clerkId, startDate: activeDateStart, endDate: activeDateEnd } : "skip"
  );

  // Generate time slots based on working hours and slot duration
  const timeSlots = useMemo(() => {
    const startHour = currentUser?.workingHoursStart ?? 9;
    const endHour = currentUser?.workingHoursEnd ?? 17;
    const slotMin = currentUser?.slotDurationMinutes ?? 30;
    const slots: { timeStr: string; label: string; isWorkingHour: boolean; isReserved: boolean }[] = [];

    // Build set of reserved time strings from existing visits
    const reservedTimes = new Set<string>();
    if (existingVisitsOnDate) {
      for (const v of existingVisitsOnDate) {
        const d = new Date(v.date);
        const hh = d.getHours().toString().padStart(2, "0");
        const mm = d.getMinutes().toString().padStart(2, "0");
        reservedTimes.add(`${hh}:${mm}`);
      }
    }

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += slotMin) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const timeStr = `${hh}:${mm}`;

        const ampm = h >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
        const displayH = h % 12 || 12;
        const label = `${displayH}:${mm} ${ampm}`;

        const isWorkingHour = h >= startHour && h < endHour;
        const isReserved = reservedTimes.has(timeStr);
        slots.push({ timeStr, label, isWorkingHour, isReserved });
      }
    }
    return slots;
  }, [currentUser, existingVisitsOnDate]);


  // Prescription & docs
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [rxPreviewUrl, setRxPreviewUrl] = useState<string | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [measurements, setMeasurements] = useState("");
  const [vitals, setVitals] = useState("");
  const [waiveConfirm, setWaiveConfirm] = useState(false);

  // ── Medications state — pre-populated with one empty row ────────────────────
  const [medications, setMedications] = useState<MedicationEntry[]>([{ name: "", frequency: "", notes: "" }]);

  const addMedRow = () =>
    setMedications((prev) => [...prev, { name: "", frequency: "", notes: "" }]);

  const removeMedRow = (idx: number) =>
    setMedications((prev) => prev.filter((_, i) => i !== idx));

  const updateMed = (idx: number, field: keyof MedicationEntry, val: string) =>
    setMedications((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m))
    );

  // Merged options: doctor-saved custom meds + static Egyptian meds list (client-side, never fetched from server)
  const allMedNames = useMemo(() => {
    const savedNames = new Set((medOptions ?? []).map((o: { name: string }) => o.name.toLowerCase()));
    const defaults = TOP_EGYPTIAN_MEDS.filter(n => !savedNames.has(n.toLowerCase()));
    const custom = (medOptions ?? []).map((o: { name: string }) => o.name);
    return [...custom, ...defaults];
  }, [medOptions]);

  const allFreqNames = useMemo(() => {
    const saved = (freqOptions ?? []).map((o: { name: string }) => o.name);
    const defaults = DEFAULT_FREQUENCIES.map((key) => t(key as string) || key);
    return Array.from(new Set([...defaults, ...saved]));
  }, [freqOptions, t]);

  const allNoteNames = useMemo(() => {
    const saved = (noteOptions ?? []).map((o: { name: string }) => o.name);
    const defaults = DEFAULT_NOTES.map((key) => t(key as string) || key);
    return Array.from(new Set([...defaults, ...saved]));
  }, [noteOptions, t]);

  const allDiagNames = useMemo(() => (diagnosisOptions ?? []).map((o: { name: string }) => o.name), [diagnosisOptions]);
  const allMeasNames = useMemo(() => (measurementOptions ?? []).map((o: { name: string }) => o.name), [measurementOptions]);
  const allVitNames = useMemo(() => (vitalsOptions ?? []).map((o: { name: string }) => o.name), [vitalsOptions]);

  // installment visit state
  const [isPaid, setIsPaid] = useState(true);
  const [nextinstallmentTime, setNextinstallmentTime] = useState("10:00");
  const [nextinstallmentCalOpen, setNextinstallmentCalOpen] = useState(false);
  // Next visit is MANDATORY for installment visits — always open, can't be skipped
  const [scheduleNextinstallment, setScheduleNextinstallment] = useState(true);

  // Follow-up state (non-installment visits only)
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [fuTime, setFuTime] = useState<string>("10:00");
  const [fuNote, setFuNote] = useState("");

  // ── Restore draft from localStorage when modal opens ─────────────────────────
  useEffect(() => {
    if (!open || !visitId) return;
    try {
      const raw = localStorage.getItem(draftKey(visitId));
      if (raw) {
        const draft: DraftState = JSON.parse(raw);
        if (draft.notes) setNotes(draft.notes);
        if (draft.diagnosis) setDiagnosis(draft.diagnosis);
        if (draft.measurements) setMeasurements(draft.measurements);
        if (draft.vitals) setVitals(draft.vitals);
        if (draft.medications?.length) setMedications(draft.medications);
        if (draft.fuNote) setFuNote(draft.fuNote);
        if (draft.fuTime) setFuTime(draft.fuTime);
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, visitId]);

  // ── Save draft to localStorage ─────────────────────────────────────────────
  const saveDraftToStorage = useCallback(() => {
    if (!visitId) return;
    const draft: DraftState = { notes, diagnosis, measurements, vitals, medications, fuNote, fuTime };
    try { localStorage.setItem(draftKey(visitId), JSON.stringify(draft)); } catch {}
  }, [visitId, notes, diagnosis, measurements, vitals, medications, fuNote, fuTime]);

  // ── Clear draft from localStorage ─────────────────────────────────────────
  const clearDraft = useCallback(() => {
    if (!visitId) return;
    try { localStorage.removeItem(draftKey(visitId)); } catch {}
  }, [visitId]);

  // Sync initial fuTime to the first available working hour once loaded
  useEffect(() => {
    if (timeSlots.length > 0 && fuTime === "10:00") {
      const firstAvailable = timeSlots.find(s => s.isWorkingHour && !s.isReserved);
      if (firstAvailable) setFuTime(firstAvailable.timeStr);
    }
  }, [timeSlots, fuTime]);

  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const rxInputRef = useRef<HTMLInputElement>(null);
  const extrasInputRef = useRef<HTMLInputElement>(null);

  const handleRxFile = useCallback((file: File) => {
    setRxFile(file);
    setRxPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleSave = async (skip = false) => {
    // installment visits require a next visit date
    if (isinstallmentVisit && !nextinstallmentDate) {
      toast.error(lang === "ar" ? "يرجى اختيار تاريخ الزيارة التالية قبل إتمام هذه الزيارة" : "Please pick the next visit date before completing this visit");
      return;
    }
    if (!isinstallmentVisit && scheduleFollowUp && !fuDate) {
      toast.error(lang === "ar" ? "يرجى اختيار تاريخ المتابعة" : "Please select a follow-up date");
      return;
    }
    if (!isinstallmentVisit && scheduleFollowUp && fuDate) {
      const selectedSlot = timeSlots.find(s => s.timeStr === fuTime);
      if (selectedSlot?.isReserved) {
        toast.error(lang === "ar" ? "هذا الوقت محجوز مسبقاً." : "This time slot is already reserved.");
        return;
      }
    }

    setIsSaving(true);
    try {
      // ── Save any new medication/frequency/note options to DB ──
      for (const med of medications) {
        if (med.name.trim()) {
          // Only save if it's not already in the saved options
          const savedNames = (medOptions ?? []).map((o: { name: string }) => o.name);
          if (!savedNames.includes(med.name.trim())) {
            await addMedicationOption({ clerkId, name: med.name.trim() });
          }
        }
        if (med.frequency.trim()) {
          const savedFreqs = (freqOptions ?? []).map((o: { name: string }) => o.name);
          const translatedFreqs = DEFAULT_FREQUENCIES.map((k) => t(k as string) || k);
          if (!savedFreqs.includes(med.frequency.trim()) && !translatedFreqs.includes(med.frequency.trim())) {
            await addFrequencyOption({ clerkId, name: med.frequency.trim() });
          }
        }
        if (med.notes.trim()) {
          const savedNotes = (noteOptions ?? []).map((o: { name: string }) => o.name);
          const translatedNotes = DEFAULT_NOTES.map((k) => t(k as string) || k);
          if (!savedNotes.includes(med.notes.trim()) && !translatedNotes.includes(med.notes.trim())) {
            await addNoteOption({ clerkId, name: med.notes.trim() });
          }
        }
      }

      // Build structured medication payload (only include rows that have at least a name)
      const prescribedMedications = medications
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim(),
          frequency: m.frequency.trim() || undefined,
          notes: m.notes.trim() || undefined,
        }));

      let prescriptionImageId: Id<"_storage"> | undefined;
      const documentIds: Id<"_storage">[] = [];

      if (!skip && rxFile) {
        const rxUploadUrl = await generateUploadUrl({ clerkId });
        const rxRes = await fetch(rxUploadUrl, { method: "POST", headers: { "Content-Type": rxFile.type }, body: rxFile });
        const { storageId } = await rxRes.json();
        prescriptionImageId = storageId as Id<"_storage">;
      }
      for (const docFile of extraFiles) {
        const url = await generateUploadUrl({ clerkId });
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": docFile.type }, body: docFile });
        const { storageId } = await res.json();
        documentIds.push(storageId as Id<"_storage">);
      }

      if (isinstallmentVisit && installmentId) {
        // installment visit path — single mutation handles everything
        let nextTs: number | undefined;
        if (scheduleNextinstallment && nextinstallmentDate) {
          const [hh, mm] = nextinstallmentTime.split(":").map(Number);
          const d = new Date(nextinstallmentDate);
          d.setHours(hh, mm, 0, 0);
          nextTs = d.getTime();
        }
        await completeinstallmentVisit({
          clerkId,
          visitId,
          installmentId,
          isPaid,
          notes: notes || undefined,
          diagnosis: diagnosis || undefined,
          measurements: measurements || undefined,
          vitals: vitals || undefined,
          prescriptionImageId,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
          nextVisitDate: nextTs,
          prescribedMedications: prescribedMedications.length > 0 ? prescribedMedications : undefined,
        });
        setDone(true);
        toast.success(isPaid ? "Visit complete — payment recorded ✓" : "Visit complete — balance added to installment");
      } else {
        // Regular visit path — always update notes, status, and medications
        await addVisitFiles({
          clerkId,
          visitId,
          prescriptionImageId: !skip ? prescriptionImageId : undefined,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
          notes: notes || undefined,
          diagnosis: diagnosis || undefined,
          measurements: measurements || undefined,
          vitals: vitals || undefined,
          status: "completed",
          prescribedMedications: prescribedMedications.length > 0 ? prescribedMedications : undefined,
        });
        if (scheduleFollowUp && fuDate && patientId) {
          const [hh, mm] = fuTime.split(":").map(Number);
          const exactDate = new Date(fuDate);
          exactDate.setHours(hh ?? 10, mm ?? 0, 0, 0);
          await createFollowUp({ clerkId, patientId, followUpDate: exactDate.getTime(), followUpTime: fuTime, type: "in-person", note: fuNote || undefined, parentVisitId: visitId });
        }
        setDone(true);
        toast.success(scheduleFollowUp ? "Visit complete — follow-up scheduled!" : "Visit recorded");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "Failed to complete visit");
    } finally {
      setIsSaving(false);
    }
  };

  const forceClose = () => {
    setRxFile(null); setRxPreviewUrl(null); setExtraFiles([]);
    setNotes(""); setDiagnosis(""); setMeasurements(""); setVitals(""); setScheduleFollowUp(false); setFuDate(undefined);
    setFuTime(timeSlots.find(s => s.isWorkingHour && !s.isReserved)?.timeStr || "10:00");
    setFuNote(""); setIsPaid(true); setScheduleNextinstallment(true);
    setNextinstallmentDate(undefined); setNextinstallmentTime("10:00"); setDone(false);
    setMedications([{ name: "", frequency: "", notes: "" }]);
    clearDraft();
    onOpenChange(false);
  };

  // X button or clicking outside: just save draft, don't submit
  const handleDismiss = () => {
    saveDraftToStorage();
    onOpenChange(false);
  };

  // After a successful save, clear draft and close fully
  const handleClose = () => {
    clearDraft();
    onComplete?.();
    forceClose();
  };

  return (
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          {/* Backdrop — saves draft, does NOT submit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full sm:w-[90vw] sm:max-w-none bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">{t("visit.completeVisit")}</h2>
                    {tag === "current" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 px-2 py-0.5 rounded-full">
                        {dir === "rtl" ? "الحالي" : "Current"}
                      </span>
                    )}
                    {tag === "next" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 px-2 py-0.5 rounded-full">
                        {dir === "rtl" ? "التالي" : "Next"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {patientName}{patientAge ? ` · ${patientAge}y` : ""}
                  </p>
                </div>
              </div>
              {/* X saves draft, does NOT submit */}
              <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* ── Unpaid / Past-Due Warning Banner ── */}
              {isinstallmentVisit && !done && installmentData && (
                (installmentData.unpaidBalance ?? 0) > 0 || installmentData.status === "expired"
              ) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 mb-4 mt-[-8px]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      {(installmentData?.unpaidBalance ?? 0) > 0 && (
                        <p className="text-sm font-bold text-amber-600">
                          Unpaid balance: {installmentData!.unpaidBalance!.toLocaleString()} {t("installments.currency") || "EGP"}
                        </p>
                      )}
                      {installmentData?.status === "expired" && (
                        <p className="text-sm font-bold text-amber-600">installment is expired</p>
                      )}
                      <p className="text-xs text-amber-600/80 mt-0.5">Discuss with patient before proceeding</p>
                    </div>
                  </div>
                  
                  {(installmentData?.unpaidBalance ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWaiveConfirm(true); }}
                      disabled={isSaving}
                      className="w-full text-sm font-semibold bg-amber-500 text-white px-3 py-2.5 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSaving ? <IOSSpinner size={14} className="text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t("installments.waive") || "Waive Balance"}
                    </button>
                  )}
                </motion.div>
              )}

              {/* Done state */}
              {done && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                  </div>
                  <p className="font-semibold text-base">{t("visit.visitComplete")}</p>
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    {scheduleFollowUp ? t("visit.followUpScheduled") : t("visit.savedTimeline")}
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                    {showPrescription && (
                      <button
                        onClick={() => window.open(`/print/${visitId}`, '_blank')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-[#007AFF] hover:bg-[#0062cc] text-white rounded-xl transition-colors font-semibold text-sm w-full"
                      >
                        <Printer className="w-4 h-4" />
                        {t("visit.printPrescription")}
                      </button>
                    )}
                    
                    <button
                      onClick={handleClose}
                      className="flex items-center justify-center px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors font-semibold text-sm w-full"
                    >
                      {t("common.close")}
                    </button>
                  </div>
                </motion.div>
              )}

              {!done && (
                <div className="space-y-5">

                  {/* ── Medications Section ─────────────────────────────────── */}
                  {showPrescription && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-[#34c759]/10 flex items-center justify-center">
                          <Pill className="w-3.5 h-3.5 text-[#34c759]" />
                        </div>
                        <p className="text-sm font-semibold">{dir === "rtl" ? "الأدوية الموصوفة" : "Prescribed Medications"}</p>
                        <span className="text-xs text-muted-foreground font-normal">({t("onboarding.optional")})</span>
                      </div>
                      <button
                        type="button"
                        onClick={addMedRow}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#007AFF] hover:text-[#0062cc] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[#007AFF]/8"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {dir === "rtl" ? "إضافة" : "Add"}
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {medications.map((med, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-visible"
                        >
                          <div className="border border-border rounded-2xl p-3 mb-2 space-y-2 bg-muted/20">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {dir === "rtl" ? "دواء" : "Med"} #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMedRow(idx)}
                                className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Medication name */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">{dir === "rtl" ? "اسم الدواء *" : "Medication name *"}</p>
                              <CreatableCombobox
                                options={allMedNames}
                                value={med.name}
                                onChange={(val) => updateMed(idx, "name", val)}
                                onCreateOption={(val) => {
                                  updateMed(idx, "name", val);
                                }}
                                placeholder={dir === "rtl" ? "مثل: باراسيتامول، أموكسيسيلين..." : "e.g. Paracetamol, Amoxicillin…"}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {/* Frequency */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">{dir === "rtl" ? "كم مرة" : "How often"}</p>
                                <CreatableCombobox
                                  options={allFreqNames}
                                  value={med.frequency}
                                  onChange={(val) => updateMed(idx, "frequency", val)}
                                  onCreateOption={(val) => {
                                    updateMed(idx, "frequency", val);
                                  }}
                                  placeholder={dir === "rtl" ? "مثل: مرتين يومياً..." : "e.g. Twice daily…"}
                                  accentColor="#AF52DE"
                                />
                              </div>

                              {/* Notes */}
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">{dir === "rtl" ? "ملاحظات" : "Notes"}</p>
                                <CreatableCombobox
                                  options={allNoteNames}
                                  value={med.notes}
                                  onChange={(val) => updateMed(idx, "notes", val)}
                                  onCreateOption={(val) => {
                                    updateMed(idx, "notes", val);
                                  }}
                                  placeholder={dir === "rtl" ? "مثل: بعد الأكل..." : "e.g. After meals…"}
                                  accentColor="#FF9500"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={addMedRow}
                      className="mt-1 w-full border border-dashed border-[#34c759]/40 text-[#34c759] rounded-xl py-2 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#34c759]/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {dir === "rtl" ? "إضافة دواء آخر" : "Add another medication"}
                    </button>
                  </div>
                  )}

                  {/* Diagnosis */}
                  {enableDiagnosis && (
                    <div>
                      <p className="text-sm font-medium mb-2">{dir === "rtl" ? "التشخيص" : "Diagnosis"} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></p>
                      <CreatableCombobox
                        options={allDiagNames}
                        value={diagnosis}
                        onChange={setDiagnosis}
                        onCreateOption={(val) => {
                          addDiagnosisOption({ clerkId, name: val });
                        }}
                        placeholder={dir === "rtl" ? "أدخل التشخيص هنا..." : "Enter diagnosis here…"}
                        accentColor="#007AFF"
                      />
                    </div>
                  )}

                  {/* Measurements */}
                  {enableMeasurements && (
                    <div>
                      <p className="text-sm font-medium mb-2">{dir === "rtl" ? "القياسات" : "Measurements"} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></p>
                      <CreatableCombobox
                        options={allMeasNames}
                        value={measurements}
                        onChange={setMeasurements}
                        onCreateOption={(val) => {
                          addMeasurementOption({ clerkId, name: val });
                        }}
                        placeholder={dir === "rtl" ? "الوزن، الطول، الخ..." : "Weight, height, etc…"}
                        accentColor="#007AFF"
                      />
                    </div>
                  )}

                  {/* Vitals */}
                  {enableVitals && (
                    <div>
                      <p className="text-sm font-medium mb-2">{dir === "rtl" ? "العلامات الحيوية" : "Vitals"} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></p>
                      <CreatableCombobox
                        options={allVitNames}
                        value={vitals}
                        onChange={setVitals}
                        onCreateOption={(val) => {
                          addVitalsOption({ clerkId, name: val });
                        }}
                        placeholder={dir === "rtl" ? "ضغط الدم، النبض، الحرارة..." : "BP, HR, Temp…"}
                        accentColor="#007AFF"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  {enableNotes && (
                    <div>
                      <p className="text-sm font-medium mb-2">{t("visit.visitNotes")} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        placeholder={dir === "rtl" ? "ملاحظات إضافية، خطة العلاج..." : "Additional notes, treatment plan…"}
                        className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                      />
                    </div>
                  )}

                  {/* ─── installment visit: Paid switch + Next Visit ──── */}
                  {isinstallmentVisit ? (
                    <div className="space-y-3">
                      {/* Paid / Unpaid toggle */}
                      <div className="border border-border rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{t("visit.payment")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {isPaid ? t("visit.paidNote") : t("visit.unpaidNote")}
                          </p>
                        </div>
                        <Switch
                          checked={isPaid}
                          onCheckedChange={setIsPaid}
                        />
                      </div>

                      {/* Schedule next installment visit — mandatory, always open */}
                      <div className="border border-[#AF52DE]/30 bg-[#AF52DE]/4 rounded-2xl overflow-hidden">
                        <div className="w-full flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-[#AF52DE]" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold">
                                {t("visit.scheduleNextinstallment")}
                                <span className="text-red-500 ml-1">*</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{t("visit.bookNextinstallment")}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#AF52DE] bg-[#AF52DE]/10 px-2 py-0.5 rounded-full">Required</span>
                        </div>

                        <div className="p-4 border-t border-[#AF52DE]/20 space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                {t("visit.date")} <span className="text-red-500">*</span>
                              </p>
                              <Popover open={nextinstallmentCalOpen} onOpenChange={setNextinstallmentCalOpen}>
                                <PopoverTrigger asChild>
                                  <button className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border rounded-2xl hover:border-[#AF52DE]/50 transition-colors text-left ${!nextinstallmentDate ? "border-red-400/60" : "border-border"}`}>
                                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span className={nextinstallmentDate ? "" : "text-muted-foreground"}>
                                      {nextinstallmentDate ? nextinstallmentDate.toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" }) : t("visit.pickDate")}
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={nextinstallmentDate} onSelect={(d) => { if (d) { setNextinstallmentDate(d); setNextinstallmentCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay()} />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.timeSlot")}</p>
                              <div className="max-h-48 overflow-y-auto border border-border rounded-2xl divide-y divide-border/50">
                                {timeSlots.filter(s => s.isWorkingHour).map(slot => (
                                  <button key={slot.timeStr} onClick={() => !slot.isReserved && setNextinstallmentTime(slot.timeStr)} disabled={slot.isReserved}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${slot.isReserved ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through" : nextinstallmentTime === slot.timeStr ? "bg-[#AF52DE]/10 text-[#AF52DE] font-semibold" : "hover:bg-muted/30"}`}>
                                    <span>{slot.label}</span>
                                    {slot.isReserved && <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">{t("visit.reserved")}</span>}
                                    {!slot.isReserved && nextinstallmentTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  /* ─── Regular visit: Follow-Up section ────────────── */
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <div
                      onClick={() => setScheduleFollowUp((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${scheduleFollowUp ? "bg-[#007AFF]/10" : "bg-muted/60"}`}>
                          <Clock className={`w-4 h-4 ${scheduleFollowUp ? "text-[#007AFF]" : "text-muted-foreground"}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">{t("visit.scheduleFollowUp")}</p>
                          <p className="text-xs text-muted-foreground">{t("visit.inPerson")}</p>
                        </div>
                      </div>
                      <div className="shrink-0 pointer-events-none">
                        <Switch checked={scheduleFollowUp} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {scheduleFollowUp && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="p-4 border-t border-border space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.date")} *</p>
                                <Popover open={fuCalOpen} onOpenChange={setFuCalOpen}>
                                  <PopoverTrigger asChild>
                                    <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border border-border rounded-2xl hover:border-[#007AFF]/50 transition-colors text-left">
                                      <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <span className="text-sm">{fuDate ? fuDate.toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" }) : t("visit.pickDate")}</span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={fuDate} onSelect={(d) => { if (d) { setFuDate(d); setFuCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay()} />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.timeSlot")}</p>
                                <div className="max-h-48 overflow-y-auto border border-border rounded-2xl divide-y divide-border/50">
                                  {timeSlots.filter(s => s.isWorkingHour).map(slot => (
                                    <button key={slot.timeStr} onClick={() => !slot.isReserved && setFuTime(slot.timeStr)} disabled={slot.isReserved}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${slot.isReserved ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through" : fuTime === slot.timeStr ? "bg-[#007AFF]/10 text-[#007AFF] font-semibold" : "hover:bg-muted/30"}`}>
                                      <span>{slot.label}</span>
                                      {slot.isReserved && <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">{t("visit.reserved")}</span>}
                                      {!slot.isReserved && fuTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.note")}</p>
                              <div className="relative">
                                <StickyNote className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                                <input value={fuNote} onChange={(e) => setFuNote(e.target.value)} placeholder="e.g. Check blood pressure, review labs…"
                                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  )}


                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={handleDismiss}
                      disabled={isSaving}
                      className="flex-1 border border-border text-sm font-medium py-2.5 rounded-2xl hover:bg-muted/40 transition-colors disabled:opacity-60"
                    >
                      {t("common.save") || "Save"}
                    </button>
                    <button
                      onClick={async () => { await handleSave(false); }}
                      disabled={isSaving}
                      className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-2xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <><IOSSpinner size={16} className="text-white" /> {t("onboarding.saving")}</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4" /> {t("visit.save")}</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Waive Balance Confirmation */}
    <AlertDialog open={waiveConfirm} onOpenChange={setWaiveConfirm}>
      <AlertDialogContent dir={dir}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-amber-500">{t("installments.waive") || "Waive Balance"}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("installments.waiveConfirm") || "Waive the full unpaid balance? This cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={async (e) => {
              e.preventDefault();
              setIsSaving(true);
              try {
                await waiveUnpaidBalance({ clerkId, installmentId: installmentData!._id });
                toast.success(t("installments.waiveSuccess") || "Unpaid balance waived.");
              } catch {
                toast.error(t("installments.waiveFail") || "Failed to waive balance");
              } finally {
                setIsSaving(false);
                setWaiveConfirm(false);
              }
            }}
          >
            {isSaving ? <IOSSpinner size={14} className="text-white" /> : t("installments.waive") || "Waive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
