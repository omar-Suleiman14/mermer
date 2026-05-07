"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import Link from "next/link";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatFullDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Returns 7 day timestamps starting from anchorDay */
function getWeekDays(anchorDay: number): number[] {
  return Array.from({ length: 7 }, (_, i) => anchorDay + i * 86400000);
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
  onReminder: () => void;
  onCancel: () => void;
}) {
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
          className="flex-shrink-0 -ml-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <span className="text-xs font-bold w-14 flex-shrink-0">{formatTime(ts)}</span>

      <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#007AFF]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
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
              Online
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
              Manual
            </span>
          )}
        </div>
        {appt.patientPhone && (
          <p className="text-xs text-muted-foreground mt-0.5">{appt.patientPhone}</p>
        )}
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 flex-shrink-0">
          Done
        </Badge>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isSelectedDayPast ? (
            <>
              <button
                onClick={onComplete}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#34c759] border border-[#34c759]/30 px-2 py-1 rounded-lg hover:bg-[#34c759]/10 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Done
              </button>
              <button
                onClick={onReminder}
                title="Send WhatsApp reminder"
                className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onCancel}
                title="Cancel"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
              Missed
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const todayTs = startOfDay(Date.now());

  // Single week offset: 0 = this week, -7 = last week, +7 = next week, etc.
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(todayTs);

  const [addOpen, setAddOpen] = useState(false);
  const [preselectedSlot, setPreselectedSlot] = useState<number | null>(null);

  const [completionModal, setCompletionModal] = useState<{
    appointmentId: Id<"appointments">;
    patientName: string;
    patientAge?: number;
  } | null>(null);

  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const [activeAppt, setActiveAppt] = useState<any | null>(null);

  // Week strip
  const weekAnchor = todayTs + weekOffset * 86400000;
  const weekDays = getWeekDays(weekAnchor);

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
      toast.success("Visit marked complete");
      setCompletionModal(null);
    } catch {
      toast.error("Failed to complete visit");
    }
  }

  async function handleCancel(appointmentId: Id<"appointments">) {
    try {
      await updateAppointment({
        clerkId,
        appointmentId,
        updates: { status: "cancelled" },
      });
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel");
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
    const draggedApptId = active.id as Id<"appointments">;

    try {
      if (targetAppt) {
        if (targetAppt._id !== draggedApptId) {
          await swapAppointments({ clerkId, appointmentId1: draggedApptId, appointmentId2: targetAppt._id });
          toast.success("Appointments swapped");
        }
      } else {
        await updateAppointment({ clerkId, appointmentId: draggedApptId, updates: { date: targetTs } });
        toast.success("Appointment moved");
      }
    } catch {
      toast.error("Failed to reorder schedule");
    }
  };

  function sendReminder(patientName: string, patientPhone: string, appointmentDate: number) {
    const firstName = patientName.split(" ")[0];
    const defaultMsg = `Hello ${firstName}, this is a reminder that your appointment is at ${formatTime(appointmentDate)} today. See you soon! 🏥`;
    const template = currentUser?.whatsappTemplate || defaultMsg;
    const message = template.replace("{{name}}", firstName);

    // Normalise to international format (Egyptian numbers: 01x → 201x)
    let num = patientPhone.replace(/[\s\-\(\)]/g, "");
    if (num.startsWith("+")) num = num.slice(1);
    if (num.startsWith("0")) num = "20" + num.slice(1);
    else if (!num.startsWith("20")) num = "20" + num;

    const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success(`Opening WhatsApp for ${firstName}`);
  }

  const isSelectedDayPast = selectedDay < todayTs;
  const isSelectedDayToday = selectedDay === todayTs;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Schedule"
        description="All appointments — past and future."
      >
        {!isSelectedDayPast && (
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors shadow-sm text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Add Patient</span>
          </button>
        )}
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Calendar card */}
          <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">

            {/* Week strip */}
            <div className="px-5 pt-5 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                {/* Back week */}
                <button
                  onClick={() => {
                    const newOffset = weekOffset - 7;
                    setWeekOffset(newOffset);
                    // Select first day of the new week
                    setSelectedDay(todayTs + newOffset * 86400000);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Day buttons */}
                <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                  {weekDays.map((dayTs) => {
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
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
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
                    const newOffset = weekOffset + 7;
                    setWeekOffset(newOffset);
                    setSelectedDay(todayTs + newOffset * 86400000);
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day label row */}
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="font-bold text-sm">
                    {isSelectedDayToday ? "Today — " : ""}{formatFullDate(selectedDay)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isSelectedDayToday && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                  {isSelectedDayPast && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                      Past
                    </span>
                  )}
                  {/* Jump to today */}
                  {!isSelectedDayToday && (
                    <button
                      onClick={() => { setWeekOffset(0); setSelectedDay(todayTs); }}
                      className="text-[11px] font-semibold text-[#007AFF] hover:underline"
                    >
                      Today
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
              ) : daySlots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No working hours configured.</p>
                  <Link
                    href="/dashboard/settings"
                    className="text-[#007AFF] hover:underline text-xs mt-1 inline-block"
                  >
                    Update Settings →
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
                            <span className="text-xs font-bold w-14 text-muted-foreground/60">{formatTime(ts)}</span>
                            <span className="text-xs text-muted-foreground/40 italic flex-1">Available</span>
                            {!isSelectedDayPast && (
                              <button
                                onClick={() => { setPreselectedSlot(ts); setAddOpen(true); }}
                                className="text-xs font-semibold text-[#007AFF] hover:underline px-2 py-1"
                              >
                                + Add
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
                          onComplete={() => setCompletionModal({ appointmentId: appt._id, patientName: appt.patientName, patientAge: appt.patientAge })}
                          onReminder={() => appt.patientPhone && sendReminder(appt.patientName, appt.patientPhone, appt.date)}
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
                            onReminder={() => {}}
                            onCancel={() => {}}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  )}

                  {cancelledToday.length > 0 && (
                    <div className="pt-3 mt-2 border-t border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Cancelled
                      </p>
                      {cancelledToday.map((appt) => (
                        <div key={appt._id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg opacity-40">
                          <span className="text-xs font-bold w-14 text-muted-foreground">{formatTime(appt.date)}</span>
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
        appointmentId={completionModal?.appointmentId as Id<"appointments">}
        patientName={completionModal?.patientName ?? ""}
        patientAge={completionModal?.patientAge}
        onComplete={handleCompleteVisit}
      />
    </div>
  );
}
