import { useCallback } from "react";
import { toast } from "sonner";
import { Lang } from "./i18n/client";

/** Day of week abbreviations (0=Sun ... 6=Sat) */
export const DOW_ABBR_MAP: Record<number, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/** Get the start of the day in milliseconds */
export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Get localized locale string based on lang */
export function dateLocale(lang: Lang) {
  return lang === "ar" ? "ar-EG" : "en-US";
}

/** Format timestamp to local time string (e.g. "10:00 AM") */
export function formatTime(ts: number, lang: Lang) {
  return new Date(ts).toLocaleTimeString(dateLocale(lang), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Format timestamp to full date string (e.g. "Monday, January 1, 2024") */
export function formatFullDate(ts: number, lang: Lang) {
  return new Date(ts).toLocaleDateString(dateLocale(lang), {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Check if a given date is a non-working day for a doctor */
export function isNonWorkingDay(d: Date, availableDays?: string[]): boolean {
  if (!availableDays || availableDays.length === 0) return false;
  const dayName = DOW_ABBR_MAP[d.getDay()];
  return !availableDays.includes(dayName);
}

/** Hook to generate and open WhatsApp templates */
export function useWhatsAppTemplate(lang: Lang) {
  const generateAndOpen = useCallback(
    (
      templateBody: string,
      patientName: string,
      patientPhone: string,
      appointmentDate: number,
      clinicAddressLink?: string
    ) => {
      const firstName = patientName.split(" ")[0];
      const now = new Date(appointmentDate);
      
      const message = templateBody
        .replace(/\{patient_name\}/g, patientName)
        .replace(
          /\{date\}/g,
          now.toLocaleDateString(dateLocale(lang), {
            month: "short",
            day: "numeric",
          })
        )
        .replace(/\{time\}/g, formatTime(appointmentDate, lang))
        .replace(/\{clinic_address\}/g, clinicAddressLink || "")
        .replace(/\{\{name\}\}/g, firstName);

      let num = patientPhone.replace(/[\s\-\(\)]/g, "");
      if (num.startsWith("+")) num = num.slice(1);
      if (num.startsWith("0")) num = "20" + num.slice(1);
      else if (!num.startsWith("20")) num = "20" + num;

      const url = `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
      
      toast.success(
        lang === "ar"
          ? `فتح واتساب لـ ${firstName}`
          : `Opening WhatsApp for ${firstName}`
      );
    },
    [lang]
  );

  return generateAndOpen;
}
