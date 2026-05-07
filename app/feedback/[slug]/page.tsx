"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";

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
      toast.error("Please select a rating");
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
      toast.error("Failed to submit feedback");
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
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6">
        <p className="text-muted-foreground">Feedback page not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea] flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-[#007AFF]">
              {doctor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold mb-1">Rate Your Visit</h1>
          <p className="text-sm text-muted-foreground">
            Dr. {doctor.name}
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
              <h2 className="font-bold text-base mb-2">Thank you!</h2>
              <p className="text-sm text-muted-foreground">
                Your feedback helps Dr. {doctor.name} improve.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Star rating */}
              <div>
                <p className="text-sm font-medium mb-3 text-center">How was your visit?</p>
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
                  <p className="text-center text-xs text-muted-foreground mt-2">
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                  </p>
                )}
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Comment <span className="font-normal">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience…"
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-[#f0efea] dark:bg-[#111110] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                />
              </div>

              {/* Name (optional) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Your name <span className="font-normal">(optional — stays anonymous if blank)</span>
                </label>
                <input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="First name"
                  className="w-full px-4 py-2.5 text-sm bg-[#f0efea] dark:bg-[#111110] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="w-full bg-[#007AFF] text-white text-sm font-semibold py-3 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <IOSSpinner size={16} className="text-white" /> : "Submit Feedback"}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by <span className="text-[#007AFF] font-medium">Ibn Sina</span>
        </p>
      </motion.div>
    </div>
  );
}
