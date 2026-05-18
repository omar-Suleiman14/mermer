"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  MapPin,
  Phone,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import { IOSSpinner } from "@/components/ui/spinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ar-EG", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getWeekDays(startOffset = 0) {
  const days: number[] = [];
  const today = new Date();
  for (let i = startOffset; i < startOffset + 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d.getTime());
  }
  return days;
}

/** Map JS getDay() (0=Sun…6=Sat) to our abbreviations */
const DOW_MAP: Record<number, string> = {
  0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat",
};

/** Normalise Egyptian phone: user types 01xxxxxxxxx → stored as +201xxxxxxxxx */
function normalisePhone(raw: string) {
  const stripped = raw.replace(/[\s\-]/g, "");
  if (stripped.startsWith("+20")) return stripped;
  if (stripped.startsWith("0")) return "+20" + stripped.slice(1);
  return "+20" + stripped;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DoctorPublicProfile() {
  const params = useParams();
  const slug = params.slug as string;

  const doctor = useQuery(api.users.getDoctorBySlug, { slug });
  const feedbackStats = useQuery(
    api.feedback.getFeedbackStats,
    doctor ? { clerkId: doctor.clerkId } : "skip"
  );

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const weekDays = getWeekDays(weekOffset);

  // Working days from doctor profile
  const workingDays: string[] = (doctor as any)?.availableDays ?? [];
  const hasWorkingDays = workingDays.length > 0;

  /** Filter week strip to working days only (if doctor configured them) */
  const visibleWeekDays = hasWorkingDays
    ? weekDays.filter((ts) => workingDays.includes(DOW_MAP[new Date(ts).getDay()]))
    : weekDays;

  // Default to first visible day
  const activeDayTs = selectedDay ?? (visibleWeekDays[0] ?? weekDays[0]);

  /** Is the currently selected day a working day? */
  const isWorkingDay =
    !hasWorkingDays || workingDays.includes(DOW_MAP[new Date(activeDayTs).getDay()]);

  const bookedSlots = useQuery(
    api.appointments.getAvailableSlots,
    doctor ? { slug, date: activeDayTs } : "skip"
  );

  const takenTimestamps = new Set(bookedSlots ?? []);

  const daySlots = doctor && isWorkingDay
    ? (() => {
        const startHour = (doctor as any).workingHoursStart ?? 9;
        const endHour = (doctor as any).workingHoursEnd ?? 17;
        const slotMin = doctor.slotDurationMinutes ?? 30;
        const slots: number[] = [];
        const cursor = new Date(activeDayTs);
        cursor.setHours(startHour, 0, 0, 0);
        const end = new Date(activeDayTs);
        end.setHours(endHour, 0, 0, 0);
        while (cursor < end) {
          slots.push(cursor.getTime());
          cursor.setMinutes(cursor.getMinutes() + slotMin);
        }
        return slots;
      })()
    : [];

  // Booking form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const createAppointment = useMutation(api.appointments.createAppointment);

  async function sendWhatsApp(fullPhone: string) {
    if (!doctor || !selectedSlot) return;
    try {
      await fetch("/api/whatsapp-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientPhone: fullPhone,
          patientName: name.trim(),
          doctorName: doctor.name,
          clinicName: (doctor as any).clinicName,
          dateStr: `${formatDate(selectedSlot)} الساعة ${formatTime(selectedSlot)}`,
        }),
      });
    } catch {
      // non-blocking
    }
  }

  async function handleBook() {
    if (!name.trim() || !phone.trim() || !selectedSlot) return;
    const fullPhone = normalisePhone(phone);
    setIsBooking(true);
    try {
      await createAppointment({
        doctorSlug: slug,
        patientName: name.trim(),
        patientPhone: fullPhone,
        date: selectedSlot,
      });
      setBooked(true);
      sendWhatsApp(fullPhone);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already booked")) {
        toast.error("هذا الموعد محجوز — يرجى اختيار وقت آخر.");
        setSelectedSlot(null);
        setBookingOpen(false);
      } else {
        toast.error("فشل الحجز. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setIsBooking(false);
    }
  }

  // ── Loading / not found ────────────────────────────────────────────────────

  if (doctor === undefined) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
        <IOSSpinner size={24} className="text-[#007AFF]" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6" dir="rtl">
        <div>
          <p className="text-lg font-semibold mb-2">الطبيب غير موجود</p>
          <p className="text-sm text-muted-foreground mb-6">
            هذا الملف الشخصي غير موجود أو غير متاح للعموم.
          </p>
          <Link href="/" className="text-sm text-[#007AFF] hover:underline">
            → العودة
          </Link>
        </div>
      </div>
    );
  }

  const initials = doctor.name.charAt(0).toUpperCase();
  const profilePhotoUrl = (doctor as any).profilePhotoUrl as string | null;

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]" dir="rtl">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            رجوع
          </Link>
          <span className="font-bold text-[#007AFF] me-auto">ابن سينا</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Doctor Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-8 border border-black/6 dark:border-white/6 shadow-sm"
        >
          <div className="flex items-start gap-6">
            {profilePhotoUrl ? (
              <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-black/5 dark:border-white/5 shadow-sm">
                <Image
                  src={profilePhotoUrl}
                  alt={`د. ${doctor.name}`}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl font-bold text-[#007AFF]">
                  {initials}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  د. {doctor.name}
                </h1>
              </div>
              {doctor.specialty && (
                <p className="text-base text-[#007AFF] font-medium mb-0.5">
                  {doctor.specialty}
                </p>
              )}
              {doctor.credentials && (
                <p className="text-sm text-muted-foreground mb-3">
                  {doctor.credentials}
                </p>
              )}

              {feedbackStats && feedbackStats.count > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className="w-4 h-4"
                      fill={s <= Math.round(feedbackStats.average) ? "#f5a623" : "none"}
                      stroke={s <= Math.round(feedbackStats.average) ? "#f5a623" : "#d1d5db"}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground me-1">
                    {feedbackStats.average.toFixed(1)} ({feedbackStats.count} تقييم)
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {doctor.clinicName && (
                  <span className="font-medium text-foreground">{doctor.clinicName}</span>
                )}
                {((doctor as any).clinicAddressLink || doctor.clinicAddress) && (
                  (doctor as any).clinicAddressLink ? (
                    <a
                      href={(doctor as any).clinicAddressLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 hover:text-[#FF3B30] transition-colors cursor-pointer"
                      title="فتح في خرائط جوجل"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#FF3B30]" />
                      {doctor.clinicAddress || "عرض الموقع"}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {doctor.clinicAddress}
                    </span>
                  )
                )}
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone}`}
                    className="flex items-center gap-1.5 hover:text-[#007AFF] transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {doctor.phone}
                  </a>
                )}
                {doctor.workingHours && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {doctor.workingHours}
                  </span>
                )}
              </div>

              {(doctor as any).consultationFee && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-sm font-medium">
                  رسم الكشف: {(doctor as any).consultationFee} ج.م
                </div>
              )}

              {(doctor as any).bio && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/50">
                  {(doctor as any).bio}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Leave a Review */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-5 border border-black/6 dark:border-white/6 shadow-sm flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center flex-shrink-0">
            <Star className="w-5 h-5 text-[#FF9500]" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">زرت هذه العيادة من قبل؟</p>
            <p className="text-xs text-muted-foreground mt-0.5">ساعد الآخرين بمشاركة تجربتك.</p>
          </div>
          <Link
            href={`/feedback/${params.slug}`}
            className="flex-shrink-0 text-xs font-semibold text-[#FF9500] border border-[#FF9500]/30 px-3 py-1.5 rounded-lg hover:bg-[#FF9500]/10 transition-colors"
          >
            اترك تقييماً ←
          </Link>
        </motion.div>

        {/* Booking Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-6 border border-black/6 dark:border-white/6 shadow-sm"
        >
          <h2 className="font-semibold text-base flex items-center gap-2 mb-5">
            <CalendarDays className="w-4 h-4 text-[#007AFF]" />
            احجز موعداً
          </h2>

          {/* Week navigation */}
          <div className="flex items-center gap-2 mb-4">
            {/* Next week (→ in RTL = forward) */}
            <button
              onClick={() => { setWeekOffset((o) => o + 7); setSelectedDay(null); setSelectedSlot(null); }}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1" dir="ltr">
              {weekDays.map((dayTs) => {
                const d = new Date(dayTs);
                const dow = DOW_MAP[d.getDay()];
                const isWorkingDayBtn = !hasWorkingDays || workingDays.includes(dow);
                const isSelected = (selectedDay ?? visibleWeekDays[0] ?? weekDays[0]) === dayTs;
                const isPast = dayTs < startOfDay(Date.now());
                const isDisabled = isPast || !isWorkingDayBtn;
                return (
                  <button
                    key={dayTs}
                    onClick={() => { if (!isDisabled) { setSelectedDay(dayTs); setSelectedSlot(null); } }}
                    disabled={isDisabled}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl text-xs transition-all ${
                      isSelected && isWorkingDayBtn
                        ? "bg-[#007AFF] text-white"
                        : isDisabled
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{d.toLocaleDateString("ar-EG", { weekday: "short" })}</span>
                    <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                    {!isWorkingDayBtn && !isPast && (
                      <span className="text-[8px] font-medium text-muted-foreground/40 mt-0.5">مغلق</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Prev week (← in RTL = back) */}
            <button
              onClick={() => { setWeekOffset((o) => Math.max(0, o - 7)); setSelectedDay(null); setSelectedSlot(null); }}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4 font-medium">{formatDate(activeDayTs)}</p>

          {/* Slots */}
          {!isWorkingDay ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">العيادة مغلقة هذا اليوم</p>
              <p className="text-xs text-muted-foreground/60 mt-1">هذا اليوم ليس ضمن أيام العمل.</p>
            </div>
          ) : bookedSlots === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IOSSpinner size={16} /> جارٍ تحميل المواعيد…
            </div>
          ) : daySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مواعيد متاحة لهذا اليوم.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {daySlots.map((ts) => {
                  const isTaken = takenTimestamps.has(ts);
                  const isSelected = selectedSlot === ts;
                  return (
                    <button
                      key={ts}
                      onClick={() => { if (!isTaken) { setSelectedSlot(ts); setBookingOpen(true); } }}
                      disabled={isTaken}
                      title={isTaken ? "محجوز" : undefined}
                      className={`py-2.5 px-1 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-0.5 ${
                        isTaken
                          ? "border-border/40 bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm"
                          : "border-border hover:border-[#007AFF]/60 hover:text-[#007AFF] hover:bg-[#007AFF]/5 cursor-pointer"
                      }`}
                    >
                      {formatTime(ts)}
                      {isTaken && <span className="text-[9px]">محجوز</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                <span className="inline-block w-3 h-3 rounded bg-muted/40 border border-border/40 ms-1 align-middle" />
                المواعيد الرمادية محجوزة. اضغط على موعد متاح للحجز.
              </p>
            </>
          )}
        </motion.div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingOpen && selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !booked && setBookingOpen(false)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative z-10 w-full sm:max-w-md bg-[#f0efea] dark:bg-[#1c1c1a] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
              <div className="px-6 py-5">
                {booked ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">تم تأكيد الحجز!</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      د. {doctor.name} · {formatTime(selectedSlot)}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedSlot)}</p>

                    <button
                      onClick={() => { setBookingOpen(false); setBooked(false); setSelectedSlot(null); setName(""); setPhone(""); }}
                      className="mt-6 text-sm text-[#007AFF] hover:underline font-medium"
                    >
                      تم
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mini doctor card */}
                    <div className="flex items-center gap-3 mb-5 p-3 bg-muted/30 rounded-xl">
                      {profilePhotoUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                          <Image src={profilePhotoUrl} alt={`د. ${doctor.name}`} width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[#007AFF]">{initials}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">د. {doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(selectedSlot)} · {formatDate(selectedSlot)}</p>
                      </div>
                    </div>

                    <h3 className="font-bold text-base mb-4">أكمل بيانات الحجز</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">الاسم الكامل *</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="اسمك الكامل"
                          dir="rtl"
                          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">رقم الواتساب *</label>
                        <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#007AFF] bg-background" dir="ltr">
                          <span className="px-3 py-2.5 text-sm font-semibold text-muted-foreground bg-muted/30 border-r border-border select-none">
                            +20
                          </span>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").replace(/^0/, ""))}
                            placeholder="1035555282"
                            type="tel"
                            maxLength={11}
                            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">سنرسل تأكيداً على هذا الرقم عبر الواتساب.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setBookingOpen(false)}
                        className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={handleBook}
                        disabled={isBooking || !name.trim() || phone.trim().length < 8}
                        className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBooking ? <IOSSpinner size={16} className="text-white" /> : "تأكيد الحجز"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
