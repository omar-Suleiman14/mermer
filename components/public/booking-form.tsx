"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAction, useQuery } from "convex/react";
import { Loader2, CheckCircle2, CalendarDays, X, MessageSquare } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-mobile";
import { useIsMounted } from "@/hooks/use-is-mounted";
import { motion, AnimatePresence } from "framer-motion";

interface BookingFormProps {
  doctor?: {
    qrSlug: string | null;
    workingHoursStart: number | null;
    workingHoursEnd: number | null;
    slotDurationMinutes: number;
    availableDays: string[];
    clinicPhone?: string | null;
    blockedDates?: number[];
  };
}

export function BookingForm({ doctor }: BookingFormProps) {
  const { dir, lang } = useI18n();
  const isMobile = useIsMobile();
  const createAppointment = useAction(api.publicAppointments.createAppointment);
  const safeDoctor = doctor ?? null;

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSlotMs, setSelectedSlotMs] = useState<number | null>(null);
  const [pendingWaLink, setPendingWaLink] = useState<string | null>(null);
  const [bookedSlotMs, setBookedSlotMs] = useState<number | null>(null);
  const [bookedName, setBookedName] = useState("");
  
  // Date selection
  const [selectedDateMs, setSelectedDateMs] = useState<number>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  const mounted = useIsMounted();
  const [now] = useState(() => Date.now());

  const next7Days = useMemo(() => {
    const days = [];
    const today = new Date();
    
    let startOffset = 0;
    if (safeDoctor && safeDoctor.workingHoursEnd !== null) {
      const endHour = safeDoctor.workingHoursStart === 0 && safeDoctor.workingHoursEnd === 24 ? 21 : safeDoctor.workingHoursEnd;
      const currentHour = today.getHours() + today.getMinutes() / 60;
      if (currentHour >= endHour) {
        startOffset = 1;
      }
    }

    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i + startOffset);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const isAvailable = (!safeDoctor?.availableDays?.length || safeDoctor.availableDays.includes(dayName)) 
        && !(safeDoctor?.blockedDates || []).includes(d.getTime());
      days.push({
        ts: d.getTime(),
        date: d,
        isAvailable,
      });
    }
    return days;
  }, [safeDoctor]);

  // If today is not available, default to the first available day
  useEffect(() => {
    if (next7Days.length > 0) {
      const currentIsAvailable = next7Days.find(d => d.ts === selectedDateMs)?.isAvailable;
      if (!currentIsAvailable) {
        const firstAvail = next7Days.find(d => d.isAvailable);
        if (firstAvail) setTimeout(() => setSelectedDateMs(firstAvail.ts), 0);
      }
    }
  }, [next7Days, selectedDateMs]);

  const bookedSlots = useQuery(
    api.appointments.getAvailableSlots,
    safeDoctor?.qrSlug ? { slug: safeDoctor.qrSlug, date: selectedDateMs } : "skip"
  );

  const slots = useMemo(() => {
    if (!safeDoctor || safeDoctor.workingHoursStart === null || safeDoctor.workingHoursEnd === null) return [];

    const generated: number[] = [];
    const startHour = safeDoctor.workingHoursStart === 0 && safeDoctor.workingHoursEnd === 24 ? 9 : safeDoctor.workingHoursStart;
    const endHour = safeDoctor.workingHoursStart === 0 && safeDoctor.workingHoursEnd === 24 ? 21 : safeDoctor.workingHoursEnd;
    const duration = safeDoctor.slotDurationMinutes || 30;

    const current = new Date(selectedDateMs);
    current.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

    const end = new Date(selectedDateMs);
    end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

    while (current < end) {
      generated.push(current.getTime());
      current.setMinutes(current.getMinutes() + duration);
    }
    return generated;
  }, [safeDoctor, selectedDateMs]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("20")) val = val.substring(2);
    if (val.startsWith("0")) val = val.substring(1);
    if (val.length > 10) val = val.substring(0, 10);
    setPhone(val);
  };

  const openDrawerForSlot = (slot: number) => {
    setSelectedSlotMs(slot);
    setError("");
    setDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 2) {
      setError(dir === "rtl" ? "يجب أن يتكون الاسم من حرفين على الأقل" : "Please enter your full name (at least 2 characters)");
      return;
    }
    if (phone.length !== 10) {
      setError(dir === "rtl" ? "رقم الواتساب يجب أن يكون 10 أرقام" : "WhatsApp number must be 10 digits");
      return;
    }
    if (!selectedSlotMs) {
      setError(dir === "rtl" ? "يرجى اختيار وقت الموعد" : "Please select an appointment time");
      return;
    }
    if (!safeDoctor?.qrSlug) {
      setError(dir === "rtl" ? "الحجز غير متاح حالياً لهذا الطبيب" : "Booking is currently unavailable for this doctor");
      return;
    }

    try {
      setLoading(true);
      const parsedAge = age && !isNaN(Number(age)) ? parseInt(age, 10) : undefined;
      const result = await createAppointment({
        doctorSlug: safeDoctor.qrSlug,
        patientName: name.trim(),
        patientPhone: phone,
        patientAge: parsedAge,
        patientGender: gender !== "" ? gender : undefined,
        date: selectedSlotMs,
      });
      
      let waPhone = safeDoctor?.clinicPhone?.replace(/[^0-9]/g, "");
      if (waPhone) {
        if (waPhone.startsWith("0")) waPhone = "20" + waPhone.substring(1);
        else if (waPhone.length === 10 && !waPhone.startsWith("20")) waPhone = "20" + waPhone;
      }
      
      const dateStr = selectedSlotMs 
        ? new Date(selectedSlotMs).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) 
        : "";
        
      const waMessage = encodeURIComponent(
        dir === "rtl"
          ? `تأكيد موعدي يوم ${dateStr} باسم ${name}${result.queueNumber ? ` (رقم الدور: ${result.queueNumber})` : ""}`
          : `Confirm my appointment on ${dateStr} for ${name}${result.queueNumber ? ` (Slot Number: ${result.queueNumber})` : ""}`
      );
      const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMessage}` : null;

      // Store data for the success screen
      setBookedSlotMs(selectedSlotMs);
      setBookedName(name.trim());
      setQueueNumber(result.queueNumber ?? null);
      setPendingWaLink(waLink);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      let cleanMsg = msg.replace(/\[.*?\]\s*/g, "").replace("ConvexError: ", "").replace("Uncaught Error: ", "").trim();
      
      if (cleanMsg.includes("Invalid patient age")) {
        cleanMsg = dir === "rtl" ? "العمر المدخل غير صحيح" : "Invalid patient age";
      } else if (cleanMsg.includes("Invalid patient name")) {
        cleanMsg = dir === "rtl" ? "الاسم المدخل غير صحيح" : "Invalid patient name";
      } else if (cleanMsg.includes("Patient phone number is invalid")) {
        cleanMsg = dir === "rtl" ? "رقم الهاتف غير صحيح" : "Invalid phone number";
      }

      if (cleanMsg.includes("Rate limit exceeded")) {
        setError(dir === "rtl" ? "لديك بالفعل 3 مواعيد قادمة. يرجى إلغاء أحدها قبل الحجز مرة أخرى." : "You already have 3 upcoming appointments. Please cancel one before booking again.");
      } else {
        setError(cleanMsg || (dir === "rtl" ? "حدث خطأ أثناء الحجز" : "Failed to book appointment"));
      }
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4 sm:p-6 sm:pb-6">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {dir === "rtl" ? "الاسم الكامل" : "Full Name"}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          placeholder={dir === "rtl" ? "أدخل اسمك" : "Enter your name"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {dir === "rtl" ? "العمر" : "Age"}
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-left"
            placeholder="30"
            dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {dir === "rtl" ? "الجنس" : "Gender"}
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          >
            <option value="" disabled>{dir === "rtl" ? "اختر..." : "Select..."}</option>
            <option value="male">{dir === "rtl" ? "ذكر" : "Male"}</option>
            <option value="female">{dir === "rtl" ? "أنثى" : "Female"}</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {dir === "rtl" ? "رقم الواتساب" : "WhatsApp Number"}
          </label>
          <div className="relative flex items-center" dir="ltr">
            <span className="absolute left-4 text-muted-foreground text-sm font-medium">+20</span>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-left"
              placeholder="1012345678"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || phone.length !== 10 || !name.trim() || !selectedSlotMs || !safeDoctor?.qrSlug}
        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {dir === "rtl" ? "تأكيد الطلب" : "Confirm Request"}
      </button>
    </form>
  );

  if (!mounted) {
    return (
      <div className="space-y-6 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm animate-pulse">
        <div className="h-24 bg-muted/50 rounded-xl mb-6" />
        <div className="h-48 bg-muted/50 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
        
        {/* Days Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="w-4 h-4 text-primary" />
              {dir === "rtl" ? "اختر اليوم" : "Select Day"}
            </label>
            <span className="text-xs text-muted-foreground font-medium">
              {next7Days[0]?.date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((dayObj) => {
              const isSelected = selectedDateMs === dayObj.ts;
              const d = new Date(); d.setHours(0,0,0,0);
              const isToday = dayObj.ts === d.getTime();
              return (
                <button
                  key={dayObj.ts}
                  type="button"
                  onClick={() => setSelectedDateMs(dayObj.ts)}
                  disabled={!dayObj.isAvailable}
                  className={cn(
                    "flex flex-col items-center justify-center py-3 rounded-2xl border-2 transition-all duration-200 gap-1 relative",
                    !dayObj.isAvailable && "opacity-30 cursor-not-allowed border-transparent bg-muted/20",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105"
                      : dayObj.isAvailable && "bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5"
                  )}
                >
                  <span className={cn(
                    "text-[9px] font-bold tracking-wider uppercase",
                    isSelected ? "opacity-70" : "text-muted-foreground"
                  )}>
                    {dayObj.date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" })}
                  </span>
                  <span className="text-base font-bold leading-none">
                    {dayObj.date.getDate()}
                  </span>
                  {isToday && (
                    <span className={cn(
                      "absolute bottom-2 w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground/70" : "bg-primary"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-border" />

        {/* Slots */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-foreground">
            {dir === "rtl" ? "الأوقات المتاحة" : "Available Times"}
          </label>

          {slots.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
              {dir === "rtl" ? "لا توجد أوقات متاحة" : "No times available"}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map((ts) => {
                const isReserved = bookedSlots?.some(bookedTs => 
                  bookedTs >= ts && bookedTs < ts + (safeDoctor?.slotDurationMinutes || 30) * 60000
                );
                const isPast = ts < now;
                const disabled = isReserved || isPast;

                return (
                  <button
                    key={ts}
                    type="button"
                    disabled={disabled}
                    onClick={() => openDrawerForSlot(ts)}
                    className={cn(
                      "h-10 rounded-xl text-sm font-medium transition-all border",
                      disabled
                        ? "bg-muted/50 border-transparent text-muted-foreground/40 cursor-not-allowed"
                        : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-muted/50"
                    )}
                    dir="ltr"
                  >
                    {new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {drawerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md max-h-[90vh] flex flex-col bg-card rounded-3xl shadow-xl overflow-hidden"
                dir={dir}
              >
                {success ? (
                  /* ── Success Screen ── */
                  <div className="p-6 flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {dir === "rtl" ? "تم الحجز بنجاح!" : "Booking Submitted!"}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        {bookedSlotMs
                          ? new Date(bookedSlotMs).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                              weekday: "long",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : ""}
                      </p>
                    </div>

                    <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-start">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {dir === "rtl" ? "⚠️ مهم: أكّد الحجز عبر الواتساب" : "⚠️ Important: Confirm via WhatsApp"}
                      </p>
                      <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-1">
                        {dir === "rtl"
                          ? "حجزك قيد الانتظار. يرجى إرسال رسالة تأكيد عبر الواتساب خلال 15 دقيقة وإلا سيتم إلغاء الحجز تلقائياً."
                          : "Your booking is pending. Please send a confirmation message via WhatsApp within 15 minutes or it will be automatically cancelled."}
                      </p>
                    </div>

                    {pendingWaLink && (
                      <button
                        onClick={() => {
                          window.open(pendingWaLink!, "_blank");
                        }}
                        className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-3.5 rounded-2xl transition-colors text-base shadow-lg shadow-[#25D366]/20"
                      >
                        <MessageSquare className="w-5 h-5" />
                        {dir === "rtl" ? "أكّد عبر الواتساب" : "Confirm via WhatsApp"}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSuccess(false);
                        setPendingWaLink(null);
                        setBookedSlotMs(null);
                        setBookedName("");
                        setName("");
                        setPhone("");
                        setAge("");
                        setSelectedSlotMs(null);
                        setDrawerOpen(false);
                      }}
                      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {dir === "rtl" ? "إغلاق" : "Close"}
                    </button>
                  </div>
                ) : (
                  /* ── Form Screen ── */
                  <>
                    <div className="flex-none flex items-center justify-between p-6 pb-2">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          {dir === "rtl" ? "تأكيد الحجز" : "Confirm Booking"}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedSlotMs
                            ? new Date(selectedSlotMs).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => setDrawerOpen(false)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {renderFormContent()}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
