"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import { Star, QrCode, Link2, MessageSquare, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className="w-3.5 h-3.5"
          fill={s <= rating ? "#f5a623" : "none"}
          stroke={s <= rating ? "#f5a623" : "#d1d5db"}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4 text-right">{label}</span>
      <Star className="w-3 h-3 text-[#f5a623] fill-[#f5a623] flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#f5a623] rounded-full transition-all duration-700"
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-4">{count}</span>
    </div>
  );
}

export default function FeedbackDashboard() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const feedback = useQuery(api.feedback.listFeedback, clerkId ? { clerkId } : "skip");
  const stats = useQuery(api.feedback.getFeedbackStats, clerkId ? { clerkId } : "skip");
  const storedQrUrl = useQuery(api.feedback.getFeedbackQrUrl, clerkId ? { clerkId } : "skip");
  const generateQr = useAction(api.feedbackActions.generateAndStoreFeedbackQr);

  const [isGenerating, setIsGenerating] = useState(false);

  const feedbackUrl = currentUser?.qrSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${currentUser.qrSlug}`
    : null;

  useEffect(() => {
    if (!clerkId || storedQrUrl !== null || isGenerating) return;
    
    // If we have no stored QR URL, generate it now
    async function initQr() {
      setIsGenerating(true);
      try {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        await generateQr({ clerkId, baseUrl });
      } catch (e) {
        console.error("Failed to generate QR", e);
      } finally {
        setIsGenerating(false);
      }
    }
    
    initQr();
  }, [clerkId, storedQrUrl, isGenerating, generateQr]);

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    label: String(r),
    count: (feedback ?? []).filter((f) => f.rating === r).length,
  }));
  const maxCount = Math.max(...ratingCounts.map((r) => r.count), 1);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Patient Feedback" description="Ratings collected from your QR code" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* QR Code Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-4 h-4 text-[#007AFF]" />
              <h2 className="text-sm font-semibold">Your Feedback QR Code</h2>
            </div>
            <div className="flex items-start gap-4">
              {storedQrUrl ? (
                <img
                  src={storedQrUrl}
                  alt="QR Code"
                  className="w-32 h-32 rounded-xl border border-border bg-white"
                />
              ) : isGenerating ? (
                <div className="w-32 h-32 rounded-xl bg-muted/40 flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                  <span className="text-[10px] text-muted-foreground font-medium">Generating...</span>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-muted/40 animate-pulse" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  Share this QR with patients at the end of each visit. They can leave a rating and comment anonymously.
                </p>
                {feedbackUrl && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(feedbackUrl);
                      toast.success("Link copied");
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#007AFF] hover:underline font-medium"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Copy feedback link
                  </button>
                )}
                {storedQrUrl && (
                  <a
                    href={storedQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 font-medium"
                  >
                    View / Download QR
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-[#f5a623]" />
              <h2 className="text-sm font-semibold">Rating Overview</h2>
            </div>
            {stats?.count === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback collected yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#f5a623]">
                    {stats?.average.toFixed(1) ?? "—"}
                  </p>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3 h-3"
                        fill={s <= Math.round(stats?.average ?? 0) ? "#f5a623" : "none"}
                        stroke={s <= Math.round(stats?.average ?? 0) ? "#f5a623" : "#d1d5db"}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stats?.count} reviews</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {ratingCounts.map((r) => (
                    <RatingBar key={r.label} label={r.label} count={r.count} max={maxCount} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback list */}
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#007AFF]" />
            All Reviews
            {feedback !== undefined && (
              <span className="text-xs text-muted-foreground font-normal">({feedback.length})</span>
            )}
          </h2>

          {feedback === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : feedback.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reviews yet. Share your QR code with patients!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((f, i) => (
                <motion.div
                  key={f._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5a623]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#f5a623]">
                          {f.patientName ? f.patientName.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.patientName ?? "Anonymous"}</p>
                        <StarRow rating={f.rating} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
                      {new Date(f.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed pl-11">
                      &ldquo;{f.comment}&rdquo;
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
