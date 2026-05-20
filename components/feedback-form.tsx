"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Star, CheckCircle2, ShieldCheck, MessageSquare, Award, ThumbsUp } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

interface FeedbackFormProps {
  slug: string;
  doctorName: string;
}

export function FeedbackForm({ slug, doctorName }: FeedbackFormProps) {
  const { lang, dir } = useI18n();
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

  return (
    <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-start">
      {/* Main Review Form Card (Left/Main Column) */}
      <div className="md:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-5 sm:p-8 shadow-md">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5 border border-emerald-500/25">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-slate-900 dark:text-white">
                {lang === "ar" ? "شكراً لك!" : "Thank you!"}
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-sm text-sm">
                {lang === "ar"
                  ? `تم إرسال تقييمك بنجاح لمساعدة د. ${doctorName} في تقديم أفضل رعاية.`
                  : `Your review has been successfully submitted to help Dr. ${doctorName} provide better care.`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {lang === "ar" ? "اترك تقييماً" : "Leave a Review"}
                </h3>
                <p className="text-muted-foreground mt-2 text-xs">
                  {lang === "ar" ? "انقر على النجوم لتقييم زيارتك" : "Click stars to rate your visit"}
                </p>
              </div>

              {/* Star Rating Grid */}
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-1 sm:gap-2">
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
                          "w-8 h-8 sm:w-10 sm:h-10 transition-all",
                          s <= activeRating 
                            ? "text-amber-400 fill-amber-400 drop-shadow-sm" 
                            : "text-slate-300 dark:text-zinc-700"
                        )}
                        strokeWidth={s <= activeRating ? 0 : 1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground font-medium">
                {lang === "ar" ? "شارك تفاصيل تجربتك مع الطبيب" : "Share your review about your medical consultation"}
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                  {lang === "ar" ? "التعليق (اختياري)" : "Comment (optional)"}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  dir={dir}
                  placeholder={lang === "ar" ? "اكتب تعليقك هنا بالتفصيل..." : "Write your detailed feedback here..."}
                  className="w-full rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/10 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
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
                  className="w-full h-11 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full h-12 rounded-lg bg-primary hover:bg-primary/95 text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center shadow-md shadow-primary/10"
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

      {/* Guidelines / Informative Column (Right Column) */}
      <div className="md:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-lg p-5 sm:p-8 shadow-md space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
          </div>
          <h4 className="font-bold text-slate-900 dark:text-white text-base">
            {lang === "ar" ? "لماذا تقييمك مهم؟" : "Why Your Feedback Matters"}
          </h4>
        </div>

        <div className="space-y-5 text-sm text-slate-600 dark:text-zinc-400">
          <div className="flex gap-3">
            <Award className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                {lang === "ar" ? "تمكين المرضى الآخرين" : "Empower Other Patients"}
              </h5>
              <p className="text-xs leading-relaxed">
                {lang === "ar" 
                  ? "تساعد مراجعتك الصادقة المرضى الآخرين في اتخاذ قرارات صحية واعية ومطمئنة."
                  : "Your honest review helps other patients make informed and confident healthcare choices."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <ThumbsUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                {lang === "ar" ? "تحسين جودة الخدمة" : "Enhance Care Quality"}
              </h5>
              <p className="text-xs leading-relaxed">
                {lang === "ar"
                  ? "تساعد الآراء البناءة الأطباء على تطوير أسلوب تقديم الرعاية وتحسين تجربة العيادة."
                  : "Constructive feedback assists doctors in developing their care services and clinic environment."}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white text-xs mb-1">
                {lang === "ar" ? "تقييمات آمنة وموثوقة" : "Safe & Authentic Reviews"}
              </h5>
              <p className="text-xs leading-relaxed">
                {lang === "ar"
                  ? "جميع المشاركات سرية وتخضع لمعايير الأمان لحماية بياناتك الشخصية."
                  : "All submissions are confidential and secured under strict privacy standards to protect your identity."}
              </p>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-muted-foreground">
            {lang === "ar" ? "مدعوم بواسطة " : "Powered by "}
            <span className="font-bold text-primary">{lang === "ar" ? "مرمر" : "mermer"}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
