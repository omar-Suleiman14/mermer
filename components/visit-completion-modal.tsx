"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";
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

interface VisitCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  visitId: Id<"visits">;
  patientId?: Id<"patients">;
  patientName: string;
  patientAge?: number;
  contractId?: Id<"contracts">; // if set → contract visit mode
  onComplete?: () => void;
}

export function VisitCompletionModal({
  open,
  onOpenChange,
  clerkId,
  visitId,
  patientId,
  patientName,
  patientAge,
  contractId,
  onComplete,
}: VisitCompletionModalProps) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const addVisitFiles = useMutation(api.visits.addVisitFiles);
  const createFollowUp = useMutation(api.followUps.createFollowUp);
  const completeContractVisit = useMutation(api.contracts.completeContractVisit);
  const waiveUnpaidBalance = useMutation(api.contracts.waiveUnpaidBalance);
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const isContractVisit = !!contractId;
  const { t, lang, dir } = useI18n();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";

  /** Contract data (for unpaid / past-due banner) */
  const contractData = useQuery(
    api.contracts.getContract,
    clerkId && contractId ? { clerkId, contractId } : "skip"
  );

  /** Working days from doctor profile — falls back to blocking Sat+Sun */
  const workingDayAbbrs: string[] = (currentUser as any)?.availableDays ?? [];
  const DOW_ABBR: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
  const WEEKEND_DAYS = new Set([0, 6]); // Sun & Sat
  function isNonWorkingDay(d: Date): boolean {
    const dow = d.getDay();
    if (workingDayAbbrs.length > 0) {
      return !workingDayAbbrs.includes(DOW_ABBR[dow]);
    }
    // Fallback: block weekends
    return WEEKEND_DAYS.has(dow);
  }

  // Follow-up date for slot availability check
  const [fuDate, setFuDate] = useState<Date | undefined>(undefined);
  const [fuCalOpen, setFuCalOpen] = useState(false);

  // Contract visit state (declared early so activeDate can reference it)
  const [nextContractDate, setNextContractDate] = useState<Date | undefined>(undefined);

  // Use the correct date for slot availability depending on mode
  const activeScheduleDate = isContractVisit ? nextContractDate : fuDate;

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
  const [waiveConfirm, setWaiveConfirm] = useState(false);

  // Contract visit state
  const [isPaid, setIsPaid] = useState(true);
  const [nextContractTime, setNextContractTime] = useState("10:00");
  const [nextContractCalOpen, setNextContractCalOpen] = useState(false);
  // Next visit is MANDATORY for contract visits — always open, can't be skipped
  const [scheduleNextContract, setScheduleNextContract] = useState(true);

  // Follow-up state (non-contract visits only)
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [fuTime, setFuTime] = useState<string>("10:00");
  const [fuNote, setFuNote] = useState("");

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
    // Contract visits require a next visit date
    if (isContractVisit && !nextContractDate) {
      toast.error("Please pick the next visit date before completing this visit");
      return;
    }
    if (!isContractVisit && scheduleFollowUp && !fuDate) {
      toast.error("Please select a follow-up date");
      return;
    }
    if (!isContractVisit && scheduleFollowUp && fuDate) {
      const selectedSlot = timeSlots.find(s => s.timeStr === fuTime);
      if (selectedSlot?.isReserved) {
        toast.error("This time slot is already reserved.");
        return;
      }
    }

    setIsSaving(true);
    try {
      let prescriptionImageId: Id<"_storage"> | undefined;
      const documentIds: Id<"_storage">[] = [];

      if (!skip && rxFile) {
        const rxUploadUrl = await generateUploadUrl();
        const rxRes = await fetch(rxUploadUrl, { method: "POST", headers: { "Content-Type": rxFile.type }, body: rxFile });
        const { storageId } = await rxRes.json();
        prescriptionImageId = storageId as Id<"_storage">;
      }
      for (const docFile of extraFiles) {
        const url = await generateUploadUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": docFile.type }, body: docFile });
        const { storageId } = await res.json();
        documentIds.push(storageId as Id<"_storage">);
      }

      if (isContractVisit && contractId) {
        // Contract visit path — single mutation handles everything
        let nextTs: number | undefined;
        if (scheduleNextContract && nextContractDate) {
          const [hh, mm] = nextContractTime.split(":").map(Number);
          const d = new Date(nextContractDate);
          d.setHours(hh, mm, 0, 0);
          nextTs = d.getTime();
        }
        await completeContractVisit({
          clerkId,
          visitId,
          contractId,
          isPaid,
          notes: notes || undefined,
          prescriptionImageId,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
          nextVisitDate: nextTs,
        });
        setDone(true);
        toast.success(isPaid ? "Visit complete — payment recorded ✓" : "Visit complete — balance added to contract");
      } else {
        // Regular visit path
        if (!skip && (prescriptionImageId || documentIds.length > 0)) {
          await addVisitFiles({ clerkId, visitId, prescriptionImageId, documentIds: documentIds.length > 0 ? documentIds : undefined });
        }
        if (scheduleFollowUp && fuDate && patientId) {
          const [hh, mm] = fuTime.split(":").map(Number);
          const exactDate = new Date(fuDate);
          exactDate.setHours(hh ?? 10, mm ?? 0, 0, 0);
          await createFollowUp({ clerkId, patientId, followUpDate: exactDate.getTime(), followUpTime: fuTime, type: "in-person", note: fuNote || undefined });
        }
        setDone(true);
        toast.success(scheduleFollowUp ? "Visit complete — follow-up scheduled!" : "Visit recorded");
      }

      setTimeout(() => { onComplete?.(); handleClose(); }, 1200);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to complete visit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setRxFile(null); setRxPreviewUrl(null); setExtraFiles([]);
    setNotes(""); setScheduleFollowUp(false); setFuDate(undefined);
    setFuTime(timeSlots.find(s => s.isWorkingHour && !s.isReserved)?.timeStr || "10:00");
    setFuNote(""); setIsPaid(true); setScheduleNextContract(true);
    setNextContractDate(undefined); setNextContractTime("10:00"); setDone(false);
    onOpenChange(false);
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative z-10 w-full sm:max-w-lg bg-[var(--background)] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
          >
            <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold">{t("visit.completeVisit")}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patientName}{patientAge ? ` · ${patientAge}y` : ""}
                </p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* ── Unpaid / Past-Due Warning Banner ── */}
              {isContractVisit && !done && contractData && (
                (contractData.unpaidBalance ?? 0) > 0 || contractData.status === "expired"
              ) && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 mb-4 mt-[-8px]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      {(contractData?.unpaidBalance ?? 0) > 0 && (
                        <p className="text-sm font-bold text-amber-600">
                          Unpaid balance: {contractData!.unpaidBalance!.toLocaleString()} {t("contracts.currency") || "EGP"}
                        </p>
                      )}
                      {contractData?.status === "expired" && (
                        <p className="text-sm font-bold text-amber-600">Contract is expired</p>
                      )}
                      <p className="text-xs text-amber-600/80 mt-0.5">Discuss with patient before proceeding</p>
                    </div>
                  </div>
                  
                  {(contractData?.unpaidBalance ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setWaiveConfirm(true); }}
                      disabled={isSaving}
                      className="w-full text-sm font-semibold bg-amber-500 text-white px-3 py-2.5 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
                    >
                      {isSaving ? <IOSSpinner size={14} className="text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                      {t("contracts.waive") || "Waive Balance"}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    {scheduleFollowUp ? t("visit.followUpScheduled") : t("visit.savedTimeline")}
                  </p>
                </motion.div>
              )}

              {!done && (
                <div className="space-y-5">
                  {/* Prescription photo */}
                  {!rxPreviewUrl ? (
                    <div>
                      <p className="text-sm font-medium mb-2">
                        {t("visit.prescriptionPhoto")} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span>
                      </p>
                      <button
                        onClick={() => rxInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2.5 hover:border-[#007AFF]/40 hover:bg-[#007AFF]/4 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-[#007AFF]/10 transition-colors">
                          <Camera className="w-5 h-5 text-muted-foreground group-hover:text-[#007AFF]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{t("visit.takeOrUpload")}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{t("visit.savedToTimeline")}</p>
                        </div>
                      </button>
                      <input
                        ref={rxInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRxFile(f); }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{t("visit.prescriptionPhoto")}</p>
                      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-5 h-5 text-[#007AFF] flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{rxFile?.name || "Prescription file"}</span>
                        </div>
                        <button
                          onClick={() => { setRxFile(null); setRxPreviewUrl(null); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <p className="text-sm font-medium mb-2">{t("visit.visitNotes")} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Diagnosis, treatment plan, observations…"
                      className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                    />
                  </div>

                  {/* Extra docs */}
                  <div>
                    <button
                      onClick={() => extrasInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-[#007AFF] hover:underline"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t("visit.attachDocs")}
                    </button>
                    {extraFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {extraFiles.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <FileText className="w-3 h-3" />
                            {f.name}
                            <button
                              onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))}
                              className="ml-auto text-red-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input
                      ref={extrasInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setExtraFiles((prev) => [...prev, ...files]);
                      }}
                    />
                  </div>

                  {/* ─── Contract visit: Paid switch + Next Visit ──── */}
                  {isContractVisit ? (
                    <div className="space-y-3">
                      {/* Paid / Unpaid toggle */}
                      <div className="border border-border rounded-xl p-4 flex items-center justify-between">
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

                      {/* Schedule next contract visit — mandatory, always open */}
                      <div className="border border-[#AF52DE]/30 bg-[#AF52DE]/4 rounded-xl overflow-hidden">
                        <div className="w-full flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-[#AF52DE]" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-semibold">
                                {t("visit.scheduleNextContract")}
                                <span className="text-red-500 ml-1">*</span>
                              </p>
                              <p className="text-xs text-muted-foreground">{t("visit.bookNextContract")}</p>
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
                              <Popover open={nextContractCalOpen} onOpenChange={setNextContractCalOpen}>
                                <PopoverTrigger asChild>
                                  <button className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border rounded-xl hover:border-[#AF52DE]/50 transition-colors text-left ${!nextContractDate ? "border-red-400/60" : "border-border"}`}>
                                    <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className={nextContractDate ? "" : "text-muted-foreground"}>
                                      {nextContractDate ? nextContractDate.toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" }) : t("visit.pickDate")}
                                    </span>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar mode="single" selected={nextContractDate} onSelect={(d) => { if (d) { setNextContractDate(d); setNextContractCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay(d)} />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.timeSlot")}</p>
                              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                                {timeSlots.filter(s => s.isWorkingHour).map(slot => (
                                  <button key={slot.timeStr} onClick={() => !slot.isReserved && setNextContractTime(slot.timeStr)} disabled={slot.isReserved}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${slot.isReserved ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through" : nextContractTime === slot.timeStr ? "bg-[#AF52DE]/10 text-[#AF52DE] font-semibold" : "hover:bg-muted/30"}`}>
                                    <span>{slot.label}</span>
                                    {slot.isReserved && <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">{t("visit.reserved")}</span>}
                                    {!slot.isReserved && nextContractTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div
                      onClick={() => setScheduleFollowUp((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${scheduleFollowUp ? "bg-[#007AFF]/10" : "bg-muted/60"}`}>
                          <Clock className={`w-4 h-4 ${scheduleFollowUp ? "text-[#007AFF]" : "text-muted-foreground"}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold">{t("visit.scheduleFollowUp")}</p>
                          <p className="text-xs text-muted-foreground">{t("visit.inPerson")}</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0 pointer-events-none">
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
                                    <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border border-border rounded-xl hover:border-[#007AFF]/50 transition-colors text-left">
                                      <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                      <span className="text-sm">{fuDate ? fuDate.toLocaleDateString(dateLocale, { weekday: "short", month: "short", day: "numeric" }) : t("visit.pickDate")}</span>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={fuDate} onSelect={(d) => { if (d) { setFuDate(d); setFuCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay(d)} />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.timeSlot")}</p>
                                <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
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
                                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
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
                      onClick={handleClose}
                      disabled={isSaving}
                      className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-60"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={() => handleSave(false)}
                      disabled={isSaving}
                      className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
          <AlertDialogTitle className="text-amber-500">{t("contracts.waive") || "Waive Balance"}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("contracts.waiveConfirm") || "Waive the full unpaid balance? This cannot be undone."}
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
                await waiveUnpaidBalance({ clerkId, contractId: contractData!._id });
                toast.success(t("contracts.waiveSuccess") || "Unpaid balance waived.");
              } catch {
                toast.error(t("contracts.waiveFail") || "Failed to waive balance");
              } finally {
                setIsSaving(false);
                setWaiveConfirm(false);
              }
            }}
          >
            {isSaving ? <IOSSpinner size={14} className="text-white" /> : t("contracts.waive") || "Waive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
