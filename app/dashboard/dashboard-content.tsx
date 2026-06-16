"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import dynamic from "next/dynamic";
const VisitCompletionModal = dynamic(() => import("@/components/visit-completion-modal").then(m => m.VisitCompletionModal));
import { TodayAnalytics } from "@/components/dashboard/today-analytics";
import { PastDueAlerts } from "@/components/dashboard/past-due-alerts";
import { SortableApptItem } from "@/components/dashboard/sortable-appt-item";
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
  BarChart3,
  TvMinimal,
  TrendingUp,
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
import { startOfDay, formatTime, formatFullDate, isNonWorkingDay, useWhatsAppTemplate, openWhatsApp } from "@/lib/scheduling";



export default function DashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang, dir } = useI18n();

  const todayTs = startOfDay(Date.now());

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  // Permission checks — empty permissions = no explicit restrictions = full access
  const isAssistant = currentUser?.role === "assistant";
  const userPerms: string[] = currentUser?.permissions ?? [];
  const hasExplicitPerms = userPerms.length > 0;
  const canReschedule = !isAssistant || !hasExplicitPerms || userPerms.includes("appointments.reschedule");
  const canCancel = !isAssistant || !hasExplicitPerms || userPerms.includes("appointments.cancel");

  const todayAppointments = useQuery(
    api.appointments.getAppointmentsByDate,
    clerkId ? { clerkId, dayStart: todayTs } : "skip"
  );

  const todayVisits = useMemo(() => {
    if (!todayAppointments) return [];
    return [...todayAppointments]
      .filter((a) => a.status !== "cancelled")
      .sort((a, b) => a.date - b.date);
  }, [todayAppointments]);

  const { currentApptId, nextApptId } = useMemo(() => {
    if (!currentUser || !todayVisits) return { currentApptId: null, nextApptId: null };
    
    const now = Date.now();
    const slotDurationMs = ((currentUser as any).slotDurationMinutes || 30) * 60000;
    
    const incomplete = todayVisits.filter(a => a.status !== "completed");
    const current = incomplete.find(a => a.date <= now && a.date + slotDurationMs > now);
    const next = incomplete.find(a => a.date > now);

    return {
      currentApptId: current?._id || null,
      nextApptId: next?._id || null,
    };
  }, [todayVisits, currentUser]);

  const messageTemplates = useQuery(
    api.messageTemplates.listTemplates,
    clerkId ? { clerkId } : "skip"
  );



  const updateAppointment = useMutation(api.appointments.updateAppointment);
  const swapAppointments = useMutation(api.appointments.swapAppointments);
  const cancelDayAutomations = useAction(api.whatsappAutomations.cancelDayAction);
  const [cancellingDay, setCancellingDay] = useState(false);
  const [cancelDayModalOpen, setCancelDayModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const cancelAppointment = updateAppointment;

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
      toast.success(lang === "ar" ? "تم إلغاء الموعد بنجاح" : "Appointment cancelled successfully");
    } catch { toast.error(lang === "ar" ? "تعذّر إلغاء الموعد" : "Failed to cancel appointment"); }
  }, [clerkId, cancelAppointment, lang]);

  const handleConfirmVisit = useCallback(async (appointmentId: Id<"visits">) => {
    try {
      await updateAppointment({ clerkId, appointmentId, updates: { status: "confirmed" } });
      toast.success(lang === "ar" ? "تم تأكيد الموعد بنجاح" : "Appointment confirmed successfully");
    } catch { toast.error(lang === "ar" ? "تعذّر تأكيد الموعد" : "Failed to confirm appointment"); }
  }, [clerkId, updateAppointment, lang]);

  const handleCancelDay = useCallback(async () => {
    if (!currentUser?._id) return;
    
    // Check if there are any installment visits today
    const hasInstallments = (todayAppointments || []).some(v => v.status !== "cancelled" && v.source === "installment" && (v.status === "confirmed" || v.status === "pending"));
    if (hasInstallments) {
      toast.error(lang === "ar" ? "يجب إعادة جدولة زيارات التقسيط أولاً قبل إلغاء اليوم" : "You must reschedule installment visits before cancelling the day");
      setCancelDayModalOpen(false);
      return;
    }
    
    setCancellingDay(true);
    try {
      const res = await cancelDayAutomations({ clinicId: currentUser._id, dateMs: todayTs });
      toast.success(lang === "ar" ? `تم إلغاء ${res.cancelledCount} موعد بنجاح` : `Cancelled ${res.cancelledCount} appointments successfully`);
      if (res.warning) {
        toast.warning(
          lang === "ar" 
            ? "واتساب غير متصل. تم إلغاء المواعيد ولكن يرجى التواصل مع المرضى يدوياً" 
            : "WhatsApp disconnected. Appointments cancelled but please contact patients manually.",
          { duration: 10000 }
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel day");
    } finally {
      setCancellingDay(false);
      setCancelDayModalOpen(false);
    }
  }, [currentUser?._id, todayTs, todayAppointments, cancelDayAutomations, lang]);

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
  }, [clerkId, rescheduleModal, rescheduleDate, rescheduleTime, updateAppointment, lang]);

  // Working days from doctor profile for reschedule calendar
  const workingDayAbbrs: string[] = (currentUser as any)?.availableDays ?? [];

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
      toast.success(lang === "ar" ? "تمت الزيارة بنجاح" : "Visit completed successfully");
      setCompletionModal(null);
    } catch {
      toast.error(lang === "ar" ? "تعذّر إتمام الزيارة" : "Failed to complete visit");
    }
  }, [clerkId, completionModal, updateAppointment, lang]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    try {
      await swapAppointments({ 
        clerkId, 
        appointmentId1: active.id as Id<"visits">, 
        appointmentId2: over.id as Id<"visits"> 
      });
      toast.success(lang === "ar" ? "تم تبديل المواعيد بنجاح" : "Appointments swapped");
    } catch {
      toast.error(lang === "ar" ? "تعذّر تبديل المواعيد" : "Failed to swap appointments");
    }
  }, [clerkId, swapAppointments, lang]);

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

  // Stats derived from today's appointments only (no heavy allAppointments subscription)
  const stats = useMemo(() => {
    if (!todayAppointments) return null;
    const todayCount =
      todayAppointments.filter((a) => a.status !== "cancelled").length;
    return { todayCount };
  }, [todayAppointments]);

  // Today's non-cancelled appointments sorted by time

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
              {formatFullDate(todayTs, lang)}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <p className="text-xs text-muted-foreground hidden sm:block">
              {formatFullDate(todayTs, lang)}
            </p>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/clinic-screen`);
                toast.success(lang === "ar" ? "تم نسخ رابط شاشة العيادة" : "Clinic Screen link copied");
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-muted text-foreground px-3 py-1.5 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <TvMinimal className="w-3.5 h-3.5" />
              {t("dashboard.copyClinicLink")}
            </button>
            {canCancel && (
              <button
                onClick={() => setCancelDayModalOpen(true)}
                disabled={cancellingDay || todayVisits.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancellingDay ? <IOSSpinner size={14} className="text-red-600" /> : <XCircle className="w-3.5 h-3.5" />}
                {lang === "ar" ? "إلغاء اليوم" : "Cancel Day"}
              </button>
            )}
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
            <div className="flex items-center justify-center py-10">
              <IOSSpinner size={24} className="text-[#007AFF]" />
            </div>
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
                  const isCurrent = currentApptId === appt._id;
                  const isNext = nextApptId === appt._id;
                  const apptTag = isCurrent ? "current" : isNext ? "next" : undefined;

                  return (
                    <SortableApptItem
                      key={appt._id}
                      appt={appt}
                      tag={apptTag}
                      canReschedule={canReschedule}
                      canCancel={canCancel}
                      onComplete={() => setCompletionModal({ appointmentId: appt._id, patientId: appt.patientId ?? undefined, patientName: appt.patientName, patientAge: appt.patientAge, installmentId: appt.installmentId ?? undefined, tag: apptTag })}
                      onConfirm={() => handleConfirmVisit(appt._id)}
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
      <PastDueAlerts />

      {/* Today's Analytics */}
      <TodayAnalytics todayAppointments={todayAppointments} />

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

      <AlertDialog open={cancelDayModalOpen} onOpenChange={setCancelDayModalOpen}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">
              {lang === "ar" ? "إلغاء جميع المواعيد" : "Cancel All Appointments"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "ar" 
                ? "هل أنت متأكد من إلغاء جميع مواعيد اليوم؟ سيتم إرسال رسائل واتساب للمرضى للاعتذار وإلغاء مواعيدهم."
                : "Are you sure you want to cancel all appointments today? WhatsApp messages will be sent to patients to apologize and cancel."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleCancelDay}
              disabled={cancellingDay}
            >
              {cancellingDay ? <IOSSpinner size={16} className="text-white" /> : (lang === "ar" ? "تأكيد الإلغاء" : "Confirm Cancel")}
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
                            {rescheduleDate ? rescheduleDate.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }) : (t("visit.pickDate") || (lang === "ar" ? "اختر تاريخاً" : "Pick date"))}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={rescheduleDate} onSelect={(d) => { if (d) { setRescheduleDate(d); setRescheduleCalOpen(false); } }} disabled={(d) => d < new Date() || isNonWorkingDay(d, workingDayAbbrs)} />
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
