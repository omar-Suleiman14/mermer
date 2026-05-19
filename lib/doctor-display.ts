import { DAY_ABBREVS, DAY_FULL_NAMES } from "./doctor-constants";

type TFn = (key: string) => string;

export function translateSpecialty(t: TFn, specialty: string | null | undefined): string {
  if (!specialty) return "";
  const key = `specialty.${specialty}`;
  const translated = t(key);
  return translated !== key ? translated : specialty;
}

export function formatDoctorTitle(name: string, lang: "en" | "ar"): string {
  const prefix = lang === "ar" ? "د. " : "Dr. ";
  return `${prefix}${name}`;
}

/** Whether doctor works today — supports Mon/Tue and Monday/Tuesday storage */
export function isAvailableToday(availableDays: string[]): boolean {
  if (!availableDays.length) return false;
  const dow = new Date().getDay();
  const abbrev = DAY_ABBREVS[dow];
  const full = DAY_FULL_NAMES[dow];
  return availableDays.includes(abbrev) || availableDays.includes(full);
}

export function todayDayAbbrev(): string {
  return DAY_ABBREVS[new Date().getDay()];
}
