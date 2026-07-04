"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { X, Search, Clock, CalendarIcon, CheckCircle2, MoreVertical, MessageCircle, AlertCircle, RefreshCw } from "lucide-react";
import { msgBookingConfirmed, msgReminder, msgRescheduled, msgAppointmentCancelled, msgYourTurn, msgMissed } from "@/convex/messageHelpers";
import { Bell, Calendar, Trash2, UserCheck, UserX, Building2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/client";
import { formatDistanceToNow } from "date-fns";
import { arEG, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { formatTime } from "@/lib/scheduling";

// ── Template picker popup (self-contained mini version) ──────────────────────
function TemplatePicker({
  noti,
  currentUser,
  lang,
  t,
  onClose,
}: {
  noti: { patientName?: string; date: number; patientPhone?: string };
  currentUser: any;
  lang: string;
  t: (k: string) => string;
  onClose: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);

  function send(body: string) {
    const firstName = noti.patientName?.split(" ")[0] || "";
    let num = (noti.patientPhone || "").replace(/[\s\-\(\)]/g, "");
    if (num.startsWith("+")) num = num.slice(1);
    if (num.startsWith("0")) num = "20" + num.slice(1);
    else if (!num.startsWith("20")) num = "20" + num;

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(body)}`, "_blank");
    toast.success(`Opening WhatsApp for ${firstName}`);
    onClose();
  }

  const templates = [
    {
      name: "تأكيد حجز",
      body: msgBookingConfirmed({
        patientName: noti.patientName || "",
        clinicName: currentUser?.clinicName || "العيادة",
        doctorName: currentUser?.name || "",
        date: noti.date,
        clinicAddress: currentUser?.clinicAddress,
        clinicAddressLink: currentUser?.clinicAddressLink
      })
    },
    {
      name: "تذكير بموعد",
      body: msgReminder({
        patientName: noti.patientName || "",
        clinicName: currentUser?.clinicName || "العيادة",
        doctorName: currentUser?.name || "",
        date: noti.date,
        clinicAddress: currentUser?.clinicAddress,
        clinicAddressLink: currentUser?.clinicAddressLink
      })
    },
    {
      name: "تعديل موعد",
      body: msgRescheduled({
        patientName: noti.patientName || "",
        clinicName: currentUser?.clinicName || "العيادة",
        doctorName: currentUser?.name || "",
        newDate: noti.date,
        clinicAddress: currentUser?.clinicAddress,
        clinicAddressLink: currentUser?.clinicAddressLink
      })
    },
    {
      name: "إلغاء موعد",
      body: msgAppointmentCancelled({
        patientName: noti.patientName || "",
        clinicName: currentUser?.clinicName || "العيادة",
        doctorName: currentUser?.name || "",
        date: noti.date
      })
    },
    {
      name: "دورك الآن",
      body: msgYourTurn(
        noti.patientName || "",
        currentUser?.clinicName,
        currentUser?.name
      )
    },
    {
      name: "موعد فائت",
      body: msgMissed({
        patientName: noti.patientName || "",
        clinicName: currentUser?.clinicName || "العيادة",
        doctorName: currentUser?.name || "",
        date: noti.date
      })
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute left-0 bottom-full mb-2 w-64 bg-background border border-border shadow-xl rounded-2xl overflow-hidden z-50"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <p className="text-[11px] font-medium text-muted-foreground">{t("templates.chooseTemplate") || "Choose a template"}</p>
        <button onClick={onClose} className="p-1 hover:bg-muted/80 rounded-md">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
      <div className="max-h-[250px] overflow-y-auto p-1.5 space-y-0.5">
        {templates.map((tpl) => (
          <button
            key={tpl.name}
            onClick={() => send(tpl.body)}
            className="w-full flex flex-col px-2.5 py-2 hover:bg-muted/50 rounded-xl transition-colors text-start"
          >
            <p className="text-sm font-medium">{tpl.name}</p>
            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
              {tpl.body}
            </p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function NotificationCenter() {
  const { user } = useUser();
  const { t, lang } = useI18n();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const onlineAppointments = useQuery(api.appointments.listOnlineAppointments, clerkId ? { clerkId } : "skip");
  const supportMsgs = useQuery(api.support.listUserSupportMessages, clerkId ? { clerkId } : "skip");
  const pendingInvite = useQuery(api.users.getPendingInvitation, clerkId ? { clerkId } : "skip");

  const acceptInvite = useMutation(api.users.acceptInvitation);
  const declineInvite = useMutation(api.users.declineInvitation);
  const [inviteLoading, setInviteLoading] = useState<"accept" | "decline" | null>(null);

  // FIX #10: Use timestamp-based read state instead of growing deletedIds set.
  // "lastClearedAt" replaces the old deletedIds set — any notification created
  // before this timestamp is considered cleared/dismissed.
  const [lastViewedAt, setLastViewedAt] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<{ patientName?: string; date: number; patientPhone?: string; _id?: string } | null>(null);
  
  const updateAppointment = useMutation(api.appointments.updateAppointment);

  // Load persisted state once on mount
  useEffect(() => {
    setTimeout(() => {
      try {
        const storedLastViewed = localStorage.getItem("notificationsLastViewedAt");
        setLastViewedAt(storedLastViewed ? Number(storedLastViewed) : 0);

        const storedCleared = localStorage.getItem("notificationsLastClearedAt");
        if (storedCleared) {
          // Legacy migration
        }

        const storedDeletedIds = localStorage.getItem("deletedNotificationIds");
        if (storedDeletedIds) {
          setDeletedIds(JSON.parse(storedDeletedIds));
        }
      } catch {
        // localStorage may be unavailable or full — graceful fallback
        setLastViewedAt(0);
      }
    }, 0);
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────
  type AppNotification = 
    | { type: "onlineBooking"; _id: string; createdAt: number; patientName: string; date: number; patientPhone: string; status: string; }
    | { type: "supportMsg"; _id: string; createdAt: number; message: string; isRead: boolean; };

  const allItems: AppNotification[] = [
    ...(onlineAppointments ?? []).map(a => ({ type: "onlineBooking" as const, _id: a._id, createdAt: a.createdAt, patientName: a.patientName || "", date: a.date, patientPhone: a.patientPhone || "", status: a.status || "pending" })),
    ...(supportMsgs ?? []).filter(m => m.fromAdmin).map(m => ({ type: "supportMsg" as const, _id: m._id, createdAt: m.createdAt, message: m.message, isRead: m.isRead }))
  ];

  const notifications = allItems
    .filter((a) => !deletedIds.includes(a._id))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);

  const unreadCount =
    lastViewedAt === null
      ? 0
      : notifications.filter((n) => n.createdAt > lastViewedAt).length + (pendingInvite ? 1 : 0);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const markAllRead = () => {
    // Use the newest notification's timestamp so everything becomes "read"
    const newest = notifications.length > 0 ? notifications[0].createdAt : Date.now();
    const now = Math.max(Date.now(), newest);
    setLastViewedAt(now);
    try {
      localStorage.setItem("notificationsLastViewedAt", String(now));
    } catch { /* QuotaExceededError guard */ }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) markAllRead();
  };

  // FIX #10: Individual "delete" now safely tracks exact IDs deleted
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDeleted = [...deletedIds, id];
    setDeletedIds(newDeleted);
    try {
      localStorage.setItem("deletedNotificationIds", JSON.stringify(newDeleted));
    } catch { /* QuotaExceededError guard */ }
  };

  const handleClearAll = () => {
    const allIds = allItems.map(a => a._id);
    const newDeleted = Array.from(new Set([...deletedIds, ...allIds]));
    setDeletedIds(newDeleted);
    try {
      localStorage.setItem("deletedNotificationIds", JSON.stringify(newDeleted));
    } catch { /* QuotaExceededError guard */ }
  };

  const dateLocale = lang === "ar" ? arEG : enUS;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button className="relative p-2 rounded-full hover:bg-muted/60 transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 inset-e-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-0 rounded-xl overflow-hidden shadow-xl border-border/60">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {t("notifications.title") || "Notifications"}
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t("notifications.clearAll") || "Clear all"}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-100 overflow-y-auto divide-y divide-border/40">
            {/* Invite notification */}
            {pendingInvite && (
              <div className="p-4 bg-[#007AFF]/5 border-b border-[#007AFF]/20">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4 text-[#007AFF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight mb-0.5">
                      {lang === "ar" ? "دعوة انضمام للعيادة" : "Clinic Invitation"}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {lang === "ar"
                        ? `دعاك ${pendingInvite.doctorName} للانضمام إلى عيادة ${pendingInvite.doctorClinicName} بصفتك ${pendingInvite.role}`
                        : `${pendingInvite.doctorName} invited you to join ${pendingInvite.doctorClinicName} as ${pendingInvite.role}`}
                    </p>
                    <div className="flex gap-2 mt-2.5">
                      <button
                        disabled={!!inviteLoading}
                        onClick={async () => {
                          setInviteLoading("accept");
                          try {
                            await acceptInvite({ clerkId, invitationId: pendingInvite._id });
                            toast.success(lang === "ar" ? "تم قبول الدعوة" : "Invitation accepted!");
                          } catch { toast.error("Failed"); }
                          setInviteLoading(null);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#007AFF]/90 transition-colors disabled:opacity-60"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {inviteLoading === "accept" ? "..." : (lang === "ar" ? "قبول" : "Accept")}
                      </button>
                      <button
                        disabled={!!inviteLoading}
                        onClick={async () => {
                          setInviteLoading("decline");
                          try {
                            await declineInvite({ clerkId, invitationId: pendingInvite._id });
                            toast(lang === "ar" ? "تم رفض الدعوة" : "Invitation declined");
                          } catch { toast.error("Failed"); }
                          setInviteLoading(null);
                        }}
                        className="flex items-center gap-1.5 text-xs font-semibold bg-muted text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-60"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        {inviteLoading === "decline" ? "..." : (lang === "ar" ? "رفض" : "Decline")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {notifications.length === 0 && !pendingInvite ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p>{t("notifications.noNew") || "No new notifications"}</p>
              </div>
            ) : (
              notifications.map((noti) => {
                const isUnread = lastViewedAt !== null && noti.createdAt > lastViewedAt;

                return (
                  <div
                    key={noti._id}
                    className={`p-4 transition-colors relative group ${isUnread ? "bg-[#007AFF]/5" : "hover:bg-muted/20"}`}
                  >
                    <div className="flex gap-3 pe-8">
                      {/* Icon */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full ${noti.type === "supportMsg" ? "bg-purple-500/10" : "bg-[#007AFF]/10"} flex items-center justify-center`}>
                          {noti.type === "supportMsg" ? (
                            <MessageCircle className="w-4 h-4 text-purple-500" />
                          ) : (
                            <Calendar className="w-4 h-4 text-[#007AFF]" />
                          )}
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -inset-e-0.5 w-2.5 h-2.5 rounded-full bg-[#007AFF] ring-2 ring-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight mb-0.5">
                          {noti.type === "supportMsg" 
                            ? (lang === "ar" ? "رسالة من الدعم الفني" : "Message from Support")
                            : (t("notifications.newOnlineBooking") || "New Online Booking")
                          }
                        </p>
                        
                        {noti.type === "onlineBooking" ? (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-semibold text-foreground">{noti.patientName}</span>{" "}
                            {t("notifications.bookedOn") || "booked on"}{" "}
                            {new Date(noti.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}{" "}
                            {t("notifications.at") || "at"}{" "}
                            {new Date(noti.date).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground leading-relaxed truncate">
                            {noti.message}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(noti.createdAt, { addSuffix: true, locale: dateLocale })}
                        </div>

                        {/* Send Reminder */}
                        {noti.type === "onlineBooking" && noti.status === "pending" && noti.patientPhone && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (clerkId && noti._id) {
                                toast.promise(
                                  updateAppointment({
                                    clerkId,
                                    appointmentId: noti._id as any,
                                    updates: { status: "confirmed" }
                                  }),
                                  {
                                    loading: lang === "ar" ? "جاري التأكيد..." : "Confirming...",
                                    success: lang === "ar" ? "تم تأكيد الموعد" : "Appointment confirmed",
                                    error: lang === "ar" ? "فشل التأكيد" : "Failed to confirm"
                                  }
                                );
                              }
                            }}
                            className="mt-2.5 text-xs font-semibold bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-lg hover:bg-[#25D366]/20 transition-colors flex items-center gap-1.5 w-fit"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {lang === "ar" ? "تأكيد" : "Confirm"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(noti._id, e)}
                      className="sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/60 transition-all text-muted-foreground hover:text-red-500 absolute top-3 inset-e-3"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Template picker portal */}
      <AnimatePresence>
        {reminderFor && (
          <TemplatePicker
            noti={reminderFor}
            currentUser={currentUser}
            lang={lang}
            t={t}
            onClose={() => setReminderFor(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
