
"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Star,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";

const LABELS_AR = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];
const LABELS_EN = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const COLORS = [
  "",
  "#0055FF",
  "#0055FF",
  "#0055FF",
  "#0055FF",
  "#0055FF",
];

export default function FeedbackPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { dir, lang } = useI18n();

  const doctor = useQuery(api.feedback.getDoctorInfoBySlug, { slug });
  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeRating = hovered || rating;
  const labels = lang === "ar" ? LABELS_AR : LABELS_EN;

  async function handleSubmit() {
    if (rating === 0) {
      toast.error(
        lang === "ar"
          ? "يرجى اختيار تقييم"
          : "Please select a rating"
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback({
        slug,
        rating,
        comment: comment.trim() || undefined,
        patientName: patientName.trim() || undefined,
      });

      setSubmitted(true);
    } catch {
      toast.error(
        lang === "ar"
          ? "فشل إرسال التقييم."
          : "Failed to submit. Please try again."
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
      <div
        className="min-h-screen bg-background flex items-center justify-center px-6"
        dir={dir}
      >
        <p className="text-muted-foreground">
          {lang === "ar"
            ? "صفحة التقييم غير موجودة."
            : "Rating page not found."}
        </p>
      </div>
    );
  }

  const profilePhotoUrl = (doctor as any)
    .profilePhotoUrl as string | null;

  return (
    <div
      dir={dir}
      className="min-h-screen h-screen bg-background text-foreground flex flex-col overflow-hidden"
    >
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-background border-b-2 border-foreground">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center justify-between">
          <Link
            href={`/doctors/${slug}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {dir === "rtl" ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}

            {lang === "ar"
              ? "الملف الشخصي"
              : "Doctor Profile"}
          </Link>

          <Link
            href="/"
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#0055FF] flex items-center justify-center">
              <span className="font-serif italic font-extrabold text-sm text-white">ibn sina</span>
            </div>

            <span className="font-serif font-bold text-lg tracking-tight">
              {lang === "ar" ? "ابن سينا" : "ibn sina"}
            </span>
          </Link>
        </div>
      </nav>

      {/* MAIN */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-6 px-4 sm:px-6 py-6 lg:py-10 items-center">
          {/* LEFT SIDE */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="hidden lg:flex flex-col justify-center"
          >
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-foreground text-background text-xs font-bold uppercase tracking-widest mb-6">
                <ShieldCheck className="w-4 h-4" />
                {lang === "ar"
                  ? "تقييم موثوق وآمن"
                  : "Trusted Patient Feedback"}
              </div>

              <h1 className="text-5xl sm:text-6xl font-serif font-extrabold tracking-tight leading-tight mb-6">
                {lang === "ar"
                  ? "ساعد الآخرين في اختيار الطبيب المناسب."
                  : "Help others choose the right doctor."}
              </h1>

              <p className="text-lg text-muted-foreground leading-relaxed">
                {lang === "ar"
                  ? "شارك تجربتك مع الطبيب بكل سهولة. تقييمك يساعد المرضى الآخرين ويحسن جودة الرعاية."
                  : "Share your experience in seconds. Your review helps other patients and improves care quality."}
              </p>

              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3 rtl:space-x-reverse">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-12 h-12 bg-muted border-2 border-foreground"
                    />
                  ))}
                </div>

                <div>
                  <p className="font-serif text-lg font-bold">
                    {lang === "ar"
                      ? "آلاف المرضى يثقون بابن سينا"
                      : "Thousands trust Ibn Sina"}
                  </p>

                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-4 h-4 fill-[#0055FF] text-[#0055FF]"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT SIDE */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="w-full flex items-center justify-center"
          >
            <div className="w-full max-w-xl">
              {/* Doctor Card */}
              <div className="bg-card border-2 border-foreground p-6 mb-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-muted flex items-center justify-center flex-shrink-0 border-2 border-foreground overflow-hidden">
                    {profilePhotoUrl ? (
                      <Image
                        src={profilePhotoUrl}
                        alt={doctor.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-serif font-extrabold text-[#0055FF]">
                        {doctor.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-serif text-2xl font-bold">
                        {lang === "ar"
                          ? `د. ${doctor.name}`
                          : `Dr. ${doctor.name}`}
                      </h2>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-foreground text-background">
                        <ShieldCheck className="w-3 h-3" />
                        {lang === "ar"
                          ? "موثّق"
                          : "Verified"}
                      </span>
                    </div>

                    {doctor.specialty && (
                      <p className="text-sm font-bold uppercase tracking-widest text-[#0055FF] mt-2">
                        {doctor.specialty}
                      </p>
                    )}

                    {doctor.clinicName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {doctor.clinicName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* FORM CARD */}
              <div className="bg-card border-2 border-foreground overflow-hidden">
                <div className="h-2 bg-[#0055FF]" />

                <div className="p-8 sm:p-10">
                  <AnimatePresence mode="wait">
                    {submitted ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-10 flex flex-col items-center text-center"
                      >
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>

                        <h2 className="text-3xl font-serif font-extrabold mb-4">
                          {lang === "ar"
                            ? "شكراً لك!"
                            : "Thank you!"}
                        </h2>

                        <p className="text-muted-foreground font-serif text-lg leading-relaxed max-w-sm">
                          {lang === "ar"
                            ? `تقييمك يساعد د. ${doctor.name} على تقديم تجربة أفضل للمرضى.`
                            : `Your review helps Dr. ${doctor.name} provide a better patient experience.`}
                        </p>

                        <Link
                          href={`/doctors/${slug}`}
                          className="mt-8 px-8 py-4 bg-foreground text-background text-xs font-bold uppercase tracking-widest inline-flex items-center justify-center hover:bg-[#0055FF] transition-colors"
                        >
                          {lang === "ar"
                            ? "العودة للملف الشخصي"
                            : "Back to Profile"}
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-7"
                      >
                        <div className="text-center">
                          <h1 className="text-3xl sm:text-4xl font-serif font-extrabold tracking-tight">
                            {lang === "ar"
                              ? "قيّم زيارتك"
                              : "Rate Your Visit"}
                          </h1>

                          <p className="text-base text-muted-foreground mt-4 font-serif">
                            {lang === "ar"
                              ? "كيف كانت تجربتك مع الطبيب؟"
                              : "How was your experience?"}
                          </p>
                        </div>

                        {/* STARS */}
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                onMouseEnter={() => setHovered(s)}
                                onMouseLeave={() => setHovered(0)}
                                onClick={() => setRating(s)}
                                className="transition-all hover:scale-110 active:scale-95"
                              >
                                <Star
                                  className="w-11 h-11 sm:w-12 sm:h-12 transition-all duration-150"
                                  fill={
                                    s <= activeRating
                                      ? COLORS[activeRating]
                                      : "none"
                                  }
                                  stroke={
                                    s <= activeRating
                                      ? COLORS[activeRating]
                                      : "#d1d5db"
                                  }
                                />
                              </button>
                            ))}
                          </div>

                          <AnimatePresence>
                            {activeRating > 0 && (
                              <motion.span
                                key={activeRating}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="font-bold text-sm"
                                style={{
                                  color: COLORS[activeRating],
                                }}
                              >
                                {labels[activeRating]}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* COMMENT */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-2">
                            {lang === "ar"
                              ? "تعليق"
                              : "Comment"}
                          </label>

                          <textarea
                            value={comment}
                            onChange={(e) =>
                              setComment(e.target.value)
                            }
                            rows={4}
                            dir={dir}
                            placeholder={
                              lang === "ar"
                                ? "شارك تجربتك..."
                                : "Share your experience..."
                            }
                            className="w-full border-2 border-foreground bg-background px-4 py-3 text-base outline-none focus:ring-4 focus:ring-[#0055FF]/20 focus:border-[#0055FF] transition-colors resize-none"
                          />
                        </div>

                        {/* NAME */}
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground block mb-2">
                            {lang === "ar"
                              ? "اسمك"
                              : "Your Name"}
                          </label>

                          <input
                            value={patientName}
                            onChange={(e) =>
                              setPatientName(e.target.value)
                            }
                            dir={dir}
                            placeholder={
                              lang === "ar"
                                ? "يبقى مجهولاً إن تركته فارغاً"
                                : "Stays anonymous if left blank"
                            }
                            className="w-full h-14 border-2 border-foreground bg-background px-4 text-base outline-none focus:ring-4 focus:ring-[#0055FF]/20 focus:border-[#0055FF] transition-colors"
                          />
                        </div>

                        {/* BUTTON */}
                        <button
                          onClick={handleSubmit}
                          disabled={submitting || rating === 0}
                          className="w-full h-14 bg-[#0055FF] hover:bg-foreground active:scale-[0.99] text-white font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                          {submitting ? (
                            <IOSSpinner size={18} />
                          ) : lang === "ar" ? (
                            "إرسال التقييم"
                          ) : (
                            "Submit Review"
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-5">
                {lang === "ar"
                  ? "مدعوم بواسطة "
                  : "Powered by "}

                <span className="font-serif font-bold text-[#0055FF]">
                  {lang === "ar" ? "ابن سينا" : "Ibn Sina"}
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}