"use client";

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";
import { Clock, CalendarIcon, CheckCircle2, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { IOSSpinner } from "@/components/ui/spinner";

interface VisitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  patientId: Id<"patients">;
  patientName: string;
}

// Detect if we're on a sm+ screen (>= 640px) — reads synchronously to avoid flicker
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(min-width: 640px)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export function VisitDrawer({ open, onOpenChange, clerkId, patientId, patientName }: VisitDrawerProps) {
  const { t, lang, dir } = useI18n();
  const isDesktop = useIsDesktop();
  
  const [form, setForm] = useState({
    reasonForVisit: "",
    notes: "",
  });

  const [visitDate, setVisitDate] = useState<Date | undefined>(new Date());
  const [visitTime, setVisitTime] = useState<string>("10:00");
  const [calOpen, setCalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const createVisit = useMutation(api.visits.createVisit);

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  
  function isNonWorkingDay(d: Date): boolean {
    return false;
  }

  const activeDateStart = visitDate ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 0, 0, 0, 0).getTime() : 0;
  const activeDateEnd = visitDate ? new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate(), 23, 59, 59, 999).getTime() : 0;

  const existingVisitsOnDate = useQuery(
    api.visits.getVisitsByDateRange,
    clerkId && visitDate ? { clerkId, startDate: activeDateStart, endDate: activeDateEnd } : "skip"
  );

  const timeSlots = useMemo(() => {
    const startHour = currentUser?.workingHoursStart ?? 9;
    const endHour = currentUser?.workingHoursEnd ?? 17;
    const slotMin = currentUser?.slotDurationMinutes ?? 30;
    const slots: { timeStr: string; label: string; isWorkingHour: boolean; isReserved: boolean }[] = [];

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
  }, [currentUser, existingVisitsOnDate, lang]);

  useEffect(() => {
    if (timeSlots.length > 0 && visitTime === "10:00") {
      const firstAvailable = timeSlots.find(s => s.isWorkingHour && !s.isReserved);
      if (firstAvailable) setVisitTime(firstAvailable.timeStr);
    }
  }, [timeSlots, visitTime]);

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleOpen(v: boolean) {
    if (v) {
      setForm({
        reasonForVisit: "",
        notes: "",
      });
      setVisitDate(new Date());
      setVisitTime("10:00");
    }
    onOpenChange(v);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!visitDate) {
      toast.error("Please pick a visit date");
      return;
    }
    
    const selectedSlot = timeSlots.find(s => s.timeStr === visitTime);
    if (selectedSlot?.isReserved) {
      toast.error("This time slot is already reserved.");
      return;
    }

    setLoading(true);
    try {
      const [hh, mm] = visitTime.split(":").map(Number);
      const exactDate = new Date(visitDate);
      exactDate.setHours(hh ?? 10, mm ?? 0, 0, 0);
      
      await createVisit({
        clerkId,
        patientId,
        date: exactDate.getTime(),
        source: "manual",
        reasonForVisit: form.reasonForVisit || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Visit recorded");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save visit");
    } finally {
      setLoading(false);
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
      <div className="px-6 space-y-4 py-4">
        
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.date")} *</p>
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <button type="button" className="w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border border-border rounded-xl hover:border-[#007AFF]/50 transition-colors text-start">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {visitDate ? visitDate.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short", month: "short", day: "numeric" }) : t("visit.pickDate")}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={visitDate} 
                  onSelect={(d) => { if (d) { setVisitDate(d); setCalOpen(false); } }} 
                  disabled={(d) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return d < today || isNonWorkingDay(d);
                  }} 
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("visit.timeSlot")}</p>
            <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
              {timeSlots.filter(s => s.isWorkingHour).map(slot => (
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
                  {slot.isReserved && <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">{t("visit.reserved") || "Reserved"}</span>}
                  {!slot.isReserved && visitTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border">
          <Label htmlFor="visit-reason" className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("visit.reasonForVisit")}</Label>
          <input
            id="visit-reason"
            type="text"
            value={form.reasonForVisit}
            onChange={(e) => set("reasonForVisit", e.target.value)}
            placeholder="e.g. Follow-up, checkup, acute complaint…"
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-shadow"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="visit-notes" className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("visit.notes")}</Label>
          <textarea
            id="visit-notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional free-form notes..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none transition-shadow"
          />
        </div>
      </div>
    </form>
  );

  const footerContent = (
    <div className="flex flex-row gap-2 border-t border-border px-6 py-4">
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
        {loading ? <><IOSSpinner size={16} className="text-white" /> {t("onboarding.saving")}</> : t("visit.saveVisit")}
      </button>
    </div>
  );

  // When not open and on mobile, render nothing
  if (!open && !isDesktop) return null;

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
              className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold">{t("visit.newVisit")}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("visit.recordingFor")} {patientName}
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
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="px-6 text-start">
          <DrawerTitle>{t("visit.newVisit")}</DrawerTitle>
          <DrawerDescription>{t("visit.recordingFor")} {patientName}</DrawerDescription>
        </DrawerHeader>
        {formContent}
        <DrawerFooter className="p-0">
          {footerContent}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
