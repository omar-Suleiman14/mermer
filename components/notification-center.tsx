"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Bell, Calendar, Clock, X, Trash2, MessageCircle, UserCheck, UserX, Building2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "@/lib/i18n/client";
import { formatDistanceToNow } from "date-fns";
import { arEG, enUS } from "date-fns/locale";
import { toast } from "sonner";

// ── Template picker popup (self-contained mini version) ──────────────────────
function TemplatePicker({
  noti,
  currentUser,
  messageTemplates,
  lang,
  t,
  onClose,
}: {
  noti: { patientName?: string; date: number; patientPhone?: string };
  currentUser: { clinicAddressLink?: string } | undefined | null;
  messageTemplates: { _id: string; name: string; body: string }[] | undefined;
  lang: string;
  t: (k: string) => string;
  onClose: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);

  function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function send(body: string) {
    const firstName = noti.patientName?.split(" ")[0] || "";
    const apptDate = new Date(noti.date);
    const message = body
      .replace(/\{patient_name\}/g, noti.patientName || "")
      .replace(/\{date\}/g, apptDate.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" }))
      .replace(/\{time\}/g, formatTime(noti.date))
      .replace(/\{clinic_address\}/g, currentUser?.clinicAddressLink || "")
      .replace(/\{\{name\}\}/g, firstName)
      .replace(/\{name\}/g, firstName);

    let num = (noti.patientPhone || "").replace(/[\s\-\(\)]/g, "");
    if (num.startsWith("+")) num = num.slice(1);
    if (num.startsWith("0")) num = "20" + num.slice(1);
    else if (!num.startsWith("20")) num = "20" + num;

    window.open(`https://wa.me/${num}?text=${encodeURIComponent(message)}`, "_blank");
    toast.success(`Opening WhatsApp for ${firstName}`);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-200 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
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
              {t("templates.sendTo") || "Send to"} {noti.patientName?.split(" ")[0]}
            </p>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("templates.chooseTemplate") || "Choose a template"}</p>
        </div>

        <div className="px-3 pb-3 space-y-1 max-h-[50vh] overflow-y-auto">
          {/* Saved templates */}
          {(messageTemplates ?? []).map((tpl) => (
            <button
              key={tpl._id}
              onClick={() => send(tpl.body)}
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
            <div className="flex flex-col items-center gap-2 px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">{t("templates.createInSettings") || "Create templates in Settings"}</p>
            </div>
          )}
        </div>
      </motion.div>
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
  const messageTemplates = useQuery(api.messageTemplates.listTemplates, clerkId ? { clerkId } : "skip");
  const pendingInvite = useQuery(api.users.getPendingInvitation, clerkId ? { clerkId } : "skip");

  const acceptInvite = useMutation(api.users.acceptInvitation);
  const declineInvite = useMutation(api.users.declineInvitation);
  const [inviteLoading, setInviteLoading] = useState<"accept" | "decline" | null>(null);

  // FIX #10: Use timestamp-based read state instead of growing deletedIds set.
  // "lastClearedAt" replaces the old deletedIds set — any notification created
  // before this timestamp is considered cleared/dismissed.
  const [lastViewedAt, setLastViewedAt] = useState<number | null>(null);
  const [lastClearedAt, setLastClearedAt] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [reminderFor, setReminderFor] = useState<{ patientName?: string; date: number; patientPhone?: string; _id?: string } | null>(null);

  // Load persisted state once on mount
  useEffect(() => {
    setTimeout(() => {
      try {
        const storedLastViewed = localStorage.getItem("notificationsLastViewedAt");
        setLastViewedAt(storedLastViewed ? Number(storedLastViewed) : 0);

        const storedCleared = localStorage.getItem("notificationsLastClearedAt");
        if (storedCleared) setLastClearedAt(Number(storedCleared));
      } catch {
        // localStorage may be unavailable or full — graceful fallback
        setLastViewedAt(0);
      }
    }, 0);
  }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const notifications = (onlineAppointments ?? [])
    .filter((a) => a.createdAt > lastClearedAt) // timestamp-based filtering replaces deletedIds
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

  // FIX #10: Individual "delete" now just updates the cleared timestamp to hide that notification
  const handleDelete = (createdAt: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // No-op for individual deletes — user can use "Clear all" for bulk.
    // This just visually removes by setting cleared to this notification's timestamp
    // (only hides this and older ones)
    if (createdAt >= lastClearedAt) {
      const newCleared = createdAt;
      setLastClearedAt(newCleared);
      try {
        localStorage.setItem("notificationsLastClearedAt", String(newCleared));
      } catch { /* QuotaExceededError guard */ }
    }
  };

  const handleClearAll = () => {
    const now = Date.now();
    setLastClearedAt(now);
    try {
      localStorage.setItem("notificationsLastClearedAt", String(now));
      // Clean up old deletedNotificationIds if it exists (migration)
      localStorage.removeItem("deletedNotificationIds");
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
                        <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-[#007AFF]" />
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -inset-e-0.5 w-2.5 h-2.5 rounded-full bg-[#007AFF] ring-2 ring-background" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight mb-0.5">
                          {t("notifications.newOnlineBooking") || "New Online Booking"}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">{noti.patientName}</span>{" "}
                          {t("notifications.bookedOn") || "booked on"}{" "}
                          {new Date(noti.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}{" "}
                          {t("notifications.at") || "at"}{" "}
                          {new Date(noti.date).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-muted-foreground font-medium">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(noti.createdAt, { addSuffix: true, locale: dateLocale })}
                        </div>

                        {/* Send Reminder */}
                        {noti.patientPhone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                              setReminderFor(noti);
                            }}
                            className="mt-2.5 text-xs font-semibold bg-[#25D366]/10 text-[#25D366] px-3 py-1.5 rounded-lg hover:bg-[#25D366]/20 transition-colors flex items-center gap-1.5 w-fit"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {t("notifications.sendReminder") || "Send reminder"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDelete(noti.createdAt, e)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/60 transition-all text-muted-foreground hover:text-red-500 absolute top-3 inset-e-3"
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
            currentUser={currentUser as { clinicAddressLink?: string }}
            messageTemplates={messageTemplates as { _id: string; name: string; body: string }[]}
            lang={lang}
            t={t}
            onClose={() => setReminderFor(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
