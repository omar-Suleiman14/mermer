"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { AddToQueueDrawer } from "@/components/add-to-queue-drawer";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  XCircle,
  MessageCircle,
  GripVertical,
  X,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useI18n, type Lang } from "@/lib/i18n";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateLocale(lang: Lang) {
  return lang === "ar" ? "ar-EG" : "en-US";
}

function formatTime(ts: number, lang: Lang) {
  return new Date(ts).toLocaleTimeString(dateLocale(lang), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullDate(ts: number, lang: Lang) {
  return new Date(ts).toLocaleDateString(dateLocale(lang), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns N day timestamps starting from anchorDay */
function getWeekDays(anchorDay: number, count = 7): number[] {
  return Array.from({ length: count }, (_, i) => anchorDay + i * 86400000);
}

/** Map JS getDay() (0=Sun…6=Sat) to our day abbreviations */
const DOW_MAP: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

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

function DraggableApptItem({
  appt,
  ts,
  isSelectedDayPast,
  isDone,
  initials,
  onComplete,
  onReminder,
  onCancel,
}: {
  appt: any;
  ts: number;
  isSelectedDayPast: boolean;
  isDone: boolean;
  initials: string;
  onComplete: () => void;
  onReminder: (e: React.MouseEvent) => void;
  onCancel: () => void;
}) {
  const { t, dir, lang } = useI18n();
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
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
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
          className="flex-shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <span className="text-xs font-bold w-14 flex-shrink-0 text-start">{formatTime(ts, lang)}</span>

      <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
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
            <span className="font-semibold text-sm">{appt.patientName}</span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "contract" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("schedule.contract")}
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
        </div>
        {appt.patientPhone && (
          <p className="text-xs text-muted-foreground mt-0.5">{appt.patientPhone}</p>
        )}
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 flex-shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 max-[500px]:hidden">
            {!isSelectedDayPast ? (
              <>
                <button
                  onClick={onComplete}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#34c759] border border-[#34c759]/30 px-2 py-1 rounded-lg hover:bg-[#34c759]/10 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("dashboard.done")}
                </button>
                <button
                  onClick={onReminder}
                  title={t("schedule.reminderWhatsAppTitle")}
                  className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onCancel}
                  title={t("schedule.cancelTitle")}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                {t("schedule.missed")}
              </Badge>
            )}
          </div>
          <div className="hidden max-[500px]:block">
            <DropdownMenu dir={dir}>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isSelectedDayPast ? (
                  <>
                    <DropdownMenuItem onClick={onComplete} className="gap-2 cursor-pointer font-medium text-[#34c759] focus:text-[#34c759]">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t("dashboard.done")}</span>
                    </DropdownMenuItem>
                    {appt.patientPhone && (
                      <DropdownMenuItem onClick={onReminder} className="gap-2 cursor-pointer font-medium text-[#25D366] focus:text-[#25D366]">
                        <MessageCircle className="w-4 h-4" />
                        <span>{t("schedule.sendReminder") || "Send Reminder"}</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onCancel} className="gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10">
                      <XCircle className="w-4 h-4" />
                      <span>{t("common.cancel") || "Cancel"}</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled className="gap-2 font-medium text-amber-600">
                    <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                      {t("schedule.missed")}
                    </Badge>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, dir, lang } = useI18n();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const messageTemplates = useQuery(
    api.messageTemplates.listTemplates,
    clerkId ? { clerkId } : "skip"
  );

  const todayTs = startOfDay(Date.now());

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
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(todayTs);

  const [addOpen, setAddOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<number | null>(null);

  const [completionModal, setCompletionModal] = useState<{
    appointmentId: Id<"visits">;
    patientId?: Id<"patients">;
    patientName: string;
    patientAge?: number;
    contractId?: Id<"contracts">;
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

  // Map slot timestamp → appointment
  type ApptItem = NonNullable<typeof rawAppointments>[number];
  const appointmentsBySlot = useMemo(() => {
    const map = new Map<number, ApptItem>();
    if (!rawAppointments) return map;
    rawAppointments.forEach((appt) => {
      if (appt.status !== "cancelled") map.set(appt.date, appt);
    });
    return map;
  }, [rawAppointments]);

  const cancelledToday = useMemo(
    () => (rawAppointments ?? []).filter((a) => a.status === "cancelled"),
    [rawAppointments]
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleCompleteVisit(
    prescriptionImageId?: Id<"_storage">,
    notes?: string
  ) {
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
  }

  async function handleCancel(appointmentId: Id<"visits">) {
    try {
      await updateAppointment({
        clerkId,
        appointmentId,
        updates: { status: "cancelled" },
      });
      toast.success(t("toast.appointmentCancelled"));
    } catch {
      toast.error(t("toast.cancelAppointmentFailed"));
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveAppt(event.active.data.current?.appt ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveAppt(null);
    const { active, over } = event;
    if (!over) return;

    const targetTs = over.id as number;
    const targetAppt = appointmentsBySlot.get(targetTs);
    const draggedApptId = active.id as Id<"visits">;

    try {
      if (targetAppt) {
        if (targetAppt._id !== draggedApptId) {
          await swapAppointments({ clerkId, appointmentId1: draggedApptId, appointmentId2: targetAppt._id });
          toast.success(t("toast.appointmentsSwapped"));
        }
      } else {
        await updateAppointment({ clerkId, appointmentId: draggedApptId, updates: { date: targetTs } });
        toast.success(t("toast.appointmentMoved"));
      }
    } catch {
      toast.error(t("toast.scheduleReorderFailed"));
    }
  };

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
      .replace(/\{date\}/g, now.toLocaleDateString(dateLocale(lang), { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, formatTime(appointmentDate, lang))
      .replace(/\{clinic_address\}/g, (currentUser as any)?.clinicAddressLink || "")
      .replace(/\{\{name\}\}/g, firstName);

    let num = patientPhone.replace(/[\s\-\(\)]/g, "");
    if (num.startsWith("+")) num = num.slice(1);
    if (num.startsWith("0")) num = "20" + num.slice(1);
    else if (!num.startsWith("20")) num = "20" + num;

    const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success(t("toast.openingWhatsapp").replace("{name}", firstName));
    setTemplatePicker(null);
  }

  function sendQuickReminder() {
    if (!templatePicker) return;
    const { patientName, appointmentDate } = templatePicker;
    const firstName = patientName.split(" ")[0];
    const defaultMsg = t("schedule.quickReminderDefault")
      .replace("{name}", firstName)
      .replace("{time}", formatTime(appointmentDate, lang));
    sendWithTemplate(currentUser?.whatsappTemplate || defaultMsg);
  }

  const isSelectedDayPast = selectedDay < todayTs;
  const isSelectedDayToday = selectedDay === todayTs;

  // Working days from doctor profile
  const workingDays: string[] = (currentUser as any)?.availableDays ?? [];
  const hasWorkingDays = workingDays.length > 0;

  /** Is the currently selected day a working day? (true if no days configured) */
  const isWorkingDay =
    !hasWorkingDays || workingDays.includes(DOW_MAP[new Date(selectedDay).getDay()]);

  /** Filter week strip to only working days (if configured) */
  const visibleWeekDays = hasWorkingDays
    ? weekDays.filter((ts) => workingDays.includes(DOW_MAP[new Date(ts).getDay()]))
    : weekDays;

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
            <div className="px-5 pt-5 pb-4 border-b border-border/50" ref={stripContainerRef}>
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
                        className={`flex-shrink-0 flex flex-col items-center py-2 px-2.5 rounded-xl text-xs transition-all min-w-[44px] ${
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

              <div className="flex items-center justify-between mt-3">
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
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl bg-black/5 dark:bg-white/5" />
                ))
              ) : !isWorkingDay ? (
                <div className="text-center py-14">
                  <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">{t("schedule.clinicClosed")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{t("schedule.notWorkingDay")}</p>
                  <button
                    onClick={() => { setWeekOffset(0); setSelectedDay(todayTs); }}
                    className="text-[#007AFF] hover:underline text-xs mt-3 inline-block font-semibold"
                  >
                    {t("schedule.today")}
                  </button>
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
                  {daySlots.map((ts) => {
                    const appt = appointmentsBySlot.get(ts);

                    if (!appt) {
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

                    const isDone = appt.status === "completed";
                    const initials = (appt.patientName ?? "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <DroppableSlot key={ts} id={ts}>
                        <DraggableApptItem
                          appt={appt}
                          ts={ts}
                          isSelectedDayPast={isSelectedDayPast}
                          isDone={isDone}
                          initials={initials}
                          onComplete={() => setCompletionModal({ appointmentId: appt._id, patientId: appt.patientId ?? undefined, patientName: appt.patientName, patientAge: appt.patientAge, contractId: appt.contractId ?? undefined })}
                          onReminder={(e: React.MouseEvent) => appt.patientPhone && openTemplatePicker(appt.patientName, appt.patientPhone, appt.date, e)}
                          onCancel={() => handleCancel(appt._id)}
                        />
                      </DroppableSlot>
                    );
                  })}

                  {typeof document !== "undefined" && (
                    <DragOverlay>
                      {activeAppt ? (
                        <div className="opacity-90 shadow-2xl scale-[1.02] bg-[var(--background)] border border-[#007AFF]/40 rounded-xl overflow-hidden">
                          <DraggableApptItem
                            appt={activeAppt}
                            ts={activeAppt.date}
                            isSelectedDayPast={isSelectedDayPast}
                            isDone={activeAppt.status === "completed"}
                            initials={(activeAppt.patientName ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                            onComplete={() => {}}
                            onReminder={(e) => {}}
                            onCancel={() => {}}
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

      <VisitCompletionModal
        open={!!completionModal}
        onOpenChange={(v) => !v && setCompletionModal(null)}
        clerkId={clerkId}
        visitId={completionModal?.appointmentId as any}
        patientId={completionModal?.patientId}
        patientName={completionModal?.patientName ?? ""}
        patientAge={completionModal?.patientAge}
        contractId={completionModal?.contractId}
        onComplete={() => {
          if (completionModal && !completionModal.contractId) {
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
              className="relative z-10 w-full sm:max-w-sm bg-[var(--background)] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
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
                <button
                  onClick={sendQuickReminder}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#25D366]/8 transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t("templates.quickReminder")}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t("templates.defaultReminder")}</p>
                  </div>
                </button>

                {(messageTemplates ?? []).map((tpl) => (
                  <button
                    key={tpl._id}
                    onClick={() => sendWithTemplate(tpl.body)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#007AFF]/8 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
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
