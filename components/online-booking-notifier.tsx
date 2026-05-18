"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useI18n } from "@/lib/i18n";

export function OnlineBookingNotifier() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t } = useI18n();

  const appointments = useQuery(
    api.appointments.listAppointments,
    clerkId ? { clerkId } : "skip"
  );

  const prevVisitIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!appointments) return;

    const currentIds = new Set(appointments.map((a) => a._id));

    if (prevVisitIds.current) {
      // Find new appointments
      const newAppts = appointments.filter((a) => !prevVisitIds.current!.has(a._id));

      newAppts.forEach((appt) => {
        const isMuted = localStorage.getItem("muteOnlineBookings") === "true";
        if (appt.source === "online" && !isMuted) {
          const title = t("notifications.newOnlineBooking") || "New Online Booking";
          const body = `${appt.patientName} ${t("notifications.bookedOn") || "booked an appointment on"} ${new Date(appt.date).toLocaleDateString()}`;

          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              // Try standard notification
              const noti = new window.Notification(title, {
                body: body,
                requireInteraction: true,
              });
              
              // In case the browser requires a service worker and standard notification silently fails:
              navigator.serviceWorker?.getRegistration().then((reg) => {
                if (reg) reg.showNotification(title, { body });
              });
            } catch (e) {
              console.error("Failed to show browser notification:", e);
              // Fallback to service worker if new Notification throws (e.g. Chrome Android)
              navigator.serviceWorker?.getRegistration().then((reg) => {
                if (reg) reg.showNotification(title, { body });
              });
            }
          }
        }
      });
    }

    prevVisitIds.current = currentIds;
  }, [appointments]);

  return null;
}
