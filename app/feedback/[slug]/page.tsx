"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { useState } from "react";
import { Star, CheckCircle2, ChevronRight } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import Link from "next/link";

const RATING_LABELS = ["", "ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"];

export default function FeedbackPage() {
  const params = useParams();
  const slug = params.slug as string;

  const doctor = useQuery(api.feedback.getDoctorInfoBySlug, { slug });
  const submitFeedback = useMutation(api.feedback.submitFeedback);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [patientName, setPatientName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      toast.error("يرجى اختيار تقييم");
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
      toast.error("فشل إرسال التقييم. يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  }

  if (doctor === undefined) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
        <IOSSpinner size={24} className="text-[#007AFF]" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6" dir="rtl">
        <p className="text-muted-foreground">صفحة التقييم غير موجودة.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex items-center justify-center px-6 py-12"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/doctors/${slug}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
            العودة للملف الشخصي
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-[#007AFF]">
              {doctor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold mb-1">قيّم زيارتك</h1>
          <p className="text-sm text-muted-foreground">
            د. {doctor.name}
            {doctor.specialty ? ` · ${doctor.specialty}` : ""}
          </p>
          {doctor.clinicName && (
            <p className="text-xs text-muted-foreground mt-0.5">{doctor.clinicName}</p>
          )}
        </div>

        <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl p-6 border border-black/6 dark:border-white/6 shadow-sm">
          {submitted ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#34c759]/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-[#34c759]" />
              </div>
              <h2 className="font-bold text-base mb-2">شكراً لك!</h2>
              <p className="text-sm text-muted-foreground">
                تقييمك يساعد د. {doctor.name} على تقديم تجربة أفضل.
              </p>
              <Link
                href={`/doctors/${slug}`}
                className="mt-5 text-sm text-[#007AFF] hover:underline font-medium"
              >
                العودة للملف الشخصي
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Star rating */}
              <div>
                <p className="text-sm font-medium mb-3 text-center">كيف كانت زيارتك؟</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        className="w-9 h-9 transition-colors"
                        fill={s <= (hovered || rating) ? "#f5a623" : "none"}
                        stroke={s <= (hovered || rating) ? "#f5a623" : "#d1d5db"}
                      />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-xs text-[#007AFF] font-semibold mt-2">
                    {RATING_LABELS[rating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  تعليق <span className="font-normal">(اختياري)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="شاركنا تجربتك…"
                  rows={3}
                  dir="rtl"
                  className="w-full px-4 py-3 text-sm bg-[#f0efea] dark:bg-[#111110] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                />
              </div>

              {/* Name (optional) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  اسمك <span className="font-normal">(اختياري — يبقى مجهولاً إن تركته فارغاً)</span>
                </label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="الاسم الأول"
                  dir="rtl"
                  className="w-full px-4 py-2.5 text-sm bg-[#f0efea] dark:bg-[#111110] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full bg-[#007AFF] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <IOSSpinner size={16} className="text-white" /> : "إرسال التقييم"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          مدعوم بـ <span className="text-[#007AFF] font-medium">ابن سينا</span>
        </p>
      </motion.div>
    </div>
  );
}
