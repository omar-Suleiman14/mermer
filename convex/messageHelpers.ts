/**
 * Shared helpers for WhatsApp message formatting.
 * All times are formatted in Africa/Cairo timezone so they match what the UI shows.
 */

// ── Time / Date helpers ───────────────────────────────────────────────────────

const CAIRO_TZ = "Africa/Cairo";
const AR_LOCALE = "ar-EG";

/** e.g. "الأحد، 31 مايو 2026" */
export function fmtDateAr(ts: number): string {
  return new Date(ts).toLocaleDateString(AR_LOCALE, {
    timeZone: CAIRO_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** e.g. "11:00 ص" */
export function fmtTimeAr(ts: number): string {
  return new Date(ts).toLocaleTimeString(AR_LOCALE, {
    timeZone: CAIRO_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** e.g. "31/05/2026" */
export function fmtDateShortAr(ts: number): string {
  return new Date(ts).toLocaleDateString(AR_LOCALE, {
    timeZone: CAIRO_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── Slot number helper ────────────────────────────────────────────────────────

/**
 * Given an appointment timestamp and doctor settings, returns its 1-based slot number.
 * Slot 1 = first slot of the working day.
 */
export function calcSlotNumber(
  ts: number,
  workingHoursStart: number,
  slotDurationMinutes: number,
): number {
  const d = new Date(ts);
  const localHour = Number(
    d.toLocaleString("en-US", { timeZone: CAIRO_TZ, hour: "numeric", hour12: false })
  );
  const localMin = Number(
    d.toLocaleString("en-US", { timeZone: CAIRO_TZ, minute: "numeric" })
  );
  const minutesFromStart = (localHour - workingHoursStart) * 60 + localMin;
  return Math.floor(minutesFromStart / slotDurationMinutes) + 1;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const RLM = "\u200F";

/** Builds the clinic header: "عيادة د. سماح علي" */
function clinicHeader(clinicName: string, doctorName: string): string {
  const clinic = clinicName || "العيادة";
  const doctor = doctorName ? `د. ${doctorName}` : "";
  const headerText = doctor ? `${clinic} - ${doctor}` : clinic;
  return `*${headerText}*`;
}

/** Builds an address footer line if an address/maps link is provided. */
function addressLine(clinicAddress?: string, clinicAddressLink?: string): string {
  if (clinicAddressLink && clinicAddress) return `\n\nالعنوان: ${clinicAddress}\nخريطة العيادة: ${clinicAddressLink}`;
  if (clinicAddressLink) return `\n\nخريطة العيادة: ${clinicAddressLink}`;
  if (clinicAddress) return `\n\nالعنوان: ${clinicAddress}`;
  return "";
}

// ── Message templates ─────────────────────────────────────────────────────────

interface BookingArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
  slotNumber?: number;
  clinicAddress?: string;
  clinicAddressLink?: string;
}

/**
 * Confirmation sent when a booking is made (manual or online) OR when the
 * doctor manually confirms a pending online booking from the notification center.
 */
export function msgBookingConfirmed(args: BookingArgs): string {
  const dateStr = fmtDateAr(args.date);
  const timeStr = fmtTimeAr(args.date);
  const slotLine = args.slotNumber
    ? `\nرقمك: *${args.slotNumber}*`
    : "";
  const addr = addressLine(args.clinicAddress, args.clinicAddressLink);
  return (
    RLM +
    `${clinicHeader(args.clinicName, args.doctorName)}\n\n` +
    `${args.patientName}، الحجز اتأكد.\n` +
    `التاريخ: ${dateStr}\n` +
    `الوقت: ${timeStr}` +
    `${slotLine}` +
    `${addr}\n\n` +
    `هنشوفك قريب.`
  );
}


interface CancellationArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
}

/**
 * Sent when a single appointment is cancelled by the doctor.
 */
export function msgAppointmentCancelled(args: CancellationArgs): string {
  const dateStr = fmtDateAr(args.date);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\n${args.patientName}، بنعتذر إن موعدك بتاريخ ${dateStr} اتلغى.\nلو حبيت تحجز تاني، ابعتلنا أو اتصل بينا.`;
}

interface RescheduleArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  newDate: number;
  slotNumber?: number;
  clinicAddress?: string;
  clinicAddressLink?: string;
}

/**
 * Sent when an appointment is rescheduled.
 */
export function msgRescheduled(args: RescheduleArgs): string {
  const dateStr = fmtDateAr(args.newDate);
  const timeStr = fmtTimeAr(args.newDate);
  const slotLine = args.slotNumber ? `\nرقم الحجز الجديد: ${args.slotNumber}.` : "";
  const addr = addressLine(args.clinicAddress, args.clinicAddressLink);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\n${args.patientName}، اتغير موعدك لـ ${dateStr} الساعة ${timeStr}.${slotLine}${addr}\n\nهنشوفك قريب.`;
}

interface DayCancelledArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
}

/**
 * Sent to every patient when the doctor cancels the whole day.
 */
export function msgDayCancelled(args: DayCancelledArgs): string {
  const dateStr = fmtDateAr(args.date);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\n${args.patientName}، بنعتذر إن العيادة هتكون مغلوقة بتاريخ ${dateStr} لظروف طارئة.\nهنتواصل معاك لتحديد موعد بديل. شكراً لتفهمك.`;
}

interface ReminderArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
  slotNumber?: number;
  clinicAddress?: string;
  clinicAddressLink?: string;
}

/**
 * Daily reminder sent in the morning.
 */
export function msgReminder(args: ReminderArgs): string {
  const timeStr = fmtTimeAr(args.date);
  const addr = addressLine(args.clinicAddress, args.clinicAddressLink);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\nتذكير بموعدك\n${args.patientName}، موعدك النهارده الساعة ${timeStr}.${addr}\n\nنتمنالك الشفاء.`;
}

interface MissedArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
}

/**
 * Sent the day after a missed appointment.
 */
export function msgMissed(args: MissedArgs): string {
  const dateStr = fmtDateAr(args.date);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\n${args.patientName}، يبدو إنك ما جيتش في موعدك بتاريخ ${dateStr}.\nنتمنى تكون بخير. لو حبيت تحجز تاني، ابعتلنا.`;
}

interface InstallmentArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  firstDate: number;
  totalSessions?: number;
  slotNumber?: number;
  clinicAddress?: string;
  clinicAddressLink?: string;
}

/**
 * Sent when a new installment plan is created.
 */
export function msgInstallmentCreated(args: InstallmentArgs): string {
  const dateStr = fmtDateAr(args.firstDate);
  const timeStr = fmtTimeAr(args.firstDate);
  const slotLine = args.slotNumber ? `\nرقم الحجز: ${args.slotNumber}.` : "";
  const addr = addressLine(args.clinicAddress, args.clinicAddressLink);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\n${args.patientName}، اتعمل ليك خطة علاج بالتقسيط.\nأول موعد بتاريخ ${dateStr} الساعة ${timeStr}.${slotLine}${addr}\n\nهنشوفك قريب.`;
}

/**
 * Sent when an installment visit is rescheduled.
 */
export function msgInstallmentRescheduled(args: RescheduleArgs): string {
  return msgRescheduled(args);
}

/**
 * Queue call — patient's turn is now.
 */
export function msgYourTurn(patientName: string, clinicName?: string, doctorName?: string): string {
  const header = (clinicName || doctorName)
    ? `${clinicHeader(clinicName || "", doctorName || "")}\n\n`
    : "";
  return RLM + `${header}${patientName}، دورك وصل دلوقتي. تعال للعيادة في أقرب وقت.`;
}

interface PastDueInstallmentArgs {
  patientName: string;
  clinicName: string;
  doctorName: string;
  date: number;
  amount: number;
}

/**
 * Sent when an installment payment is past due.
 */
export function msgPastDueInstallment(args: PastDueInstallmentArgs): string {
  const dateStr = fmtDateAr(args.date);
  return RLM + `${clinicHeader(args.clinicName, args.doctorName)}\n\nمرحباً ${args.patientName}،\nنود تذكيركم بوجود قسط متأخر بقيمة ${args.amount} مستحق الدفع بتاريخ ${dateStr}.\nنتمنى لكم دوام الصحة والعافية.`;
}
