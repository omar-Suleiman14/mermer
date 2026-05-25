"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { Loader2, CheckCircle2 } from "lucide-react";

interface BookingFormProps {
  doctorSlug: string;
}

export function BookingForm({ doctorSlug }: BookingFormProps) {
  const { dir } = useI18n();
  const createAppointment = useMutation(api.appointments.createAppointment);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const normalizePhone = (p: string) => {
    let cleaned = p.replace(/\D/g, "");
    cleaned = cleaned.replace(/^0+/, "");
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!name.trim()) {
      setError(dir === "rtl" ? "يرجى إدخال الاسم" : "Please enter your name");
      return;
    }
    
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length !== 10) {
      setError(dir === "rtl" ? "رقم الواتساب يجب أن يتكون من 10 أرقام (بدون أصفار بالبداية)" : "WhatsApp number must be exactly 10 digits (without leading zeros)");
      return;
    }

    try {
      setLoading(true);
      await createAppointment({
        doctorSlug,
        patientName: name.trim(),
        patientPhone: normalizedPhone,
        patientAge: age ? parseInt(age, 10) : undefined,
        date: Date.now(), 
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
    <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-2xl shadow-sm">
      <h3 className="text-xl font-bold text-foreground mb-4">
        {dir === "rtl" ? "احجز موعدك الآن" : "Book Your Appointment Now"}
      </h3>
      
      {error && (
        <div className="p-3 bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 rounded-lg text-sm font-medium">
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
          onChange={e => setName(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          placeholder={dir === "rtl" ? "أدخل اسمك" : "Enter your name"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {dir === "rtl" ? "العمر" : "Age"}
        </label>
        <input
          type="number"
          value={age}
          onChange={e => setAge(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          placeholder={dir === "rtl" ? "أدخل عمرك" : "Enter your age"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {dir === "rtl" ? "رقم الواتساب" : "WhatsApp Number"}
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left"
          dir="ltr"
          placeholder="1012345678"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {dir === "rtl" ? "بدون أصفار بالبداية (مثال: 1012345678)" : "No leading zeros (e.g. 1012345678)"}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
        {dir === "rtl" ? "تأكيد الطلب" : "Confirm Request"}
      </button>
    </form>
  );
}
