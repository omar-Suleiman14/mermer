"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { VisitCompletionModal } from "@/components/visit-completion-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Users,
  TrendingUp,
  Globe,
  UserCheck,
  Activity,
  PlusCircle,
  MessageCircle,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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

function SortableApptItem({ appt, onComplete, onReminder }: { appt: any, onComplete: () => void, onReminder: () => void }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        !isDone ? "hover:shadow-md" : ""
      } ${
        isDragging ? "opacity-90 shadow-2xl scale-[1.02] bg-[var(--background)] border-[#007AFF]/40" : 
        isDone ? "opacity-55 bg-muted/20 border-border/40" : "bg-card border-black/5 dark:border-white/5 shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      {!isDone && (
        <div 
          {...attributes} 
          {...listeners} 
          className="flex-shrink-0 -ml-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Time */}
      <div className="flex flex-col items-center w-14 flex-shrink-0">
        <Clock className="w-3 h-3 text-muted-foreground mb-0.5" />
        <span className="text-xs font-bold text-[#1a1916] dark:text-[#f0efea]">
          {formatTime(appt.date)}
        </span>
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-[#007AFF]">
          {initials}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {appt.patientId ? (
            <Link
              href={`/dashboard/patients/${appt.patientId}`}
              className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
            >
              {appt.patientName}
            </Link>
          ) : (
            <span className="font-semibold text-sm">
              {appt.patientName}
            </span>
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
        <p className="text-xs text-muted-foreground mt-0.5">
          {appt.patientAge && `${appt.patientAge}y`}
          {appt.patientAge && appt.patientPhone && " · "}
          {appt.patientPhone}
        </p>
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 flex-shrink-0">
          Done
        </Badge>
      ) : (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onComplete}
            className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-[#007AFF] transition-colors"
            title="Complete visit"
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          {appt.patientPhone && (
            <button
              onClick={onReminder}
              className="p-2 rounded-full hover:bg-[#25D366]/10 text-muted-foreground hover:text-[#25D366] transition-colors"
              title="Send WhatsApp Reminder"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const todayTs = startOfDay(Date.now());

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const todayAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId ? { clerkId, dayStart: todayTs } : "skip"
  );

  const allAppointments = useQuery(
    api.appointments.listAppointments,
    clerkId ? { clerkId } : "skip"
  );

  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [completionModal, setCompletionModal] = useState<{
    appointmentId: Id<"appointments">;
    patientName: string;
    patientAge?: number;
  } | null>(null);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      await swapAppointments({ 
        clerkId, 
        appointmentId1: active.id as Id<"appointments">, 
        appointmentId2: over.id as Id<"appointments"> 
      });
      toast.success("Appointments swapped");
    } catch {
      toast.error("Failed to swap appointments");
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

  // Stats derived from all appointments
  const stats = useMemo(() => {
    if (!allAppointments) return null;
    const total = allAppointments.length;
    const completed = allAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const online = allAppointments.filter((a) => a.source === "online").length;
    const todayCount =
      todayAppointments?.filter((a) => a.status !== "cancelled").length ?? 0;
    return { total, completed, online, todayCount };
  }, [allAppointments, todayAppointments]);

  // Today's non-cancelled appointments sorted by time
  const todayVisits = useMemo(() => {
    if (!todayAppointments) return [];
    return [...todayAppointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => a.date - b.date);
  }, [todayAppointments]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, Dr. ${currentUser?.name ?? "…"}`}
      />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
      {/* Today's Schedule */}
      <div className="bg-white dark:bg-[#1c1c1a] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#007AFF]" />
            <h2 className="font-bold text-base">Today's Visits</h2>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {formatFullDate(todayTs)}
            </p>
            <Link
              href="/dashboard/queue"
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Visit
            </Link>
          </div>
        </div>

        <div className="p-4 space-y-2.5">
          {todayAppointments === undefined ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-full rounded-xl bg-black/5 dark:bg-white/5"
              />
            ))
          ) : todayVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mb-4">
                <CalendarDays className="w-7 h-7 text-[#007AFF]" />
              </div>
              <p className="text-sm font-semibold mb-1">No visits today</p>
              <p className="text-xs text-muted-foreground mb-4">
                Add patients to your schedule to see them here.
              </p>
              <Link
                href="/dashboard/queue"
                className="text-xs font-semibold text-[#007AFF] hover:underline"
              >
                Go to Schedule
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
                {todayVisits.map((appt) => (
                  <SortableApptItem
                    key={appt._id}
                    appt={appt}
                    onComplete={() => setCompletionModal({ appointmentId: appt._id, patientName: appt.patientName, patientAge: appt.patientAge })}
                    onReminder={() => sendReminder(appt.patientName, appt.patientPhone, appt.date)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      </div>
      </div>

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
