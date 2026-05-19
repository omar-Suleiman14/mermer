"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  X,
  Upload,
  CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Trash2,
  Download,
  Users,
  Search,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import Link from "next/link";
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

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(ts: number, locale: string, includeTime = false) {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (includeTime) {
    opts.hour = "numeric";
    opts.minute = "2-digit";
    opts.hour12 = true;
  }
  return new Date(ts).toLocaleString(locale, opts);
}



const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30" },
  expired: { label: "Expired", color: "bg-red-500/10 text-red-500 border-red-500/30" },
} as const;

// ── Contract Form ──────────────────────────────────────────────────────────

// ── Visit Slot Picker (used in step 2) ─────────────────────────────────────

function VisitSlotPicker({
  index,
  date,
  time,
  onDateChange,
  onTimeChange,
  clerkId,
  startHour,
  endHour,
  slotMin,
  availableDays,
}: {
  index: number;
  date: Date | undefined;
  time: string;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: string) => void;
  clerkId: string;
  startHour: number;
  endHour: number;
  slotMin: number;
  availableDays: string[];
}) {
  const { t, lang } = useI18n();
  const [calOpen, setCalOpen] = useState(false);

  const dayStart = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime() : 0;
  const dayEnd = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime() : 0;

  const existing = useQuery(
    api.visits.getVisitsByDateRange,
    clerkId && date ? { clerkId, startDate: dayStart, endDate: dayEnd } : "skip"
  );

  const reservedTimes = useMemo(() => {
    const set = new Set<string>();
    if (existing) {
      for (const v of existing) {
        const d = new Date(v.date);
        set.add(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
      }
    }
    return set;
  }, [existing]);

  const slots = useMemo(() => {
    const arr: { timeStr: string; label: string; reserved: boolean }[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMin) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const ts = `${hh}:${mm}`;
        const ampm = h >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
        const dh = h % 12 || 12;
        arr.push({ timeStr: ts, label: `${dh}:${mm} ${ampm}`, reserved: reservedTimes.has(ts) });
      }
    }
    return arr;
  }, [startHour, endHour, slotMin, reservedTimes]);

  return (
    <div className="border border-[#AF52DE]/30 bg-[#AF52DE]/4 rounded-xl overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#AF52DE]/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#AF52DE]" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">
              Visit {index + 1}
              <span className="text-red-500 ml-1">*</span>
            </p>
            <p className="text-xs text-muted-foreground">Select date and time</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#AF52DE] bg-[#AF52DE]/10 px-2 py-0.5 rounded-full">Required</span>
      </div>

      <div className="p-4 border-t border-[#AF52DE]/20 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Date <span className="text-red-500">*</span>
            </p>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border rounded-xl hover:border-[#AF52DE]/50 transition-colors text-left ${!date ? "border-red-400/60" : "border-border"}`}>
                  <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className={date ? "" : "text-muted-foreground"}>
                    {date ? date.toLocaleDateString(t("common.currency") === "ج.م" ? "ar-EG" : "en-US", { weekday: "short", month: "short", day: "numeric" }) : "Pick date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={(d) => { if (d) { onDateChange(d); setCalOpen(false); } }} 
                  disabled={(d) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (d < today) return true;
                    if (availableDays && availableDays.length > 0) {
                      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
                      if (!availableDays.includes(dayName)) return true;
                    }
                    return false;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Time Slot</p>
            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
              {slots.map(slot => (
                <button key={slot.timeStr} onClick={() => !slot.reserved && onTimeChange(slot.timeStr)} disabled={slot.reserved}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${slot.reserved ? "bg-muted/40 text-muted-foreground/40 cursor-not-allowed line-through" : time === slot.timeStr ? "bg-[#AF52DE]/10 text-[#AF52DE] font-semibold" : "hover:bg-muted/30"}`}>
                  <span>{slot.label}</span>
                  {slot.reserved && <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">Reserved</span>}
                  {!slot.reserved && time === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractForm({
  clerkId,
  onClose,
}: {
  clerkId: string;
  onClose: () => void;
}) {
  const patients = useQuery(api.patients.listPatients, clerkId ? { clerkId } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const createContract = useMutation(api.contracts.createContract);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { t } = useI18n();

  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<{ id: Id<"patients">; name: string } | null>(null);

  // Form fields
  const [totalAmount, setTotalAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [downPaymentType, setDownPaymentType] = useState<"fixed" | "percentage">("fixed");
  const [costPerVisit, setCostPerVisit] = useState("");

  // Load defaults once currentUser is available
  useEffect(() => {
    if (!currentUser) return;
    setDownPayment(String((currentUser as any).contractDefaultDownPayment ?? ""));
    setDownPaymentType((currentUser as any).contractDefaultDownPaymentType ?? "fixed");
    setCostPerVisit(String((currentUser as any).contractDefaultCostPerVisit ?? ""));
  }, [currentUser?._id]);

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  // File upload
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [calOpen, setCalOpen] = useState(false);

  // Single first visit slot
  const [firstVisitDate, setFirstVisitDate] = useState<Date | undefined>(undefined);
  const [firstVisitTime, setFirstVisitTime] = useState(`${(currentUser?.workingHoursStart ?? 9).toString().padStart(2, "0")}:00`);
  const [firstVisitCalOpen, setFirstVisitCalOpen] = useState(false);

  const startHour = currentUser?.workingHoursStart ?? 9;
  const endHour = currentUser?.workingHoursEnd ?? 17;
  const slotMin = currentUser?.slotDurationMinutes ?? 30;

  // ── Live visit count calculation ─────────────────────────────────────────
  const computedVisits = (() => {
    const total = Number(totalAmount);
    const down = Number(downPayment);
    const cpv = Number(costPerVisit);
    if (!total || !cpv || cpv <= 0) return null;
    const effectiveDown = downPaymentType === "percentage" ? total * (down / 100) : down;
    const remaining = Math.max(0, total - (effectiveDown || 0));
    return Math.ceil(remaining / cpv);
  })();

  const filteredPatients = (patients ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFile = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large — max 20 MB");
      return;
    }
    setContractFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function handleSave() {
    if (!selectedPatient) return;
    if (!firstVisitDate) { toast.error("Pick a date for the first visit"); return; }

    setSaving(true);
    try {
      let contractFileId: Id<"_storage"> | undefined;
      if (contractFile) {
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": contractFile.type },
          body: contractFile,
        });
        const { storageId } = await res.json();
        contractFileId = storageId as Id<"_storage">;
      }

      // Build first visit timestamp (client-side, correct timezone)
      const [hh, mm] = firstVisitTime.split(":").map(Number);
      const firstTs = new Date(firstVisitDate.getFullYear(), firstVisitDate.getMonth(), firstVisitDate.getDate(), hh, mm, 0, 0);

      await createContract({
        clerkId,
        patientId: selectedPatient.id,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        downPayment: downPayment ? Number(downPayment) : undefined,
        downPaymentType: downPayment ? downPaymentType : undefined,
        costPerVisit: costPerVisit ? Number(costPerVisit) : undefined,
        startDate: firstTs.getTime(),
        contractFileId,
        contractFileName: contractFile?.name,
        notes: notes || undefined,
        visitSchedules: [firstTs.getTime()],
      });

      toast.success("Contract created");
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create contract");
    } finally {
      setSaving(false);
    }
  }

  return (
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
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative z-10 w-full sm:max-w-2xl bg-[var(--background)] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold">{t("contracts.newContract")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("contracts.newContractSubtitle")}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Patient selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.patient")} *</label>
            {selectedPatient ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#007AFF]/30 bg-[#007AFF]/5">
                <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] font-bold text-sm">
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-sm flex-1">{selectedPatient.name}</span>
                <button onClick={() => setSelectedPatient(null)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("contracts.searchPatient")}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
                </div>
                <div className="max-h-40 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                  {filteredPatients.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-3 text-center">{t("contracts.noPatients")}</p>
                  ) : filteredPatients.map((p) => (
                    <button key={p._id} onClick={() => setSelectedPatient({ id: p._id, name: p.name })}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left">
                      <div className="w-7 h-7 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] font-bold text-xs flex-shrink-0">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.totalAmount")}</label>
              <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="5000"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.downPayment")}</label>
              <div className="flex gap-2">
                <input type="number" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} placeholder="500"
                  className="flex-1 px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] min-w-0" />
                <select value={downPaymentType} onChange={(e) => setDownPaymentType(e.target.value as "fixed" | "percentage")}
                  className="px-2 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]">
                  <option value="fixed">EGP</option>
                  <option value="percentage">%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cost per visit + live visit count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.costPerVisit")}</label>
              <input type="number" value={costPerVisit} onChange={(e) => setCostPerVisit(e.target.value)} placeholder="500"
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
            </div>
            <div className="flex flex-col justify-end">
              {computedVisits !== null ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#34c759]/10 border border-[#34c759]/30">
                  <CheckCircle2 className="w-4 h-4 text-[#34c759] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-[#34c759]">{computedVisits} {t("contracts.visits")}</p>
                    <p className="text-[10px] text-muted-foreground">{t("contracts.toSchedule")}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/40 border border-border">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">{t("contracts.enterAmounts")}</p>
                </div>
              )}
            </div>
          </div>
          {/* ── First Visit Slot ──────────────────────────────── */}
          {/* ── First Visit Slot ──────────────────────────────── */}
          <VisitSlotPicker
            index={0}
            date={firstVisitDate}
            time={firstVisitTime}
            onDateChange={(d) => setFirstVisitDate(d)}
            onTimeChange={(t) => setFirstVisitTime(t)}
            clerkId={clerkId}
            startHour={startHour}
            endHour={endHour}
            slotMin={slotMin}
            availableDays={(currentUser as any)?.availableDays || []}
          />

          {/* File upload */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.contractDoc")}</label>
            {contractFile ? (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <FileText className="w-5 h-5 text-[#007AFF] flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{contractFile.name}</span>
                <button onClick={() => setContractFile(null)} className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${isDragging ? "border-[#007AFF] bg-[#007AFF]/5" : "border-border hover:border-[#007AFF]/40 hover:bg-muted/20"}`}>
                <Upload className={`w-6 h-6 ${isDragging ? "text-[#007AFF]" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium">{t("contracts.dropFile")} <span className="text-[#007AFF]">{t("contracts.browse")}</span></p>
                <p className="text-xs text-muted-foreground">{t("contracts.fileInfo")}</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">{t("contracts.notes")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t("contracts.notesPlaceholder")}
              className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none" />
          </div>


        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><IOSSpinner size={15} className="text-white" /> {t("onboarding.saving")}</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> {t("contracts.createContract")}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Contract View Drawer (read-only) ──────────────────────────────────────

function ContractViewDrawer({
  contract,
  clerkId,
  onClose,
}: {
  contract: any;
  clerkId: string;
  onClose: () => void;
}) {
  const waiveUnpaidBalance = useMutation(api.contracts.waiveUnpaidBalance);
  const { t } = useI18n();
  const [waiving, setWaiving] = useState(false);
  const [waiveConfirm, setWaiveConfirm] = useState(false);

  async function handleWaive() {
    setWaiving(true);
    try {
      await waiveUnpaidBalance({ clerkId, contractId: contract._id });
      toast.success(t("contracts.waiveSuccess"));
      onClose();
    } catch { toast.error(t("contracts.waiveFail")); }
    finally { setWaiving(false); setWaiveConfirm(false); }
  }

  const { dir } = useI18n();

  const cfg = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG];
  const progress = contract.numVisits > 0
    ? Math.min(100, Math.round(((contract.completedVisits ?? 0) / contract.numVisits) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="relative z-10 w-full sm:max-w-lg bg-[var(--background)] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{contract.patientName}</h2>
              <Badge className={`text-[10px] border ${cfg?.color} font-semibold px-2`}>{cfg ? t(`contracts.${contract.status}`) : contract.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("contracts.contract")} · {fmtDate(contract.startDate, t("common.currency") === "ج.م" ? "ar-EG" : "en-US")}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Financials */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("contracts.total"), value: contract.totalAmount ? `${contract.totalAmount.toLocaleString()} ${t("common.currency")}` : "—" },
              { label: t("contracts.downPayment"), value: contract.downPayment ? `${contract.downPayment.toLocaleString()} ${contract.downPaymentType === "percentage" ? "%" : t("common.currency")}` : "—" },
              { label: t("contracts.costPerVisitShort"), value: contract.costPerVisit ? `${contract.costPerVisit.toLocaleString()} ${t("common.currency")}` : "—" },
              { label: t("contracts.remainingBalance"), value: contract.remainingBalance > 0 ? `${contract.remainingBalance.toLocaleString()} ${t("common.currency")}` : t("contracts.settled") },
            ].map((item) => (
              <div key={item.label} className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Visits progress */}
          {contract.numVisits > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{t("contracts.visitProgress")}</span>
                <span className="text-muted-foreground">{contract.completedVisits ?? 0} / {contract.numVisits} {t("contracts.completed")}</span>
              </div>
              <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                <div className="h-full bg-[#007AFF] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{contract.paidVisits ?? 0} {t("contracts.paid")} · {(contract.completedVisits ?? 0) - (contract.paidVisits ?? 0)} {t("contracts.unpaid").toLowerCase()}</span>
                <span>{contract.visitsLeft} {t("contracts.remaining")}</span>
              </div>
            </div>
          )}

          {/* Unpaid balance */}
          {contract.unpaidBalance > 0 && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/8 border border-red-500/20">
              <div>
                <p className="text-xs font-semibold text-red-500">{t("contracts.unpaidBalance")}</p>
                <p className="text-lg font-bold text-red-500">{contract.unpaidBalance.toLocaleString()} {t("common.currency")}</p>
              </div>
              <button
                onClick={() => setWaiveConfirm(true)}
                disabled={waiving}
                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg transition-colors bg-red-500 hover:bg-red-600 disabled:opacity-60"
              >
                {waiving ? <IOSSpinner size={12} className="text-white" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {t("contracts.waive")}
              </button>
            </div>
          )}

          {/* Waive Confirmation Dialog */}
          <AlertDialog open={waiveConfirm} onOpenChange={setWaiveConfirm}>
            <AlertDialogContent dir={dir}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-500">{t("contracts.waive")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("contracts.waiveConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    handleWaive();
                  }}
                >
                  {t("contracts.waive")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Notes */}
          {contract.notes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t("contracts.notes")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{contract.notes}</p>
            </div>
          )}

          {/* Next visit */}
          {contract.status === "active" && contract.nextVisitDate && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#007AFF]/8 border border-[#007AFF]/20">
              <CalendarIcon className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">{t("contracts.nextVisit")}</p>
                <p className="text-sm font-semibold text-[#007AFF]">{fmtDate(contract.nextVisitDate, t("common.currency") === "ج.م" ? "ar-EG" : "en-US", true)}</p>
              </div>
            </div>
          )}

          {/* Contract file */}
          {contract.fileUrl && (
            <a href={contract.fileUrl} target="_blank" rel="noreferrer" download
              className="flex items-center gap-2 p-3 rounded-xl border border-border hover:border-[#007AFF]/40 hover:bg-muted/20 transition-all">
              <FileText className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
              <span className="text-sm font-medium text-[#007AFF]">{t("contracts.viewDoc")}</span>
              <Download className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
            </a>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir } = useI18n();
  const contracts = useQuery(api.contracts.listContracts, clerkId ? { clerkId } : "skip");
  const deleteContract = useMutation(api.contracts.deleteContract);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"contracts"> | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewContract, setViewContract] = useState<any | null>(null);
  const [contractSearch, setContractSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");

  async function handleDelete(id: Id<"contracts">) {
    setDeleting(id);
    try {
      await deleteContract({ clerkId, contractId: id });
      toast.success("Contract deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  const active = (contracts ?? []).filter((c) => c.status === "active").length;
  const expired = (contracts ?? []).filter((c) => c.status === "expired").length;

  const filteredContracts = useMemo(() => {
    if (!contracts) return undefined;
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (contractSearch.trim()) {
        const q = contractSearch.toLowerCase();
        if (!c.patientName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [contracts, contractSearch, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t("contracts.title")} description={t("contracts.subtitle")}>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 text-xs bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors font-semibold"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("contracts.newContract")}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("contracts.active"), value: active, color: "text-[#34c759]", bg: "bg-[#34c759]/10" },
              { label: t("contracts.expired"), value: expired, color: "text-red-500", bg: "bg-red-500/10" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* List */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50">
              <FileText className="w-5 h-5 text-[#007AFF]" />
              <h2 className="font-bold text-base">{t("contracts.allContracts")}</h2>
              {contracts !== undefined && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredContracts?.length ?? 0} {t("contracts.total")}
                </span>
              )}
            </div>

            {/* Search & Filter Bar */}
            <div className="px-4 pt-4 pb-2 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                  placeholder={t("contracts.searchContracts") || "Search by patient name…"}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] placeholder:text-muted-foreground/60"
                />
              </div>
              <div className="flex gap-1.5">
                {(["all", "active", "expired"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      statusFilter === f
                        ? "bg-[#007AFF] text-white border-[#007AFF]"
                        : "border-border text-muted-foreground hover:border-[#007AFF]/40"
                    }`}
                  >
                    {f === "all" ? t("contracts.allContracts") : t(`contracts.${f}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3">
              {filteredContracts === undefined ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl bg-black/5 dark:bg-white/5" />
                ))
              ) : filteredContracts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
                    <FileText className="w-7 h-7 text-[#007AFF]" />
                  </div>
                  {contractSearch.trim() || statusFilter !== "all" ? (
                    <>
                      <p className="text-sm font-semibold mb-1">{t("contracts.noResults") || "No contracts found"}</p>
                      <p className="text-xs text-muted-foreground mb-4">{t("contracts.noResultsDesc") || "Try adjusting your search or filters."}</p>
                      <button
                        onClick={() => { setContractSearch(""); setStatusFilter("all"); }}
                        className="text-xs font-semibold text-[#007AFF] hover:underline"
                      >
                        {t("feed.clearAll") || "Clear all"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold mb-1">{t("contracts.noContracts")}</p>
                      <p className="text-xs text-muted-foreground mb-4">{t("contracts.noContractsDesc")}</p>
                      <button
                        onClick={() => setCreateOpen(true)}
                        className="text-xs font-semibold text-[#007AFF] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t("contracts.newContract")}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredContracts.map((contract) => {
                  const cfg = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG];
                  return (
                    <div
                      key={contract._id}
                      onClick={() => setViewContract(contract)}
                      className="flex items-start gap-4 p-4 rounded-xl border border-black/5 dark:border-white/5 bg-card shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                    >
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-[#007AFF]" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/patients/${contract.patientId}`}
                            className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
                          >
                            {contract.patientName}
                          </Link>
                          <Badge className={`text-[10px] border ${cfg.color} font-semibold px-2`}>
                            {t(`contracts.${contract.status}`)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {contract.totalAmount && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              {t("contracts.total") || "Total"}: {contract.totalAmount.toLocaleString()} {t("common.currency")}
                            </span>
                          )}
                          {contract.numVisits && (
                            <span className="text-xs font-medium text-[#007AFF] flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {contract.completedVisits ?? 0}/{contract.numVisits} {t("contracts.visits")}
                              {contract.visitsLeft > 0 && (
                                <span className="text-muted-foreground font-normal">({contract.visitsLeft} {t("contracts.left")})</span>
                              )}
                            </span>
                          )}
                          {contract.paidVisits != null && contract.numVisits && (
                            <span className="text-xs font-medium text-[#34c759] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {contract.paidVisits ?? 0} {t("contracts.paid")}
                            </span>
                          )}
                          {contract.remainingBalance > 0 && (
                            <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                              {t("contracts.balance")}: {contract.remainingBalance.toLocaleString()} {t("common.currency")}
                            </span>
                          )}
                          {contract.unpaidBalance != null && contract.unpaidBalance > 0 && (
                            <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {t("contracts.unpaid")}: {contract.unpaidBalance.toLocaleString()} {t("common.currency")}
                            </span>
                          )}
                          {contract.status === "active" && contract.nextVisitDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {t("contracts.next")}: {fmtDate(contract.nextVisitDate, t("common.currency") === "ج.م" ? "ar-EG" : "en-US", true)}
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        {contract.numVisits && contract.numVisits > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{t("contracts.progress")}</span>
                              <span>{Math.round(((contract.completedVisits ?? 0) / contract.numVisits) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#007AFF] rounded-full transition-all"
                                style={{ width: `${Math.min(100, ((contract.completedVisits ?? 0) / contract.numVisits) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(contract._id); }}
                          disabled={deleting === contract._id}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title={t("contracts.delete")}
                        >
                          {deleting === contract._id ? <IOSSpinner size={14} /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {createOpen && (
          <ContractForm clerkId={clerkId} onClose={() => setCreateOpen(false)} />
        )}
      </AnimatePresence>

      {/* View drawer */}
      <AnimatePresence>
        {viewContract && (
          <ContractViewDrawer
            contract={viewContract}
            clerkId={clerkId}
            onClose={() => setViewContract(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">{t("contracts.deleteConfirmTitle") || "Delete Contract"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("contracts.deleteConfirmDesc") || "Are you sure you want to delete this contract? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (deleteConfirm) {
                  handleDelete(deleteConfirm);
                  setDeleteConfirm(null);
                }
              }}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
