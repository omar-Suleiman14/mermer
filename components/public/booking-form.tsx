"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, CheckCircle2 } from "lucide-react";
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

interface BookingFormProps {
  doctor?: {
    qrSlug: string | null;
    workingHoursStart: number | null;
    workingHoursEnd: number | null;
    slotDurationMinutes: number;
    availableDays: string[];
  };
}

export function BookingForm({ doctor }: BookingFormProps) {
  const { dir } = useI18n();
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

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const bookedSlots = useQuery(
    api.appointments.getAvailableSlots,
    safeDoctor?.qrSlug ? { slug: safeDoctor.qrSlug, date: startOfToday } : "skip"
  );

  const slots = useMemo(() => {
    if (!safeDoctor || safeDoctor.workingHoursStart === null || safeDoctor.workingHoursEnd === null) return [];

    const generated: number[] = [];
    const startHour = safeDoctor.workingHoursStart === 0 && safeDoctor.workingHoursEnd === 24 ? 9 : safeDoctor.workingHoursStart;
    const endHour = safeDoctor.workingHoursStart === 0 && safeDoctor.workingHoursEnd === 24 ? 21 : safeDoctor.workingHoursEnd;
    const duration = safeDoctor.slotDurationMinutes || 30;

    let current = new Date(startOfToday);
    current.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

    const end = new Date(startOfToday);
    end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

    while (current < end) {
      generated.push(current.getTime());
      current.setMinutes(current.getMinutes() + duration);
    }
    return generated;
  }, [safeDoctor, startOfToday]);

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

    if (!name.trim()) {
      setError(dir === "rtl" ? "يرجى إدخال الاسم الكامل" : "Please enter your full name");
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
    } catch (err: any) {
      setError(err?.message || (dir === "rtl" ? "حدث خطأ أثناء الحجز" : "Failed to book appointment"));
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
            {dir === "rtl"
              ? "سيتواصل معك فريق العيادة قريباً عبر الواتساب لتأكيد الموعد."
              : "The clinic team will contact you soon via WhatsApp to confirm your appointment."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 bg-card border border-border p-6 sm:p-8 rounded-3xl shadow-sm">
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
              const isPast = ts < Date.now();
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{dir === "rtl" ? "تأكيد الحجز" : "Confirm Booking"}</DrawerTitle>
            <DrawerDescription>
              {selectedSlotMs
                ? new Date(selectedSlotMs).toLocaleString("en-US", {
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

          <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-4">
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
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {dir === "rtl" ? "تأكيد الطلب" : "Confirm Request"}
            </button>
          </form>
        </DrawerContent>
      </Drawer>
    </>
  );
}
