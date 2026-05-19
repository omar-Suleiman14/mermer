"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Star, CheckCircle2, ShieldCheck } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { PublicNav } from "@/components/public/public-nav";
import { formatDoctorTitle, translateSpecialty } from "@/lib/doctor-display";
import { cn } from "@/lib/utils";

export default function FeedbackPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { dir, lang, t } = useI18n();

  const doctor = useQuery(api.feedback.getDoctorInfoBySlug, { slug });
  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRating = hovered || rating;

  async function handleSubmit() {
    if (rating === 0) {
      toast.error(lang === "ar" ? "يرجى اختيار تقييم" : "Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({
        slug,
        rating,
        comment: comment.trim().slice(0, 1000) || undefined,
        patientName: patientName.trim().slice(0, 100) || undefined,
      });
      setSubmitted(true);
    } catch {
      toast.error(
        lang === "ar" ? "فشل إرسال التقييم." : "Failed to submit. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (doctor === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <IOSSpinner size={32} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={dir}>
        <PublicNav backHref="/find-a-doctor" backLabel={lang === "ar" ? "البحث عن طبيب" : "Find a Doctor"} />
        <p className="flex-1 flex items-center justify-center text-muted-foreground">
          {lang === "ar" ? "صفحة التقييم غير موجودة." : "Rating page not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background pb-8" dir={dir}>
      <PublicNav
        backHref={`/doctors/${slug}`}
        backLabel={lang === "ar" ? "الملف الشخصي" : "Doctor profile"}
      />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 flex flex-col">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 mb-4 sm:mb-6 flex items-center gap-5 shadow-sm shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-muted ring-1 ring-border shrink-0 relative shadow-sm">
            {doctor.profilePhotoUrl ? (
              <Image src={doctor.profilePhotoUrl} alt={doctor.name} fill className="object-cover" sizes="64px" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-primary">
                {doctor.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold truncate">
                {formatDoctorTitle(doctor.name, lang)}
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="w-3 h-3" />
                {lang === "ar" ? "موثّق" : "Verified"}
              </span>
            </div>
            {doctor.specialty && (
              <p className="text-sm text-primary font-medium mt-0.5">
                {translateSpecialty(t, doctor.specialty)}
              </p>
            )}
            {doctor.clinicName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{doctor.clinicName}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/[0.03] flex flex-col">
          <div className="h-1 bg-primary shrink-0" />
          <div className="p-4 sm:p-6 md:p-8 flex flex-col justify-center relative">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-8 flex flex-col items-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    {lang === "ar" ? "شكراً لك!" : "Thank you!"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed max-w-sm">
                    {lang === "ar"
                      ? `تقييمك يساعد د. ${doctor.name} على تحسين تجربة المرضى.`
                      : `Your review helps Dr. ${doctor.name} improve patient care.`}
                  </p>
                  <Link
                    href={`/doctors/${slug}`}
                    className="mt-8 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    {lang === "ar" ? "العودة للملف" : "Back to profile"}
                  </Link>
                </motion.div>
              ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4 sm:space-y-6 w-full max-w-lg mx-auto"
                  >
                  <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight">
                      {lang === "ar" ? "قيّم زيارتك" : "Rate your visit"}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {lang === "ar" ? "كيف كانت تجربتك؟" : "How was your experience?"}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseEnter={() => setHovered(s)}
                          onMouseLeave={() => setHovered(0)}
                          onClick={() => setRating(s)}
                          className="p-1 transition-transform hover:scale-110 active:scale-95"
                          aria-label={`${s} stars`}
                        >
                          <Star
                            className={cn(
                              "w-10 h-10 sm:w-11 sm:h-11 transition-colors",
                              s <= activeRating ? "text-primary fill-primary" : "text-muted-foreground/25"
                            )}
                            strokeWidth={s <= activeRating ? 0 : 1.5}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      {lang === "ar" ? "تعليق (اختياري)" : "Comment (optional)"}
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      dir={dir}
                      placeholder={lang === "ar" ? "شارك تجربتك..." : "Share your experience..."}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 sm:py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-2">
                      {lang === "ar" ? "اسمك (اختياري)" : "Your name (optional)"}
                    </label>
                    <input
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      maxLength={100}
                      dir={dir}
                      placeholder={
                        lang === "ar" ? "يبقى مجهولاً إن تُرك فارغاً" : "Stays anonymous if blank"
                      }
                      className="w-full h-12 rounded-2xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base transition-colors disabled:opacity-40 flex items-center justify-center shadow-sm"
                  >
                    {submitting ? (
                      <IOSSpinner size={18} />
                    ) : lang === "ar" ? (
                      "إرسال التقييم"
                    ) : (
                      "Submit review"
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 sm:mt-6 shrink-0">
          {lang === "ar" ? "مدعوم بواسطة " : "Powered by "}
          <span className="font-semibold text-primary">{lang === "ar" ? "مرمر" : "Marmar"}</span>
        </p>
      </main>
    </div>
  );
}
