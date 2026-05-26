"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { IOSSpinner } from "@/components/ui/spinner";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Activity,
  PlusCircle,
  MessageCircle,
  GripVertical,
  XCircle,
  CalendarIcon,
  X,
  MoreHorizontal,
  Link as LinkIcon,
  RefreshCw,
  FolderOpen,
  AlertTriangle,
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
import { useI18n } from "@/lib/i18n/client";
import { useMemo, useState, useRef, useEffect, memo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";



function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number, locale = "en-US") {
  return new Date(ts).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullDate(ts: number, locale = "en-US") {
  return new Date(ts).toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const SortableApptItem = memo(function SortableApptItem({
  appt,
  onComplete,
  onReminder,
  onCancel,
  onReschedule,
  tag,
}: {
  appt: any;
  onComplete: () => void;
  onReminder: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onReschedule: () => void;
  tag?: "current" | "next";
}) {
  const isinstallmentVisit = appt.source === "installment";
  const isDone = appt.status === "completed";
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: appt._id,
    disabled: isDone
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  const initials = (appt.patientName ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { t, dir, lang } = useI18n();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all ${
        !isDone ? "hover:shadow-md" : ""
      } ${
        isDragging ? "opacity-90 shadow-2xl scale-[1.02] bg-background border-[#007AFF]/40" : 
        isDone ? "opacity-55 bg-muted/20 border-border/40" : "bg-card border-black/5 dark:border-white/5 shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      {!isDone && (
        <div 
          {...attributes} 
          {...listeners}
          className="shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="flex flex-col items-center w-12 sm:w-14 shrink-0">
        <Clock className="w-3 h-3 text-muted-foreground mb-0.5" />
        <span className="text-xs font-bold text-[#1a1916] dark:text-[#f0efea]">
          {formatTime(appt.date, lang === "ar" ? "ar-EG" : "en-US")}
        </span>
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-[#007AFF]">
          {initials}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-start">
        <div className="flex items-center gap-2 flex-wrap">
          {appt.patientId ? (
            <Link
              href={`/dashboard/patients/${appt.patientId}`}
              className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
            >
              {appt.patientName}
            </Link>
          ) : (
              <span className="font-semibold text-sm truncate">
                {appt.patientName}
              </span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "installment" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.installment")}
            </span>
          ) : appt.source === "follow-up" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.followUp")}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
              {t("dashboard.manual")}
            </span>
          )}
          {tag === "current" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "الحالي" : "Current"}
            </span>
          )}
          {tag === "next" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "التالي" : "Next"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {appt.patientAge && `${appt.patientAge}y`}
          {appt.patientAge && appt.patientPhone && " · "}
          {appt.patientPhone}
        </p>
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={onComplete}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-[#007AFF] transition-colors"
              title="Open visit"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            {appt.patientPhone && (
              <button
                onClick={onReminder}
                className="p-2 rounded-full hover:bg-[#25D366]/10 text-muted-foreground hover:text-[#25D366] transition-colors relative"
                title="Send WhatsApp Message"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onReschedule}
              className={`p-2 rounded-full transition-colors ${isinstallmentVisit ? "hover:bg-[#AF52DE]/10 text-muted-foreground hover:text-[#AF52DE]" : "hover:bg-[#007AFF]/10 text-muted-foreground hover:text-[#007AFF]"}`}
              title={t("schedule.reschedule") || "Reschedule"}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            {!isinstallmentVisit && (
              <button
                onClick={onCancel}
                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title="Cancel appointment"
              >
                <XCircle className="w-5 h-5" />
              </button>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onReschedule} className={`gap-2 cursor-pointer font-medium ${isinstallmentVisit ? "text-[#AF52DE] focus:text-[#AF52DE] focus:bg-[#AF52DE]/10" : "text-[#007AFF] focus:text-[#007AFF] focus:bg-[#007AFF]/10"}`}>
                  <RefreshCw className="w-4 h-4" />
                  <span>{t("schedule.reschedule")}</span>
                </DropdownMenuItem>
                {!isinstallmentVisit && (
                  <DropdownMenuItem onClick={onCancel} className="gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10">
                    <XCircle className="w-4 h-4" />
                    <span>{t("common.cancel") || "Cancel"}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
});

export default function DashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang, dir } = useI18n();

  const todayTs = startOfDay(Date.now());

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const todayAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId ? { clerkId, dayStart: todayTs } : "skip"
  );

  const messageTemplates = useQuery(
    api.messageTemplates.listTemplates,
    clerkId ? { clerkId } : "skip"
  );

  const pastDueinstallments = useQuery(
    api.installments.listPastDueinstallments,
    clerkId ? { clerkId } : "skip"
  );



  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const cancelAppointment = useMutation(api.appointments.updateAppointment);

  const [cancelModal, setCancelModal] = useState<Id<"visits"> | null>(null);
  const [rescheduleModal, setRescheduleModal] = useState<{ visitId: Id<"visits">; patientName: string; isinstallment?: boolean } | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [rescheduleCalOpen, setRescheduleCalOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const rescheduleDateStart = useMemo(() => {
    if (!rescheduleDate) return undefined;
    return startOfDay(rescheduleDate.getTime());
  }, [rescheduleDate]);

  const rescheduleDateAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId && rescheduleDateStart ? { clerkId, dayStart: rescheduleDateStart } : "skip"
  );

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

  const handleCancelVisit = useCallback(async (appointmentId: Id<"visits">) => {
    try {
      await cancelAppointment({ clerkId, appointmentId, updates: { status: "cancelled" } });
      toast.success("Appointment cancelled");
    } catch { toast.error("Failed to cancel"); }
  }, [clerkId, cancelAppointment]);

  const handleReschedule = useCallback(async () => {
    if (!rescheduleModal || !rescheduleDate) return;
    setRescheduling(true);
    try {
      const [hh, mm] = rescheduleTime.split(":").map(Number);
      const d = new Date(rescheduleDate);
      d.setHours(hh, mm, 0, 0);
      await updateAppointment({ clerkId, appointmentId: rescheduleModal.visitId, updates: { date: d.getTime() } });
      toast.success("Visit rescheduled successfully");
      setRescheduleModal(null);
      setRescheduleDate(undefined);
    } catch { toast.error("Failed to reschedule"); }
    finally { setRescheduling(false); }
  }, [clerkId, rescheduleModal, rescheduleDate, rescheduleTime, updateAppointment]);

  // Working days from doctor profile for reschedule calendar
  const workingDayAbbrs: string[] = (currentUser as any)?.availableDays ?? [];
  const DOW_ABBR: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };
  function isNonWorkingDay(d: Date): boolean {
    if (workingDayAbbrs.length === 0) return false;
    const dayName = DOW_ABBR[d.getDay()];
    return !workingDayAbbrs.includes(dayName);
  }

  // Time slots for reschedule
  const rescheduleSlots = useMemo(() => {
    const startHour = currentUser?.workingHoursStart ?? 9;
    const endHour = currentUser?.workingHoursEnd ?? 17;
    const slotMin = currentUser?.slotDurationMinutes ?? 30;

    const takenTimeStrs = new Set(
      (rescheduleDateAppointments || [])
        .filter(a => a.status !== "cancelled" && a._id !== rescheduleModal?.visitId)
        .map(a => {
          const d = new Date(a.date);
          return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        })
    );

    const slots: { timeStr: string; label: string }[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMin) {
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
      toast.success("Visit marked complete");
      setCompletionModal(null);
    } catch {
      toast.error("Failed to complete visit");
    }
  }, [clerkId, completionModal, updateAppointment]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      await swapAppointments({ 
        clerkId, 
        appointmentId1: active.id as Id<"visits">, 
        appointmentId2: over.id as Id<"visits"> 
      });
      toast.success("Appointments swapped");
    } catch {
      toast.error("Failed to swap appointments");
    }
  }, [clerkId, swapAppointments]);

  function openTemplatePicker(patientName: string, patientPhone: string, appointmentDate: number, e: React.MouseEvent) {
    setTemplatePicker({ patientName, patientPhone, appointmentDate, anchorX: e.clientX, anchorY: e.clientY });
  }

  function sendWithTemplate(templateBody: string) {
    if (!templatePicker) return;
    const { patientName, patientPhone, appointmentDate } = templatePicker;
    const firstName = patientName.split(" ")[0];
    const now = new Date(appointmentDate);
    const message = templateBody
      .replace(/\{patient_name\}/g, patientName)
      .replace(/\{date\}/g, now.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, formatTime(appointmentDate, lang === "ar" ? "ar-EG" : "en-US"))
      .replace(/\{clinic_address\}/g, (currentUser as any)?.clinicAddressLink || "")
      .replace(/\{\{name\}\}/g, firstName);

    let num = patientPhone.replace(/[\s\-\(\)]/g, "");
    if (num.startsWith("+")) num = num.slice(1);
    if (num.startsWith("0")) num = "20" + num.slice(1);
    else if (!num.startsWith("20")) num = "20" + num;

    const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp for ${firstName}`);
    setTemplatePicker(null);
  }

  // Stats derived from today's appointments only (no heavy allAppointments subscription)
  const stats = useMemo(() => {
    if (!todayAppointments) return null;
    const todayCount =
      todayAppointments.filter((a) => a.status !== "cancelled").length;
    return { todayCount };
  }, [todayAppointments]);

  // Today's non-cancelled appointments sorted by time
  const todayVisits = useMemo(() => {
    if (!todayAppointments) return [];
    return [...todayAppointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => a.date - b.date);
  }, [todayAppointments]);

  const incompleteApptIds = useMemo(() => {
    return todayVisits.filter(a => a.status !== "completed").map(a => a._id);
  }, [todayVisits]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={t("dashboard.title")}
        description={`${t("dashboard.welcome")} ${currentUser?.name ?? "…"}`}
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">

      {/* Today's Schedule */}
      <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 border-b border-border/50 gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#007AFF]" />
              <h2 className="font-bold text-base">{t("dashboard.todaysVisits")}</h2>
            </div>
            <p className="text-xs text-muted-foreground block sm:hidden">
              {formatFullDate(todayTs, lang === "ar" ? "ar-EG" : "en-US")}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {formatFullDate(todayTs, lang === "ar" ? "ar-EG" : "en-US")}
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/clinic-screen`);
                toast.success(lang === "ar" ? "تم نسخ رابط شاشة العيادة" : "Clinic Screen link copied");
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-muted text-foreground px-3 py-1.5 rounded-xl hover:bg-muted/80 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              {t("dashboard.copyClinicLink")}
            </button>
            <Link
              href="/dashboard/queue"
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#007AFF] text-white px-3 py-1.5 rounded-xl hover:bg-[#0062cc] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {t("dashboard.addVisit")}
            </Link>
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {todayAppointments === undefined ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-full rounded-2xl bg-black/5 dark:bg-white/5"
              />
            ))
          ) : todayVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
                <CalendarDays className="w-7 h-7 text-[#007AFF]" />
              </div>
              <p className="text-sm font-semibold mb-1">{t("dashboard.noVisitsToday")}</p>
              <p className="text-xs text-muted-foreground mb-4">
                {t("dashboard.noVisitsDesc")}
              </p>
              <Link
                href="/dashboard/queue"
                className="text-xs font-semibold text-[#007AFF] hover:underline"
              >
                {t("dashboard.goToSchedule")}
              </Link>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={todayVisits.map((a) => a._id)}
                strategy={verticalListSortingStrategy}
              >
                {todayVisits.map((appt) => {
                  const isCurrent = incompleteApptIds[0] === appt._id;
                  const isNext = incompleteApptIds[1] === appt._id;
                  const apptTag = isCurrent ? "current" : isNext ? "next" : undefined;

                  return (
                    <SortableApptItem
                      key={appt._id}
                      appt={appt}
                      tag={apptTag}
                      onComplete={() => setCompletionModal({ appointmentId: appt._id, patientId: appt.patientId ?? undefined, patientName: appt.patientName, patientAge: appt.patientAge, installmentId: appt.installmentId ?? undefined, tag: apptTag })}
                      onReminder={(e: React.MouseEvent) => openTemplatePicker(appt.patientName, appt.patientPhone, appt.date, e)}
                      onCancel={() => setCancelModal(appt._id)}
                      onReschedule={() => setRescheduleModal({ visitId: appt._id, patientName: appt.patientName, isinstallment: appt.source === "installment" })}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Past Due Patients */}
      {pastDueinstallments !== undefined && pastDueinstallments.length > 0 && (
        <div className="bg-white dark:bg-[#1c1c1a] border border-amber-500/30 rounded-2xl shadow-sm overflow-hidden mt-6">
          <div className="px-4 sm:px-6 py-4 border-b border-border/50 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-base">{t("dashboard.pastDuePatients") || "Past Due Patients"}</h2>
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {pastDueinstallments.map((installment) => (
              <div key={installment._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/40 shadow-sm">
                <div>
                  <Link href={`/dashboard/patients/${installment.patientId}?tab=installments`} className="font-semibold text-sm hover:text-[#007AFF] transition-colors">
                    {installment.patientName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("dashboard.outstandingBalance") || "Outstanding Balance"}: <span className="font-bold text-amber-600 dark:text-amber-500">{installment.unpaidBalance} {t("common.currency")}</span>
                  </p>
                </div>
                <Link
                  href={`/dashboard/patients/${installment.patientId}?tab=installments`}
                  className="shrink-0 inline-flex items-center justify-center text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl transition-colors"
                >
                  {t("dashboard.resolve") || "Resolve"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      </div>
      </div>

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
                  handleCancelVisit(cancelModal);
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
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${rescheduleModal.isinstallment ? "bg-[#AF52DE]/10" : "bg-[#007AFF]/10"}`}>
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
                  <p className="text-xs text-muted-foreground mt-3 bg-[#AF52DE]/5 border border-[#AF52DE]/20 rounded-xl px-3 py-2">
                    {t("schedule.installmentNoCancel")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl px-3 py-2">
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
                        <button className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm bg-background border rounded-2xl transition-colors text-left ${rescheduleModal.isinstallment ? "hover:border-[#AF52DE]/50" : "hover:border-[#007AFF]/50"} ${!rescheduleDate ? "border-red-400/60" : "border-border"}`}>
                          <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className={rescheduleDate ? "" : "text-muted-foreground"}>
                            {rescheduleDate ? rescheduleDate.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }) : (t("visit.pickDate") || "Pick date")}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={rescheduleDate} onSelect={(d) => { if (d) { setRescheduleDate(d); setRescheduleCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay(d)} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("installments.timeSlot")}</p>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-2xl divide-y divide-border/50">
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
                    className="flex-1 border border-border text-sm font-medium py-2.5 rounded-2xl hover:bg-muted/40 transition-colors"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleReschedule}
                    disabled={!rescheduleDate || rescheduling}
                    className={`flex-1 text-white text-sm font-semibold py-2.5 rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${rescheduleModal.isinstallment ? "bg-[#AF52DE] hover:bg-[#9B3DC8]" : "bg-[#007AFF] hover:bg-[#005bb5]"}`}
                  >
                    {rescheduling ? <IOSSpinner size={16} className="text-white" /> : <RefreshCw className="w-4 h-4" />}
                    {t("schedule.reschedule")}
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
                  <p className="text-sm font-semibold">{t("templates.sendTo")} {templatePicker.patientName.split(" ")[0]}</p>
                  <button onClick={() => setTemplatePicker(null)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("templates.chooseTemplate")}</p>
              </div>
              <div className="px-3 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
                {/* Saved templates */}
                {(messageTemplates ?? []).map((tpl) => (
                  <button
                    key={tpl._id}
                    onClick={() => sendWithTemplate(tpl.body)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
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
                  <div className="px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{t("templates.createInSettings")}</p>
                  </div>
                )}
              </div>

              {/* Subtle separator + settings link */}
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
