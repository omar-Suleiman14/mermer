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
  ShieldCheck,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { toast } from "sonner";
import Image from "next/image";
import { IOSSpinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number, lang: "en" | "ar") {
  return new Date(ts).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts: number, lang: "en" | "ar") {
  return new Date(ts).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
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
  const { t, dir, lang } = useI18n();
  const { theme, setTheme } = useTheme();

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
          dateStr: `${formatDate(selectedSlot, lang)} ${lang === "ar" ? "الساعة" : "at"} ${formatTime(selectedSlot, lang)}`,
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
        toast.error(t("profile.slotAlreadyBooked"));
        setSelectedSlot(null);
        setBookingOpen(false);
      } else {
        toast.error(t("profile.bookingFailed"));
      }
    } finally {
      setIsBooking(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const initials = doctor?.name?.charAt(0)?.toUpperCase() || "";
  const profilePhotoUrl = doctor ? ((doctor as any).profilePhotoUrl as string | null) : null;

  return (
    <>
      {doctor === undefined && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <IOSSpinner size={24} className="text-[#0055FF]" />
        </div>
      )}

      {doctor === null && (
        <div className="min-h-screen bg-background flex items-center justify-center text-center px-6" dir={dir}>
          <div>
            <p className="font-serif text-2xl font-bold mb-2">{t("profile.notFound")}</p>
            <p className="text-base text-muted-foreground mb-8">
              {t("profile.notFoundDesc")}
            </p>
            <Link href="/" className="text-sm font-bold text-[#0055FF] hover:underline uppercase tracking-widest">
              {dir === "rtl" ? "→" : "←"} {t("profile.back")}
            </Link>
          </div>
        </div>
      )}

      {doctor && (
        <div className="min-h-screen bg-background text-foreground" dir={dir}>
          {/* Nav */}
          <nav className="sticky top-0 z-40 bg-background border-b-2 border-foreground">
            <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
              <Link
                href="/find-a-doctor"
                className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {dir === "rtl" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {dir === "rtl" ? "البحث عن طبيب" : "Find a Doctor"}
              </Link>
              <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                <div className="w-8 h-8 bg-[#0055FF] flex items-center justify-center">
                  <span className="font-serif italic font-extrabold text-sm text-white">ibn sina</span>
                </div>
                <span className="font-serif font-bold text-lg tracking-tight text-foreground">
                  {dir === "rtl" ? "ابن سينا" : "ibn sina"}
                </span>
              </Link>
            </div>
          </nav>

          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 w-full space-y-8">
              {/* Doctor Hero Card */}
              <div className="bg-card border-2 border-foreground p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-start gap-8">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {profilePhotoUrl ? (
                      <div className="w-32 h-32 overflow-hidden border-2 border-foreground">
                        <Image src={profilePhotoUrl} alt={doctor.name} width={128} height={128} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-muted flex items-center justify-center border-2 border-foreground">
                        <span className="font-serif text-5xl font-extrabold text-[#0055FF]">{initials}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col items-center sm:items-start">
                    <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start mb-2">
                      <h1 className="text-3xl sm:text-4xl font-serif font-extrabold tracking-tight text-foreground">
                        {lang === "ar" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-foreground text-background text-[10px] uppercase tracking-widest font-bold">
                        <ShieldCheck className="w-3 h-3" />
                      </span>
                    </div>

                    {doctor.specialty && (
                      <p className="text-sm font-bold uppercase tracking-widest text-[#0055FF] mb-2">{doctor.specialty}</p>
                    )}
                    {doctor.credentials && (
                      <p className="text-base font-serif text-muted-foreground mb-4">{doctor.credentials}</p>
                    )}

                    {feedbackStats && feedbackStats.count > 0 && (
                      <div className="flex items-center gap-2 mb-6">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className="w-4 h-4"
                              fill={s <= Math.round(feedbackStats.average) ? "#0055FF" : "none"}
                              stroke={s <= Math.round(feedbackStats.average) ? "#0055FF" : "currentColor"}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-foreground">{feedbackStats.average.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">({t("profile.reviewsCount").replace("{count}", feedbackStats.count.toString())})</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground font-medium">
                      {doctor.clinicName && (
                        <span className="font-bold text-foreground">{doctor.clinicName}</span>
                      )}
                      {((doctor as any).clinicAddressLink || doctor.clinicAddress) && (
                        (doctor as any).clinicAddressLink ? (
                          <a href={(doctor as any).clinicAddressLink} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 hover:text-[#0055FF] transition-colors cursor-pointer">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {doctor.clinicAddress || t("profile.viewLocation")}
                          </a>
                        ) : (
                          <span className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            {doctor.clinicAddress}
                          </span>
                        )
                      )}
                      {doctor.phone && (
                        <a href={`tel:${doctor.phone}`} className="flex items-center gap-2 hover:text-[#0055FF] transition-colors">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          {doctor.phone}
                        </a>
                      )}
                      {doctor.workingHours && (
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          {doctor.workingHours}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fee + Bio */}
                <div className="mt-8 pt-6 border-t-2 border-border flex flex-wrap items-start gap-4">
                  {(doctor as any).consultationFee && (
                    <div className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-2 text-xs font-bold uppercase tracking-widest">
                      {t("profile.consultationFeeLabel").replace("{fee}", (doctor as any).consultationFee.toLocaleString())}
                    </div>
                  )}
                </div>

                {(doctor as any).bio && (
                  <div className="mt-8 pt-8 border-t-2 border-border">
                    <h3 className="font-serif text-2xl font-bold mb-4">About</h3>
                    <p className="text-base font-serif text-muted-foreground leading-relaxed">
                      {(doctor as any).bio}
                    </p>
                  </div>
                )}
              </div>

              {/* Leave a Review Banner */}
              <div className="bg-card border-2 border-foreground p-8 flex flex-col sm:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-background border-2 border-foreground flex items-center justify-center flex-shrink-0">
                  <Star className="w-8 h-8 text-foreground" fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-start">
                  <p className="font-serif font-bold text-2xl text-foreground mb-2">{t("profile.visitedBefore")}</p>
                  <p className="text-base text-muted-foreground font-serif">{t("profile.shareExperience")}</p>
                </div>
                <Link
                  href={`/feedback/${params.slug}`}
                  className="flex-shrink-0 font-bold uppercase tracking-widest text-xs text-background bg-foreground hover:bg-[#0055FF] px-8 py-4 transition-colors cursor-pointer"
                >
                  {lang === "ar" ? "اترك تقييماً" : "Rate Visit"}
                </Link>
              </div>
            </div>

            {/* Right Column: Booking Widget */}
            <div className="w-full md:w-80 lg:w-96 flex-shrink-0">
              <div className="bg-card p-6 border-2 border-foreground sticky top-24">
                <h2 className="font-serif text-2xl font-bold flex items-center gap-3 mb-8">
                  <CalendarDays className="w-6 h-6 text-[#0055FF]" />
                  {t("profile.bookAppointment")}
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
                          className={`flex-shrink-0 flex flex-col items-center py-3 px-4 border transition-all ${isSelected && isWorkingDayBtn
                            ? "bg-[#0055FF] border-[#0055FF] text-white"
                            : isDisabled
                              ? "border-transparent text-muted-foreground/30 cursor-not-allowed"
                              : "border-transparent hover:border-foreground text-foreground"
                            }`}
                        >
                          <span className="font-medium">{d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" })}</span>
                          <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                          {!isWorkingDayBtn && !isPast && (
                            <span className="text-[8px] font-medium text-muted-foreground/40 mt-0.5">{t("profile.closed")}</span>
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

                <p className="text-xs text-muted-foreground mb-4 font-medium">{formatDate(activeDayTs, lang)}</p>

                {/* Slots */}
                {!isWorkingDay ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">{t("profile.clinicClosedToday")}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t("profile.notWorkingDay")}</p>
                  </div>
                ) : bookedSlots === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IOSSpinner size={16} /> {t("profile.loadingAppointments")}
                  </div>
                ) : daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("profile.noAppointmentsToday")}</p>
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
                            title={isTaken ? t("profile.booked") : undefined}
                            className={`py-3 px-1 text-xs font-bold transition-all border-2 flex flex-col items-center gap-1 ${isTaken
                              ? "border-border bg-muted/20 text-muted-foreground/30 cursor-not-allowed"
                              : isSelected
                                ? "bg-[#0055FF] text-white border-[#0055FF]"
                                : "border-border hover:border-[#0055FF] hover:text-[#0055FF] cursor-pointer"
                              }`}
                          >
                            {formatTime(ts, lang)}
                            {isTaken && <span className="text-[9px]">{t("profile.booked")}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className={`text-[11px] text-muted-foreground mt-3 flex items-center ${dir === "rtl" ? "gap-1.5" : "gap-1.5"}`}>
                      <span className="inline-block w-3 h-3 rounded bg-muted/40 border border-border/40 shrink-0" />
                      {t("profile.graySlotsBooked")}
                    </p>
                  </>
                )}
              </div>
            </div>
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
                  className="relative z-10 w-full sm:max-w-md bg-background border-2 border-foreground"
                >
                  <div className="sm:hidden w-12 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
                  <div className="px-6 py-5">
                    {booked ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">{t("profile.bookingConfirmed")}</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {lang === "ar" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`} · {formatTime(selectedSlot, lang)}
                        </p>
                        <p className="text-sm text-muted-foreground">{formatDate(selectedSlot, lang)}</p>

                        <button
                          onClick={() => { setBookingOpen(false); setBooked(false); setSelectedSlot(null); setName(""); setPhone(""); }}
                          className="mt-8 text-xs font-bold tracking-widest uppercase bg-foreground text-background px-8 py-3 hover:bg-[#0055FF] transition-colors"
                        >
                          {t("profile.done")}
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Mini doctor card */}
                        <div className="flex items-center gap-4 mb-8 p-4 bg-muted/30 border border-border">
                          {profilePhotoUrl ? (
                            <div className="w-12 h-12 border border-border overflow-hidden flex-shrink-0">
                              <Image src={profilePhotoUrl} alt={doctor.name} width={48} height={48} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-muted border border-border flex items-center justify-center flex-shrink-0">
                              <span className="text-lg font-serif font-bold text-[#0055FF]">{initials}</span>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">{lang === "ar" ? `د. ${doctor.name}` : `Dr. ${doctor.name}`}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(selectedSlot, lang)} · {formatDate(selectedSlot, lang)}</p>
                          </div>
                        </div>

                        <h3 className="font-bold text-base mb-4">{t("profile.completeBooking")}</h3>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">{t("profile.fullName")}</label>
                            <input
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder=""
                              dir={dir}
                              className="w-full px-4 py-3 text-base font-medium bg-background border-2 border-foreground focus:outline-none focus:ring-4 focus:ring-[#0055FF]/20 focus:border-[#0055FF] transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-muted-foreground block mb-2">{t("profile.whatsappNumber")}</label>
                            <div className="flex items-center border-2 border-foreground focus-within:ring-4 focus-within:ring-[#0055FF]/20 focus-within:border-[#0055FF] bg-background transition-colors" dir="ltr">
                              <span className="px-4 py-3 text-base font-semibold text-foreground bg-muted/30 border-r-2 border-foreground select-none">
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
                            <p className="text-[11px] text-muted-foreground mt-1">{t("profile.whatsappNotice")}</p>
                          </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                          <button
                            onClick={() => setBookingOpen(false)}
                            className="flex-1 border-2 border-foreground text-sm font-bold py-3 hover:bg-muted/40 transition-colors"
                          >
                            {t("common.cancel") || "Cancel"}
                          </button>
                          <button
                            onClick={handleBook}
                            disabled={isBooking || !name.trim() || phone.trim().length < 8}
                            className="flex-1 bg-[#0055FF] text-white text-sm font-bold py-3 hover:bg-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isBooking ? <IOSSpinner size={16} className="text-white" /> : t("profile.confirmBooking")}
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
      )}
    </>
  );
}
