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
  Loader2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

  const slots = useQuery(
    api.appointments.getAvailableSlots,
    doctor && doctor.tier === "premium" ? { slug, date: activeDayTs } : "skip"
  );

  // Booking form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const createAppointment = useMutation(api.appointments.createAppointment);

  async function handleBook() {
    if (!name.trim() || !phone.trim() || !selectedSlot) return;
    setIsBooking(true);
    try {
      await createAppointment({
        doctorSlug: slug,
        patientName: name.trim(),
        patientPhone: phone.trim(),
        patientAge: age ? Number(age) : undefined,
        date: selectedSlot,
      });
      setBooked(true);
    } catch (e) {
      toast.error("Booking failed. Please try again.");
    } finally {
      setIsBooking(false);
    }
  }

  if (doctor === undefined) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  if (!doctor || doctor.tier !== "premium") {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6">
        <div>
          <p className="text-lg font-semibold mb-2">Doctor not found</p>
          <p className="text-sm text-muted-foreground mb-6">This profile doesn&apos;t exist or is not publicly available.</p>
          <Link href="/" className="text-sm text-[#007AFF] hover:underline">← Back to search</Link>
        </div>
      </div>
    );
  }

  const initials = doctor.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#f0efea]/80 dark:bg-[#111110]/80 backdrop-blur-md border-b border-black/5 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <span className="font-bold text-[#007AFF]">Ibn Sina</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Doctor Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-8 border border-black/6 dark:border-white/6 shadow-sm"
        >
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-[#007AFF]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold tracking-tight">Dr. {doctor.name}</h1>
                <span className="text-xs font-semibold text-white bg-[#007AFF] px-2.5 py-0.5 rounded-full">
                  Premium
                </span>
              </div>
              {doctor.specialty && (
                <p className="text-base text-[#007AFF] font-medium mb-0.5">{doctor.specialty}</p>
              )}
              {doctor.credentials && (
                <p className="text-sm text-muted-foreground mb-3">{doctor.credentials}</p>
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
                  <a href={`tel:${doctor.phone}`} className="flex items-center gap-1.5 hover:text-[#007AFF] transition-colors">
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

        {/* Booking Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-6 border border-black/6 dark:border-white/6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#007AFF]" />
              Book an Appointment
            </h2>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setWeekOffset((o) => Math.max(0, o - 7)); setSelectedDay(null); }}
              disabled={weekOffset === 0}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1">
              {weekDays.map((dayTs) => {
                const d = new Date(dayTs);
                const isSelected = (selectedDay ?? weekDays[0]) === dayTs;
                const isPast = dayTs < new Date().setHours(0, 0, 0, 0);
                return (
                  <button
                    key={dayTs}
                    onClick={() => { setSelectedDay(dayTs); setSelectedSlot(null); }}
                    disabled={isPast}
                    className={`flex-shrink-0 flex flex-col items-center py-2 px-3 rounded-xl text-xs transition-all disabled:opacity-30 ${
                      isSelected
                        ? "bg-[#007AFF] text-white"
                        : "hover:bg-muted/60 text-muted-foreground"
                    }`}
                  >
                    <span className="font-medium">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <span className="text-base font-bold mt-0.5">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setWeekOffset((o) => o + 7); setSelectedDay(null); }}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mb-3">{formatDate(activeDayTs)}</p>

          {/* Time slots */}
          {slots === undefined ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading slots…
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available slots for this day.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {slots.map((slotTs) => (
                <button
                  key={slotTs}
                  onClick={() => { setSelectedSlot(slotTs); setBookingOpen(true); }}
                  className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all border ${
                    selectedSlot === slotTs
                      ? "bg-[#007AFF] text-white border-[#007AFF]"
                      : "border-border hover:border-[#007AFF]/40 hover:text-[#007AFF]"
                  }`}
                >
                  {formatTime(slotTs)}
                </button>
              ))}
            </div>
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
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !booked && setBookingOpen(false)}
            />
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
                    <h3 className="font-bold text-lg mb-2">Appointment Requested!</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Dr. {doctor.name} · {formatTime(selectedSlot)}
                    </p>
                    <p className="text-sm text-muted-foreground">{formatDate(selectedSlot)}</p>
                    <p className="text-xs text-muted-foreground mt-4 max-w-xs">
                      You&apos;ll receive a WhatsApp confirmation message from the clinic.
                    </p>
                    <button
                      onClick={() => { setBookingOpen(false); setBooked(false); setSelectedSlot(null); }}
                      className="mt-6 text-sm text-[#007AFF] hover:underline font-medium"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <h3 className="font-bold text-base mb-0.5">Book Appointment</h3>
                      <p className="text-xs text-muted-foreground">
                        Dr. {doctor.name} · {formatTime(selectedSlot)} · {formatDate(selectedSlot)}
                      </p>
                    </div>

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
                        <label className="text-xs font-medium text-muted-foreground block mb-1">WhatsApp Phone *</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+20 1XX XXX XXXX"
                          type="tel"
                          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Age (optional)</label>
                        <input
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          placeholder="Your age"
                          type="number"
                          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                        />
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
                        disabled={isBooking || !name.trim() || !phone.trim()}
                        className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Booking"}
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
