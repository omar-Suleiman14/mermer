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
  Activity,
  PlusCircle,
  MessageCircle,
  GripVertical,
  XCircle,
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
import { useI18n } from "@/lib/i18n";
import { useMemo, useState, useRef, useEffect } from "react";
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

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
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

function SortableApptItem({ appt, onComplete, onReminder, onCancel }: { appt: any, onComplete: () => void, onReminder: (e: React.MouseEvent) => void, onCancel: () => void }) {
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
          className="flex-shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
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
            <span className="font-semibold text-sm">
              {appt.patientName}
            </span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "contract" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.contract")}
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
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {appt.patientAge && `${appt.patientAge}y`}
          {appt.patientAge && appt.patientPhone && " · "}
          {appt.patientPhone}
        </p>
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 flex-shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 max-[500px]:hidden">
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
                className="p-2 rounded-full hover:bg-[#25D366]/10 text-muted-foreground hover:text-[#25D366] transition-colors relative"
                title="Send WhatsApp Message"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
              title="Cancel appointment"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden max-[500px]:block">
            <DropdownMenu dir={dir}>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
}

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



  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const cancelAppointment = useMutation(api.appointments.updateAppointment);

  const [cancelModal, setCancelModal] = useState<Id<"visits"> | null>(null);

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

  async function handleCancelVisit(appointmentId: Id<"visits">) {
    try {
      await cancelAppointment({ clerkId, appointmentId, updates: { status: "cancelled" } });
      toast.success("Appointment cancelled");
    } catch { toast.error("Failed to cancel"); }
  }

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
        appointmentId1: active.id as Id<"visits">, 
        appointmentId2: over.id as Id<"visits"> 
      });
      toast.success("Appointments swapped");
    } catch {
      toast.error("Failed to swap appointments");
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
      .replace(/\{date\}/g, now.toLocaleDateString("en-US", { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, formatTime(appointmentDate))
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

  function sendQuickReminder() {
    if (!templatePicker) return;
    const { patientName, appointmentDate } = templatePicker;
    const firstName = patientName.split(" ")[0];
    const defaultMsg = `مرحباً ${firstName}، هذا تذكير بأن موعدك اليوم الساعة ${formatTime(appointmentDate)}. نراك قريباً.`;
    sendWithTemplate(currentUser?.whatsappTemplate || defaultMsg);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#007AFF]" />
            <h2 className="font-bold text-base">{t("dashboard.todaysVisits")}</h2>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {formatFullDate(todayTs, lang === "ar" ? "ar-EG" : "en-US")}
            </p>

            <Link
              href="/dashboard/queue"
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
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
                className="h-16 w-full rounded-xl bg-black/5 dark:bg-white/5"
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
                {todayVisits.map((appt) => (
                  <SortableApptItem
                    key={appt._id}
                    appt={appt}
                    onComplete={() => setCompletionModal({ appointmentId: appt._id, patientId: appt.patientId ?? undefined, patientName: appt.patientName, patientAge: appt.patientAge, contractId: appt.contractId ?? undefined })}
                    onReminder={(e: React.MouseEvent) => openTemplatePicker(appt.patientName, appt.patientPhone, appt.date, e)}
                    onCancel={() => setCancelModal(appt._id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

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
                  <p className="text-sm font-semibold">{t("templates.sendTo")} {templatePicker.patientName.split(" ")[0]}</p>
                  <button onClick={() => setTemplatePicker(null)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">{t("templates.chooseTemplate")}</p>
              </div>
              <div className="px-3 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
                {/* Quick reminder (default) */}
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

                {/* Saved templates */}
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
