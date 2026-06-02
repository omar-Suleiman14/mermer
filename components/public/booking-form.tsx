"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "convex/react";
import { Loader2, CheckCircle2, CalendarDays, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  };
}

export function BookingForm({ doctor }: BookingFormProps) {
  const { dir, lang } = useI18n();
  const isMobile = useIsMobile();
  const createAppointment = useMutation(api.appointments.createAppointment);
  const safeDoctor = doctor ?? null;

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSlotMs, setSelectedSlotMs] = useState<number | null>(null);
  
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
      const isAvailable = !safeDoctor?.availableDays?.length || safeDoctor.availableDays.includes(dayName);
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
      await createAppointment({
        doctorSlug: safeDoctor.qrSlug,
        patientName: name.trim(),
        patientPhone: phone,
        patientAge: age ? parseInt(age, 10) : undefined,
        date: selectedSlotMs,
      });
      setSuccess(true);
      setDrawerOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const cleanMsg = msg.replace(/\[.*?\]\s*/g, "").replace("ConvexError: ", "").replace("Uncaught Error: ", "").trim();
      
      if (cleanMsg.includes("Rate limit exceeded")) {
        setError(dir === "rtl" ? "لديك بالفعل 3 مواعيد قادمة. يرجى إلغاء أحدها قبل الحجز مرة أخرى." : "You already have 3 upcoming appointments. Please cancel one before booking again.");
      } else {
        setError(cleanMsg || (dir === "rtl" ? "حدث خطأ أثناء الحجز" : "Failed to book appointment"));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const waPhone = safeDoctor?.clinicPhone?.replace(/[^0-9]/g, "");
    // Formulate a pre-filled WhatsApp message
    const waMessage = encodeURIComponent(`Confirm my appointment on ${
      selectedSlotMs 
        ? new Date(selectedSlotMs).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }) 
        : ""
    } for ${name}`);
    const waLink = waPhone ? `https://wa.me/${waPhone}?text=${waMessage}` : null;

    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-8 rounded-2xl flex flex-col items-center text-center space-y-6">
        <CheckCircle2 className="w-16 h-16" />
        <div>
          <h3 className="text-2xl font-bold">{dir === "rtl" ? "تم استلام طلبك!" : "Request Received!"}</h3>
          <p className="mt-2 opacity-90 text-sm">
            {dir === "rtl"
              ? "يرجى تأكيد موعدك عبر الواتساب مع العيادة."
              : "Please confirm your appointment via WhatsApp with the clinic."}
          </p>
        </div>
        
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-xl bg-[#25D366] hover:bg-[#20b858] text-white font-bold transition-all flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.81 11.81 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413z"/>
            </svg>
            {dir === "rtl" ? "تأكيد موعدي عبر الواتساب" : "Confirm my appointment"}
          </a>
        )}
      </div>
    );
  }

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
                const isReserved = bookedSlots?.includes(ts);
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

      {/* Confirmation Modal/Drawer */}
      {mounted && isMobile ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{dir === "rtl" ? "تأكيد الحجز" : "Confirm Booking"}</DrawerTitle>
              <DrawerDescription>
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
              </DrawerDescription>
            </DrawerHeader>
            {renderFormContent()}
          </DrawerContent>
        </Drawer>
      ) : mounted && !isMobile ? (
        typeof document !== "undefined" && createPortal(
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
                  className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden"
                  dir={dir}
                >
                  <div className="flex items-center justify-between p-6 pb-2">
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
                  {renderFormContent()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      ) : null}
    </>
  );
}
