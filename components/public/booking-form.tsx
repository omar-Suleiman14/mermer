"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { Loader2, CheckCircle2, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  doctor: {
    qrSlug: string | null;
    workingHoursStart: number | null;
    workingHoursEnd: number | null;
    slotDurationMinutes: number;
    availableDays: string[];
  };
}

export function BookingForm({ doctor }: BookingFormProps) {
  const { dir, lang } = useI18n();
  const createAppointment = useMutation(api.appointments.createAppointment);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const [selectedDateMs, setSelectedDateMs] = useState<number>(startOfToday);
  const [selectedSlotMs, setSelectedSlotMs] = useState<number | null>(null);

  // 7 days picker
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const ts = startOfToday + i * 86400000;
      arr.push(ts);
    }
    return arr;
  }, [startOfToday]);

  const bookedSlots = useQuery(api.appointments.getAvailableSlots, { slug: doctor.qrSlug || "", date: selectedDateMs });

  const slots = useMemo(() => {
    if (doctor.workingHoursStart === null || doctor.workingHoursEnd === null) return [];
    const generated = [];
    // If "always open", default to 9am to 9pm for the grid
    const startHour = doctor.workingHoursStart === 0 && doctor.workingHoursEnd === 24 ? 9 : doctor.workingHoursStart;
    const endHour = doctor.workingHoursStart === 0 && doctor.workingHoursEnd === 24 ? 21 : doctor.workingHoursEnd;
    const duration = doctor.slotDurationMinutes || 30;
    
    let current = new Date(selectedDateMs);
    current.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
    
    const end = new Date(selectedDateMs);
    end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);
    
    while (current < end) {
      generated.push(current.getTime());
      current.setMinutes(current.getMinutes() + duration);
    }
    return generated;
  }, [selectedDateMs, doctor]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("20")) val = val.substring(2);
    if (val.startsWith("0")) val = val.substring(1);
    if (val.length > 10) val = val.substring(0, 10);
    setPhone(val);
  };

  const isSelectedDayAvailable = useMemo(() => {
    if (doctor.availableDays.length === 0) return true; // if not set, assume available
    const dayName = new Date(selectedDateMs).toLocaleDateString("en-US", { weekday: "short" });
    return doctor.availableDays.includes(dayName);
  }, [selectedDateMs, doctor.availableDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError(dir === "rtl" ? "يرجى إدخال الاسم" : "Please enter your name");
      return;
    }

    if (phone.length !== 10) {
      setError(dir === "rtl" ? "رقم الواتساب يجب أن يتكون من 10 أرقام" : "WhatsApp number must be 10 digits");
      return;
    }

    if (!selectedSlotMs) {
      setError(dir === "rtl" ? "يرجى اختيار وقت الموعد" : "Please select an appointment time");
      return;
    }

    try {
      setLoading(true);
      await createAppointment({
        doctorSlug: doctor.qrSlug || "",
        patientName: name.trim(),
        patientPhone: phone,
        patientAge: age ? parseInt(age, 10) : undefined,
        date: selectedSlotMs, 
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || (dir === "rtl" ? "حدث خطأ أثناء الحجز" : "Failed to book appointment"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-8 rounded-2xl flex flex-col items-center text-center space-y-4">
        <CheckCircle2 className="w-12 h-12" />
        <div>
          <h3 className="text-xl font-bold">{dir === "rtl" ? "تم استلام طلبك!" : "Request Received!"}</h3>
          <p className="mt-2 opacity-90 text-sm">
            {dir === "rtl" ? "سيتواصل معك فريق العيادة قريباً عبر الواتساب لتأكيد الموعد." : "The clinic team will contact you soon via WhatsApp to confirm your appointment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
      <div>
        <h3 className="text-xl font-bold text-foreground">
          {dir === "rtl" ? "احجز موعدك الآن" : "Book Your Appointment Now"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {dir === "rtl" ? "اختر اليوم والوقت المناسب لك" : "Choose a suitable day and time"}
        </p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Date Picker */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          {dir === "rtl" ? "اختر اليوم" : "Select Day"}
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2" dir="ltr">
          {days.map(ts => {
            const isSelected = selectedDateMs === ts;
            const d = new Date(ts);
            const isToday = ts === startOfToday;
            const dayName = d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short" });
            const dayNum = d.getDate();
            const monthName = d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { month: "short" });
            
            return (
              <button
                key={ts}
                type="button"
                onClick={() => { setSelectedDateMs(ts); setSelectedSlotMs(null); }}
                className={cn(
                  "shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-2xl border transition-all",
                  isSelected 
                    ? "bg-primary border-primary text-white shadow-md" 
                    : "bg-background border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-80">
                  {isToday ? (lang === "ar" ? "اليوم" : "Today") : dayName}
                </span>
                <span className={cn("text-xl font-bold leading-none mb-0.5", isSelected ? "text-white" : "text-foreground")}>
                  {dayNum}
                </span>
                <span className="text-[10px] font-medium opacity-80">{monthName}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          {dir === "rtl" ? "الأوقات المتاحة" : "Available Times"}
        </label>
        
        {!isSelectedDayAvailable ? (
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
            {dir === "rtl" ? "هذا اليوم غير متاح للحجز" : "This day is not available for booking"}
          </div>
        ) : slots.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
            {dir === "rtl" ? "لا توجد أوقات متاحة" : "No times available"}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map(ts => {
              const isReserved = bookedSlots?.includes(ts);
              const isSelected = selectedSlotMs === ts;
              const isPast = ts < Date.now();
              const disabled = isReserved || isPast;

              return (
                <button
                  key={ts}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedSlotMs(ts)}
                  className={cn(
                    "h-10 rounded-xl text-sm font-medium transition-all border",
                    isSelected 
                      ? "bg-primary border-primary text-white shadow-sm ring-2 ring-primary/20 ring-offset-1 dark:ring-offset-background" 
                      : disabled
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

      <div className="pt-2 border-t border-border"></div>

      {/* Patient Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {dir === "rtl" ? "الاسم الكامل" : "Full Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            placeholder={dir === "rtl" ? "أدخل اسمك" : "Enter your name"}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {dir === "rtl" ? "العمر" : "Age"}
            </label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
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
      </div>

      <button
        type="submit"
        disabled={loading || phone.length !== 10 || !name.trim() || !selectedSlotMs}
        className="w-full h-12 mt-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {dir === "rtl" ? "تأكيد الطلب" : "Confirm Request"}
      </button>
    </form>
  );
}
