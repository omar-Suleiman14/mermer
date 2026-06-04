"use client";

import { useState, useMemo, useRef, useEffect, memo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { AddToQueueDrawer } from "@/components/add-to-queue-drawer";
import dynamic from "next/dynamic";
const VisitCompletionModal = dynamic(() => import("@/components/visit-completion-modal").then(m => m.VisitCompletionModal));
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { IOSSpinner } from "@/components/ui/spinner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  XCircle,
  MessageCircle,
  GripVertical,
  CalendarIcon,
  RefreshCw,
  X,
  MoreHorizontal,
  FolderOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import Link from "next/link";
import { useI18n, type Lang } from "@/lib/i18n/client";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { startOfDay, formatTime, formatFullDate, isNonWorkingDay, openWhatsApp, useWhatsAppTemplate, dateLocale } from "@/lib/scheduling";

/** Returns N day timestamps starting from anchorDay */
function getWeekDays(anchorDay: number, count = 7): number[] {
  return Array.from({ length: count }, (_, i) => anchorDay + i * 86400000);
}

function DroppableSlot({ id, children }: { id: number, children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl transition-colors ${
        isOver ? "bg-[#007AFF]/10 ring-2 ring-[#007AFF]/30" : ""
      }`}
    >
      {children}
    </div>
  );
}

interface DraggableApptItemProps {
  appt: any;
  ts: number;
  isSelectedDayPast: boolean;
  isDone: boolean;
  initials: string;
  onComplete: () => void;
  onReminder: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onReschedule: () => void;
  tag?: "current" | "next";
  canReschedule?: boolean;
  canCancel?: boolean;
  onConfirm?: () => void;
}

const DraggableApptItem = memo(function DraggableApptItem({
  appt,
  ts,
  isSelectedDayPast,
  isDone,
  initials,
  onComplete,
  onReminder,
  onCancel,
  onReschedule,
  tag,
  canReschedule = true,
  canCancel = true,
  onConfirm,
}: DraggableApptItemProps) {
  const { t, dir, lang } = useI18n();
  const isinstallmentVisit = appt.source === "installment";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt._id,
    disabled: isSelectedDayPast || isDone,
    data: { appt },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 1,
        position: "relative" as const,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border transition-all ${
        !isSelectedDayPast && !isDone ? "hover:shadow-md" : ""
      } ${
        isDone
          ? "opacity-60 bg-muted/20 border-border/40"
          : "bg-card border-black/5 dark:border-white/5 shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      {!isSelectedDayPast && !isDone && (
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <span className="text-xs font-bold w-16 shrink-0 text-start">{formatTime(ts, lang)}</span>

      <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#007AFF]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0 text-start">
        <div className="flex items-center gap-1.5 flex-wrap">
          {appt.patientId ? (
            <Link
              href={`/dashboard/patients/${appt.patientId}`}
              className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
            >
              {appt.patientName}
            </Link>
          ) : (
            <span className="font-semibold text-sm truncate">{appt.patientName}</span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "installment" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("schedule.installment")}
            </span>
          ) : appt.source === "follow-up" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 px-1.5 py-0.5 rounded-full">
              {t("schedule.followUp")}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
              {t("dashboard.manual")}
            </span>
          )}
          {tag === "current" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 px-1.5 py-0.5 rounded-full">
              Current
            </span>
          )}
          {tag === "next" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 px-1.5 py-0.5 rounded-full">
              Next
            </span>
          )}
          {appt.status === "pending" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "قيد الانتظار" : "Pending"}
            </span>
          )}
        </div>
        {appt.patientPhone && (
          <p className="text-xs text-muted-foreground mt-0.5">{appt.patientPhone}</p>
        )}
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            {!isSelectedDayPast ? (
              <>
                <button
                  onClick={onComplete}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] border border-[#007AFF]/30 px-2 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {t("dashboard.openVisit")}
                </button>
                <button
                  onClick={onReminder}
                  title={t("schedule.reminderWhatsAppTitle")}
                  className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {appt.status === "pending" && onConfirm && (
                  <button
                    onClick={onConfirm}
                    title={t("common.confirm") || "Confirm"}
                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    title={t("schedule.reschedule") || "Reschedule"}
                    className={`p-1.5 rounded-lg transition-colors ${isinstallmentVisit ? "text-[#AF52DE] hover:bg-[#AF52DE]/10" : "text-[#007AFF] hover:bg-[#007AFF]/10"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                {canCancel && !isinstallmentVisit && (
                  <button
                    onClick={onCancel}
                    title={t("schedule.cancelTitle") || "Cancel"}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                  {t("schedule.missed")}
                </Badge>
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    title={t("schedule.reschedule") || "Reschedule"}
                    className={`p-1.5 rounded-lg transition-colors ${isinstallmentVisit ? "text-[#AF52DE] hover:bg-[#AF52DE]/10" : "text-[#007AFF] hover:bg-[#007AFF]/10"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <div className="block sm:hidden">
            <DropdownMenu dir={dir}>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isSelectedDayPast ? (
                  <>
                    <DropdownMenuItem onClick={onComplete} className="gap-2 cursor-pointer font-medium text-[#007AFF] focus:text-[#007AFF]">
                      <FolderOpen className="w-4 h-4" />
                      <span>{t("dashboard.openVisit")}</span>
                    </DropdownMenuItem>
                    {appt.patientPhone && (
                      <DropdownMenuItem onClick={onReminder} className="gap-2 cursor-pointer font-medium text-[#25D366] focus:text-[#25D366]">
                        <MessageCircle className="w-4 h-4" />
                        <span>{t("schedule.sendReminder") || "Send Reminder"}</span>
                      </DropdownMenuItem>
                    )}
                    {appt.status === "pending" && onConfirm && (
                      <DropdownMenuItem onClick={onConfirm} className="gap-2 cursor-pointer font-medium text-green-500 focus:text-green-500 focus:bg-green-500/10">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{t("common.confirm") || "Confirm"}</span>
                      </DropdownMenuItem>
                    )}
                    {(canReschedule || (canCancel && !isinstallmentVisit)) && <DropdownMenuSeparator />}
                    {canReschedule && (
                      <DropdownMenuItem onClick={onReschedule} className={`gap-2 cursor-pointer font-medium ${isinstallmentVisit ? "text-[#AF52DE] focus:text-[#AF52DE] focus:bg-[#AF52DE]/10" : "text-[#007AFF] focus:text-[#007AFF] focus:bg-[#007AFF]/10"}`}>
                        <RefreshCw className="w-4 h-4" />
                        <span>{t("schedule.reschedule") || "Reschedule"}</span>
                      </DropdownMenuItem>
                    )}
                    {canCancel && !isinstallmentVisit && (
                      <DropdownMenuItem onClick={onCancel} className="gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10">
                        <XCircle className="w-4 h-4" />
                        <span>{t("common.cancel") || "Cancel"}</span>
                      </DropdownMenuItem>
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem disabled className="gap-2 font-medium text-amber-600">
                      <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                        {t("schedule.missed")}
                      </Badge>
                    </DropdownMenuItem>
                    {canReschedule && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onReschedule} className={`gap-2 cursor-pointer font-medium ${isinstallmentVisit ? "text-[#AF52DE] focus:text-[#AF52DE] focus:bg-[#AF52DE]/10" : "text-[#007AFF] focus:text-[#007AFF] focus:bg-[#007AFF]/10"}`}>
                          <RefreshCw className="w-4 h-4" />
                          <span>{t("schedule.reschedule") || "Reschedule"}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
});

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ─── Component ────────────────────────────────────────────────────────────────

function SchedulePageInner() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir, lang } = useI18n();
  const searchParams = useSearchParams();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  // Permission checks
  const isAssistant = currentUser?.role === "assistant";
  const userPerms: string[] = currentUser?.permissions ?? [];
  const canReschedule = !isAssistant || userPerms.includes("appointments.reschedule");
  const canCancel = !isAssistant || userPerms.includes("appointments.cancel");

  const messageTemplates = useQuery(
    api.messageTemplates.listTemplates,
    clerkId ? { clerkId } : "skip"
  );

  const todayTs = startOfDay(Date.now());
  const initDate = searchParams.get("date");
  const initVisitId = searchParams.get("visitId");

  // Strip container ref — used to measure how many days fit
  const stripContainerRef = useRef<HTMLDivElement>(null);
  const [daysInView, setDaysInView] = useState(7);

  useEffect(() => {
    const el = stripContainerRef.current;
    if (!el) return;
    const DAY_BTN_W = 52; // px per day button (approx)
    const CHEVRON_W = 72; // both chevrons combined
    const obs = new ResizeObserver(([entry]) => {
      const available = (entry?.contentRect.width ?? 320) - CHEVRON_W;
      const count = Math.max(3, Math.min(14, Math.floor(available / DAY_BTN_W)));
      setDaysInView(count);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Single week offset: steps by daysInView instead of 7
  const initialDay = initDate ? startOfDay(Number(initDate)) : todayTs;
  const initialOffset = Math.round((initialDay - todayTs) / 86400000);
  
  const [weekOffset, setWeekOffset] = useState(initialOffset);
  const [selectedDay, setSelectedDay] = useState<number>(initialDay);

  useEffect(() => {
    if (initDate) {
      const d = startOfDay(Number(initDate));
      if (d !== selectedDay) {
        setSelectedDay(d);
        setWeekOffset(Math.round((d - todayTs) / 86400000));
      }
    }
  }, [initDate]);

  const [addOpen, setAddOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<number | null>(null);

  const [cancelModal, setCancelModal] = useState<Id<"visits"> | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ visitId: Id<"visits">; patientName: string; isinstallment?: boolean } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleCalOpen, setRescheduleCalOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const [completionModal, setCompletionModal] = useState<{
    appointmentId: Id<"visits">;
    patientId?: Id<"patients">;
    patientName: string;
    patientAge?: number;
    installmentId?: Id<"installments">;
    tag?: "current" | "next";
  } | null>(null);

  // Template picker state
  const [templatePicker, setTemplatePicker] = useState<{
    patientName: string;
    patientPhone: string;
    appointmentDate: number;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on click outside
  useEffect(() => {
    if (!templatePicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setTemplatePicker(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [templatePicker]);

  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activeAppt, setActiveAppt] = useState<any | null>(null);

  // Dynamic week strip
  const weekAnchor = todayTs + weekOffset * 86400000;
  const weekDays = getWeekDays(weekAnchor, daysInView);

  // Fetch appointments for selected day
  const rawAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId ? { clerkId, dayStart: selectedDay } : "skip"
  );

  useEffect(() => {
    if (initVisitId && rawAppointments && !completionModal) {
      const visit = rawAppointments.find(v => v._id === initVisitId);
      if (visit) {
        setCompletionModal({
          appointmentId: visit._id,
          patientId: visit.patientId ?? undefined,
          patientName: visit.patientName ?? "",
          patientAge: visit.patientAge,
          installmentId: visit.installmentId ?? undefined,
          tag: undefined,
        });
      }
    }
  }, [initVisitId, rawAppointments]);

  const rescheduleDateStart = useMemo(() => {
    if (!rescheduleDate) return undefined;
    const d = new Date(rescheduleDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [rescheduleDate]);

  const rescheduleDateAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId && rescheduleDateStart ? { clerkId, dayStart: rescheduleDateStart } : "skip"
  );

  // Build time slots from doctor settings
  const daySlots = useMemo(() => {
    if (!currentUser) return [] as number[];
    const startHour = (currentUser as any).workingHoursStart ?? 9;
    const endHour = (currentUser as any).workingHoursEnd ?? 17;
    const slotMin = currentUser.slotDurationMinutes ?? 30;

    const slots: number[] = [];
    const cursor = new Date(selectedDay);
    cursor.setHours(startHour, 0, 0, 0);
    const end = new Date(selectedDay);
    end.setHours(endHour, 0, 0, 0);
    while (cursor < end) {
      slots.push(cursor.getTime());
      cursor.setMinutes(cursor.getMinutes() + slotMin);
    }
    return slots;
  }, [selectedDay, currentUser]);

  // Map slot timestamp → appointment list (aligned to nearest slot)
  type ApptItem = NonNullable<typeof rawAppointments>[number];
  const appointmentsBySlot = useMemo(() => {
    const map = new Map<number, ApptItem[]>();
    if (!rawAppointments) return map;

    rawAppointments.forEach((appt) => {
      if (appt.status === "cancelled") return;

      // Find the closest slot in daySlots
      if (daySlots.length > 0) {
        let closestSlot = daySlots[0];
        let minDiff = Math.abs(appt.date - closestSlot);
        for (let i = 1; i < daySlots.length; i++) {
          const diff = Math.abs(appt.date - daySlots[i]);
          if (diff < minDiff) {
            minDiff = diff;
            closestSlot = daySlots[i];
          }
        }
        const list = map.get(closestSlot) || [];
        list.push(appt);
        map.set(closestSlot, list);
      } else {
        // Fallback: map to its own timestamp if no slots
        const list = map.get(appt.date) || [];
        list.push(appt);
        map.set(appt.date, list);
      }
    });
    return map;
  }, [rawAppointments, daySlots]);

  // Compute current and next appointments based on real time
  const { currentApptId, nextApptId } = useMemo(() => {
    if (!rawAppointments || !currentUser) return { currentApptId: null, nextApptId: null };
    
    // Only apply for today
    if (startOfDay(Date.now()) !== selectedDay) {
      return { currentApptId: null, nextApptId: null };
    }

    const now = Date.now();
    // We use slotDurationMinutes from the doctor's profile.
    const slotDurationMs = ((currentUser as any).slotDurationMinutes || 30) * 60000;
    
    const incomplete = rawAppointments
      .filter(a => a.status !== "completed" && a.status !== "cancelled")
      .sort((a, b) => a.date - b.date);

    const current = incomplete.find(a => a.date <= now && a.date + slotDurationMs > now);
    const next = incomplete.find(a => a.date > now);

    return {
      currentApptId: current?._id || null,
      nextApptId: next?._id || null,
    };
  }, [rawAppointments, currentUser, selectedDay]);

  const cancelledToday = useMemo(
    () => (rawAppointments ?? []).filter((a) => a.status === "cancelled"),
    [rawAppointments]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCompleteVisit = useCallback(async (
    prescriptionImageId?: Id<"_storage">,
    notes?: string
  ) => {
    if (!completionModal) return;
    try {
      await updateAppointment({
        clerkId,
        appointmentId: completionModal.appointmentId,
        updates: { status: "completed", prescriptionImageId, notes },
      });
      toast.success(t("toast.visitMarkedComplete"));
      setCompletionModal(null);
    } catch {
      toast.error(t("toast.visitCompleteFailed"));
    }
  }, [clerkId, completionModal, updateAppointment, t]);

  const handleCancel = useCallback(async (appointmentId: Id<"visits">) => {
    try {
      await updateAppointment({
        clerkId,
        appointmentId,
        updates: { status: "cancelled" },
      });
      toast.success(lang === "ar" ? "تم إلغاء الموعد بنجاح" : "Appointment cancelled successfully");
    } catch {
      toast.error(lang === "ar" ? "تعذّر إلغاء الموعد" : "Failed to cancel appointment");
    }
  }, [clerkId, updateAppointment, rawAppointments, t]);

  const handleConfirmVisit = useCallback(async (appointmentId: Id<"visits">) => {
    try {
      await updateAppointment({
        clerkId,
        appointmentId,
        updates: { status: "confirmed" },
      });
      toast.success(lang === "ar" ? "تم تأكيد الموعد بنجاح" : "Appointment confirmed successfully");
    } catch {
      toast.error(lang === "ar" ? "تعذّر تأكيد الموعد" : "Failed to confirm appointment");
    }
  }, [clerkId, updateAppointment, t]);

  const handleReschedule = useCallback(async () => {
    if (!rescheduleModal || !rescheduleDate) return;
    setRescheduling(true);
    try {
      const [hh, mm] = rescheduleTime.split(":").map(Number);
      const d = new Date(rescheduleDate);
      d.setHours(hh, mm, 0, 0);
      await updateAppointment({ clerkId, appointmentId: rescheduleModal.visitId, updates: { date: d.getTime() } });
      toast.success(lang === "ar" ? "تمت إعادة الجدولة بنجاح" : "Rescheduled successfully");
      setRescheduleModal(null);
      setRescheduleDate(undefined);
    } catch { toast.error(lang === "ar" ? "تعذّر إعادة الجدولة" : "Failed to reschedule"); }
    finally { setRescheduling(false); }
  }, [clerkId, rescheduleModal, rescheduleDate, rescheduleTime, updateAppointment, rawAppointments, t]);

  // Working days from doctor profile for reschedule calendar
  const rescheduleWorkingDays: string[] = (currentUser as any)?.availableDays ?? [];

  const rescheduleSlots = useMemo(() => {
    const sh = currentUser?.workingHoursStart ?? 9;
    const eh = currentUser?.workingHoursEnd ?? 17;
    const sm = currentUser?.slotDurationMinutes ?? 30;
    
    const takenTimeStrs = new Set(
      (rescheduleDateAppointments || [])
        .filter(a => a.status !== "cancelled" && a._id !== rescheduleModal?.visitId)
        .map(a => {
          const d = new Date(a.date);
          return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        })
    );

    const slots: { timeStr: string; label: string }[] = [];
    for (let h = sh; h < eh; h++) {
      for (let m = 0; m < 60; m += sm) {
        const hh = h.toString().padStart(2, "0");
        const mm = m.toString().padStart(2, "0");
        const timeStr = `${hh}:${mm}`;
        if (!takenTimeStrs.has(timeStr)) {
          const ampm = h >= 12 ? (lang === "ar" ? "م" : "PM") : (lang === "ar" ? "ص" : "AM");
          const dh = h % 12 || 12;
          slots.push({ timeStr, label: `${dh}:${mm} ${ampm}` });
        }
      }
    }
    return slots;
  }, [currentUser, rescheduleDateAppointments, rescheduleModal?.visitId, lang]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveAppt(event.active.data.current?.appt ?? null);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveAppt(null);
    const { active, over } = event;
    if (!over) return;

    const targetTs = over.id as number;
    const targetAppts = appointmentsBySlot.get(targetTs) || [];
    const draggedApptId = active.id as Id<"visits">;

    try {
      if (targetAppts.length === 1) {
        const targetAppt = targetAppts[0];
        if (targetAppt._id !== draggedApptId) {
          await swapAppointments({ clerkId, appointmentId1: draggedApptId, appointmentId2: targetAppt._id });
          toast.success(lang === "ar" ? "تم تبديل المواعيد بنجاح" : "Appointments swapped");
        }
      } else {
        await updateAppointment({ clerkId, appointmentId: draggedApptId, updates: { date: targetTs } });
        toast.success(lang === "ar" ? "تم نقل الموعد بنجاح" : "Appointment moved successfully");
      }
    } catch {
      toast.error(lang === "ar" ? "تعذّر الترتيب - الموعد محجوز مسبقاً" : "Cannot reorder - appointment already booked");
    }
  }, [clerkId, appointmentsBySlot, swapAppointments, updateAppointment, rawAppointments, t]);

  const sendWhatsAppTemplate = useWhatsAppTemplate(lang);

  function openTemplatePicker(patientName: string, patientPhone: string, appointmentDate: number, e: React.MouseEvent) {
    setTemplatePicker({ patientName, patientPhone, appointmentDate, anchorX: e.clientX, anchorY: e.clientY });
  }

  function sendWithTemplate(templateBody: string) {
    if (!templatePicker) return;
    const { patientName, patientPhone, appointmentDate } = templatePicker;
    sendWhatsAppTemplate(templateBody, patientName, patientPhone, appointmentDate, (currentUser as any)?.clinicAddressLink);
    setTemplatePicker(null);
  }

  const isSelectedDayPast = selectedDay < todayTs;
  const isSelectedDayToday = selectedDay === todayTs;

  // Working days from doctor profile
  const workingDays: string[] = (currentUser as any)?.availableDays ?? [];
  const hasWorkingDays = workingDays.length > 0;
  const DOW_ABBR: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
  // Only flag non-working if the doctor has configured specific days
  const isWorkingDay = !hasWorkingDays || workingDays.includes(DOW_ABBR[new Date(selectedDay).getDay()]);
  const visibleWeekDays = weekDays;

  const WeekChevronPrev = dir === "rtl" ? ChevronRight : ChevronLeft;
  const WeekChevronNext = dir === "rtl" ? ChevronLeft : ChevronRight;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("schedule.title")}
        description={t("schedule.subtitle")}
      >
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Calendar card */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">

            {/* Week strip */}
            <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-3 sm:pb-4 border-b border-border/50" ref={stripContainerRef}>
              <div className="flex items-center gap-2">
                {/* Back week */}
                <button
                  onClick={() => {
                    const newOffset = weekOffset - daysInView;
                    setWeekOffset(newOffset);
                    setSelectedDay(todayTs + newOffset * 86400000);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <WeekChevronPrev className="w-4 h-4" />
                </button>

                {/* Day buttons */}
                <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {visibleWeekDays.map((dayTs) => {
                    const d = new Date(dayTs);
                    const isSelected = selectedDay === dayTs;
                    const isToday = dayTs === todayTs;
                    const isPast = dayTs < todayTs;
                    return (
                      <button
                        key={dayTs}
                        onClick={() => setSelectedDay(dayTs)}
                        className={`shrink-0 flex flex-col items-center py-2 px-2.5 rounded-xl text-xs transition-all min-w-11 ${
                          isSelected
                            ? "bg-[#007AFF] text-white"
                            : isToday
                            ? "border-2 border-[#007AFF]/40 text-[#007AFF]"
                            : isPast
                            ? "text-muted-foreground/50 hover:bg-muted/30"
                            : "hover:bg-muted/60 text-muted-foreground"
                        }`}
                      >
                        <span className="font-medium text-[10px] uppercase">
                          {d.toLocaleDateString(dateLocale(lang), { weekday: "short" })}
                        </span>
                        <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                        {isToday && !isSelected && (
                          <span className="w-1 h-1 rounded-full bg-[#007AFF] mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Forward week */}
                <button
                  onClick={() => {
                    const newOffset = weekOffset + daysInView;
                    setWeekOffset(newOffset);
                    setSelectedDay(todayTs + newOffset * 86400000);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <WeekChevronNext className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 gap-2">
                <div>
                  <span className="font-bold text-sm">
                    {isSelectedDayToday ? t("schedule.today") + " — " : ""}{formatFullDate(selectedDay, lang)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSelectedDayToday && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-2 py-0.5 rounded-full">
                      {t("schedule.today")}
                    </span>
                  )}
                  {isSelectedDayPast && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                      {t("schedule.past")}
                    </span>
                  )}
                  {/* Jump to today */}
                  {!isSelectedDayToday && (
                    <button
                      onClick={() => { setWeekOffset(0); setSelectedDay(todayTs); }}
                      className="text-[11px] font-semibold text-[#007AFF] hover:underline"
                    >
                      {t("schedule.today")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Slots */}
            <div className="p-4 space-y-2">
              {rawAppointments === undefined ? (
                <div className="flex items-center justify-center py-10">
                  <IOSSpinner size={24} className="text-[#007AFF]" />
                </div>
              ) : daySlots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">{t("schedule.noHours")}</p>
                  <Link
                    href="/dashboard/settings"
                    className="text-[#007AFF] hover:underline text-xs mt-1 inline-block"
                  >
                    {t("schedule.updateSettings")}
                  </Link>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  {!isWorkingDay && (
                    <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                      <div className="mt-0.5">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-500">{t("schedule.clinicClosed")}</p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">{t("schedule.notWorkingDay")}</p>
                      </div>
                    </div>
                  )}
                  {daySlots.map((ts) => {
                    const appts = appointmentsBySlot.get(ts);

                    if (!appts || appts.length === 0) {
                      return (
                        <DroppableSlot key={ts} id={ts}>
                          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border/50 bg-muted/10 transition-colors">
                            <span className="text-xs font-bold w-14 text-muted-foreground/60 text-start">{formatTime(ts, lang)}</span>
                            <span className="text-xs text-muted-foreground/40 italic flex-1 text-start">{t("schedule.available")}</span>
                            {!isSelectedDayPast && (
                              <button
                                onClick={() => { setPreselectedSlot(ts); setAddOpen(true); }}
                                className="text-xs font-semibold text-[#007AFF] hover:underline px-2 py-1"
                              >
                                + {t("common.add")}
                              </button>
                            )}
                          </div>
                        </DroppableSlot>
                      );
                    }

                    return (
                      <DroppableSlot key={ts} id={ts}>
                        <div className="space-y-2 border border-border/50 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 p-2.5 rounded-xl">

                          <div className="space-y-2">
                            {appts.map((appt) => {
                              const isDone = appt.status === "completed";
                              const initials = (appt.patientName ?? "?")
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);

                              const isCurrent = currentApptId === appt._id;
                              const isNext = nextApptId === appt._id;
                              const apptTag = isCurrent ? "current" : isNext ? "next" : undefined;

                              return (
                                <DraggableApptItem
                                  key={appt._id}
                                  appt={appt}
                                  ts={appt.date}
                                  isSelectedDayPast={isSelectedDayPast}
                                  isDone={isDone}
                                  initials={initials}
                                  tag={apptTag}
                                  canReschedule={canReschedule}
                                  canCancel={canCancel}
                                  onComplete={() => {
                                    setCompletionModal({ appointmentId: appt._id, patientId: appt.patientId ?? undefined, patientName: appt.patientName, patientAge: appt.patientAge, installmentId: appt.installmentId ?? undefined, tag: apptTag });
                                  }}
                                  onConfirm={() => handleConfirmVisit(appt._id)}
                                  onReminder={(e: React.MouseEvent) => appt.patientPhone && openTemplatePicker(appt.patientName, appt.patientPhone, appt.date, e)}
                                  onCancel={() => setCancelModal(appt._id)}
                                  onReschedule={() => setRescheduleModal({ visitId: appt._id, patientName: appt.patientName, isinstallment: appt.source === "installment" })}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </DroppableSlot>
                    );
                  })}

                  {typeof document !== "undefined" && (
                    <DragOverlay>
                      {activeAppt ? (
                        <div className="opacity-90 shadow-2xl scale-[1.02] bg-background border border-[#007AFF]/40 rounded-xl overflow-hidden">
                          <DraggableApptItem
                            appt={activeAppt}
                            ts={activeAppt.date}
                            isSelectedDayPast={isSelectedDayPast}
                            isDone={activeAppt.status === "completed"}
                            initials={(activeAppt.patientName ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            onComplete={() => {}}
                            onReminder={(e) => {}}
                            onCancel={() => {}}
                            onReschedule={() => {}}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  )}

                  {cancelledToday.length > 0 && (
                    <div className="pt-3 mt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        {t("schedule.cancelled")}
                      </p>
                      {cancelledToday.map((appt) => (
                        <div key={appt._id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg opacity-40">
                          <span className="text-xs font-bold w-14 text-muted-foreground">{formatTime(appt.date, lang)}</span>
                          <span className="text-sm line-through text-muted-foreground">{appt.patientName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DndContext>
              )}
            </div>
          </div>

        </div>
      </div>

      <AddToQueueDrawer
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setPreselectedSlot(null); }}
        selectedDate={selectedDay}
        preselectedSlot={preselectedSlot}
        clerkId={clerkId}
      />

      <AlertDialog open={!!cancelModal} onOpenChange={(v) => !v && setCancelModal(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">{t("dialog.deleteVisitTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dialog.deleteVisitDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (cancelModal) {
                  handleCancel(cancelModal);
                  setCancelModal(null);
                }
              }}
            >
              {t("dialog.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Modal for installment Visits */}
      <AnimatePresence>
        {rescheduleModal && (
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
              onClick={() => { setRescheduleModal(null); setRescheduleDate(undefined); }}
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative z-10 w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${rescheduleModal.isinstallment ? "bg-[#AF52DE]/10" : "bg-[#007AFF]/10"}`}>
                    <RefreshCw className={`w-5 h-5 ${rescheduleModal.isinstallment ? "text-[#AF52DE]" : "text-[#007AFF]"}`} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">
                      {rescheduleModal.isinstallment ? t("schedule.rescheduleinstallmentVisit") : t("schedule.rescheduleVisit")}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{rescheduleModal.patientName}</p>
                  </div>
                </div>
                {rescheduleModal.isinstallment ? (
                  <p className="text-xs text-muted-foreground mt-3 bg-[#AF52DE]/5 border border-[#AF52DE]/20 rounded-lg px-3 py-2">
                    {t("schedule.installmentNoCancel")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-lg px-3 py-2">
                    {t("schedule.pickNewDateTime")}
                  </p>
                )}
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("schedule.newDate")} <span className="text-red-500">*</span></p>
                    <Popover open={rescheduleCalOpen} onOpenChange={setRescheduleCalOpen}>
                      <PopoverTrigger asChild>
                        <button className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border rounded-xl transition-colors text-left ${rescheduleModal.isinstallment ? "hover:border-[#AF52DE]/50" : "hover:border-[#007AFF]/50"} ${!rescheduleDate ? "border-red-400/60" : "border-border"}`}>
                          <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className={rescheduleDate ? "" : "text-muted-foreground"}>
                            {rescheduleDate ? rescheduleDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : (t("visit.pickDate") || "Pick date")}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={rescheduleDate} onSelect={(d) => { if (d) { setRescheduleDate(d); setRescheduleCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay(d, rescheduleWorkingDays)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("installments.timeSlot")}</p>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border/50">
                      {rescheduleSlots.map(slot => (
                        <button key={slot.timeStr} onClick={() => setRescheduleTime(slot.timeStr)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${rescheduleTime === slot.timeStr ? (rescheduleModal.isinstallment ? "bg-[#AF52DE]/10 text-[#AF52DE] font-semibold" : "bg-[#007AFF]/10 text-[#007AFF] font-semibold") : "hover:bg-muted/30"}`}>
                          <span>{slot.label}</span>
                          {rescheduleTime === slot.timeStr && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setRescheduleModal(null); setRescheduleDate(undefined); }}
                    className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={!rescheduleDate || rescheduling}
                    className={`flex-1 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${rescheduleModal.isinstallment ? "bg-[#AF52DE] hover:bg-[#9B3DC8]" : "bg-[#007AFF] hover:bg-[#005bb5]"}`}
                  >
                    {rescheduling ? <IOSSpinner size={16} className="text-white" /> : <RefreshCw className="w-4 h-4" />}
                    {t("schedule.reschedule") || "Reschedule"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VisitCompletionModal
        open={!!completionModal}
        onOpenChange={(v) => !v && setCompletionModal(null)}
        clerkId={clerkId}
        visitId={completionModal?.appointmentId as any}
        patientId={completionModal?.patientId}
        patientName={completionModal?.patientName ?? ""}
        patientAge={completionModal?.patientAge}
        installmentId={completionModal?.installmentId}
        tag={completionModal?.tag}
        onComplete={() => {
          if (completionModal && !completionModal.installmentId) {
            handleCompleteVisit();
          }
          setCompletionModal(null);
        }}
      />

      {/* Template Picker Popover */}
      <AnimatePresence>
        {templatePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setTemplatePicker(null)} />
            <motion.div
              ref={pickerRef}
              initial={{ y: 40, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative z-10 w-full sm:max-w-sm bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="sm:hidden w-10 h-1 rounded-full bg-border mx-auto mt-2.5 mb-1" />
              <div className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold">
                    {t("templates.sendTo")} {templatePicker.patientName.split(" ")[0]}
                  </p>
                  <button onClick={() => setTemplatePicker(null)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("templates.chooseTemplate")}</p>
              </div>
              <div className="px-3 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
                {(messageTemplates ?? []).map((tpl) => (
                  <button
                    key={tpl._id}
                    onClick={() => sendWithTemplate(tpl.body)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#007AFF]/8 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tpl.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{tpl.body}</p>
                    </div>
                  </button>
                ))}

                {(messageTemplates ?? []).length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                    <MessageCircle className="w-7 h-7 text-muted-foreground/30" />
                    <p className="text-xs font-medium text-muted-foreground">No message templates yet</p>
                    <p className="text-[11px] text-muted-foreground/70">{t("templates.createInSettings")}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border px-5 py-3">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setTemplatePicker(null)}
                  className="text-[11px] text-[#007AFF] font-medium hover:underline"
                >
                  {t("templates.manageInSettings")}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={null}>
      <SchedulePageInner />
    </Suspense>
  );
}
