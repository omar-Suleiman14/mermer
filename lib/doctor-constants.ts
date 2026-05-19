/** Canonical specialty list — keep in sync with onboarding & i18n keys */
export const DOCTOR_SPECIALTIES = [
  "General Practitioner",
  "Cardiologist",
  "Dermatologist",
  "Dentist",
  "ENT Specialist",
  "Endocrinologist",
  "Gastroenterologist",
  "Neurologist",
  "Obstetrician / Gynecologist",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pediatrician",
  "Psychiatrist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Surgeon",
  "Urologist",
  "Other",
] as const;

export const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const DAY_FULL_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Languages commonly offered — extend as needed */
export const DOCTOR_LANGUAGES = ["Arabic", "English", "French"] as const;

export const EGYPT_CITIES = [
  "Cairo",
  "Giza",
  "Alexandria",
  "Sharm El Sheikh",
  "Hurghada",
  "Mansoura",
  "Tanta",
  "Aswan",
  "Luxor",
  "Port Said",
  "Suez",
  "Ismailia",
] as const;

export type DoctorSearchSort = "relevance" | "rating" | "fee_asc" | "fee_desc";

export type PublicDoctor = {
  _id: string;
  name: string;
  specialty: string | null;
  clinicName: string;
  clinicAddress: string | null;
  city: string | null;
  consultationFee: number | null;
  languages: string[];
  availableDays: string[];
  availableFrom: string | null;
  availableTo: string | null;
  bio: string | null;
  credentials: string | null;
  qrSlug: string | null;
  profilePhotoUrl: string | null;
  avgRating: number | null;
  reviewCount: number;
};
