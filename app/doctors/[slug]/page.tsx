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
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
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
  const activeDayTs = selectedDay ?? weekDays[0];

  const bookedSlots = useQuery(
    api.appointments.getAvailableSlots,
    doctor && doctor.tier === "premium" ? { slug, date: activeDayTs } : "skip"
  );

  const takenTimestamps = new Set(bookedSlots ?? []);

  const daySlots = doctor
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

  // Booking form — no age field
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
          dateStr: `${formatDate(selectedSlot)} at ${formatTime(selectedSlot)}`,
        }),
      });
    } catch {
      // WhatsApp failure is non-blocking — booking already succeeded
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
      // Fire-and-forget WhatsApp confirmation
      sendWhatsApp(fullPhone);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("already booked")) {
        toast.error("This slot was just taken — please pick another.");
        setSelectedSlot(null);
        setBookingOpen(false);
      } else {
        toast.error("Booking failed. Please try again.");
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

  if (!doctor || doctor.tier !== "premium") {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-lg font-semibold mb-2">Doctor not found</p>
          <p className="text-sm text-muted-foreground mb-6">
            This profile doesn&apos;t exist or is not publicly available.
          </p>
          <Link href="/" className="text-sm text-[#007AFF] hover:underline">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  const initials = doctor.name.charAt(0).toUpperCase();
  const profilePhotoUrl = (doctor as any).profilePhotoUrl as string | null;

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <span className="font-bold text-[#007AFF] ml-auto">Ibn Sina</span>
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
                  alt={`Dr. ${doctor.name}`}
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
                  Dr. {doctor.name}
                </h1>
                {/* <span className="text-xs font-semibold text-white bg-[#007AFF] px-2.5 py-0.5 rounded-full">
                  Premium
                </span> */}
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
                  <span className="text-sm text-muted-foreground ml-1">
                    {feedbackStats.average.toFixed(1)} ({feedbackStats.count} reviews)
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {doctor.clinicName && (
                  <span className="font-medium text-foreground">{doctor.clinicName}</span>
                )}
                {doctor.clinicAddress && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {doctor.clinicAddress}
                  </span>
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
            <p className="font-semibold text-sm">Visited before?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Help others by sharing your experience.</p>
          </div>
          <Link
            href={`/feedback/${params.slug}`}
            className="flex-shrink-0 text-xs font-semibold text-[#FF9500] border border-[#FF9500]/30 px-3 py-1.5 rounded-lg hover:bg-[#FF9500]/10 transition-colors"
          >
            Leave a Review →
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
            Book an Appointment
          </h2>

          {/* Week navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setWeekOffset((o) => Math.max(0, o - 7)); setSelectedDay(null); setSelectedSlot(null); }}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1">
              {weekDays.map((dayTs) => {
                const d = new Date(dayTs);
                const isSelected = (selectedDay ?? weekDays[0]) === dayTs;
                const isPast = dayTs < startOfDay(Date.now());
                return (
                  <button
                    key={dayTs}
                    onClick={() => { setSelectedDay(dayTs); setSelectedSlot(null); }}
                    disabled={isPast}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl text-xs transition-all disabled:opacity-30 ${
                      isSelected ? "bg-[#007AFF] text-white" : "hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setWeekOffset((o) => o + 7); setSelectedDay(null); setSelectedSlot(null); }}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-4 font-medium">{formatDate(activeDayTs)}</p>

          {/* Slots */}
          {bookedSlots === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IOSSpinner size={16} /> Loading slots…
            </div>
          ) : daySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots available for this day.</p>
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
                      title={isTaken ? "Slot taken" : undefined}
                      className={`py-2.5 px-1 rounded-xl text-xs font-semibold transition-all border flex flex-col items-center gap-0.5 ${
                        isTaken
                          ? "border-border/40 bg-muted/40 text-muted-foreground/40 cursor-not-allowed"
                          : isSelected
                          ? "bg-[#007AFF] text-white border-[#007AFF] shadow-sm"
                          : "border-border hover:border-[#007AFF]/60 hover:text-[#007AFF] hover:bg-[#007AFF]/5 cursor-pointer"
                      }`}
                    >
                      {formatTime(ts)}
                      {isTaken && <span className="text-[9px]">Taken</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                <span className="inline-block w-3 h-3 rounded bg-muted/40 border border-border/40 mr-1 align-middle" />
                Greyed slots are taken. Tap an available slot to book.
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
                    <h3 className="font-bold text-lg mb-2">Booking Confirmed! 🎉</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Dr. {doctor.name} · {formatTime(selectedSlot)}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedSlot)}</p>
                    <p className="text-xs text-muted-foreground mt-4 max-w-xs">
                      A WhatsApp confirmation has been sent to your number.
                    </p>
                    <button
                      onClick={() => { setBookingOpen(false); setBooked(false); setSelectedSlot(null); setName(""); setPhone(""); }}
                      className="mt-6 text-sm text-[#007AFF] hover:underline font-medium"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Mini doctor card */}
                    <div className="flex items-center gap-3 mb-5 p-3 bg-muted/30 rounded-xl">
                      {profilePhotoUrl ? (
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                          <Image src={profilePhotoUrl} alt={`Dr. ${doctor.name}`} width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-[#007AFF]">{initials}</span>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">Dr. {doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(selectedSlot)} · {formatDate(selectedSlot)}</p>
                      </div>
                    </div>

                    <h3 className="font-bold text-base mb-4">Complete Your Booking</h3>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Full Name *</label>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">WhatsApp Number *</label>
                        <div className="flex items-center border border-border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#007AFF] bg-background">
                          <span className="px-3 py-2.5 text-sm font-semibold text-muted-foreground bg-muted/30 border-r border-border select-none">
                            +20
                          </span>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            placeholder="1035555282"
                            type="tel"
                            maxLength={10}
                            className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">We&apos;ll send a WhatsApp confirmation to this number.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setBookingOpen(false)}
                        className="flex-1 border border-border text-sm font-medium py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBook}
                        disabled={isBooking || !name.trim() || phone.trim().length < 8}
                        className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBooking ? <IOSSpinner size={16} className="text-white" /> : "Confirm Booking"}
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
