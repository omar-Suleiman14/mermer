"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import { Star, QrCode, Link2, MessageSquare } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/client";

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
      <span className="text-xs text-muted-foreground w-4 text-end">{label}</span>
      <Star className="w-3 h-3 text-[#f5a623] fill-[#f5a623] shrink-0" />
      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#f5a623] rounded-full transition-all duration-700"
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-4 text-start">{count}</span>
    </div>
  );
}

export default function FeedbackDashboard() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();
  const dateLocale = lang === "ar" ? "ar-EG" : "en-US";
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
      <PageHeader title={t("feedback.title")} description={t("feedback.subtitle")} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-4 h-4 text-[#007AFF]" />
              <h2 className="text-sm font-semibold">{t("feedback.qrTitle")}</h2>
            </div>
            <div className="flex items-start gap-4">
              {storedQrUrl ? (
                <img
                  src={storedQrUrl}
                  alt={t("feedback.qrAlt")}
                  className="w-32 h-32 rounded-xl border border-border bg-white"
                />
              ) : isGenerating ? (
                <div className="w-32 h-32 rounded-xl bg-muted/40 flex flex-col items-center justify-center">
                  <IOSSpinner size={24} color="var(--muted-foreground)" className="mb-2" />
                  <span className="text-[10px] text-muted-foreground font-medium">{t("feedback.generating")}</span>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl bg-muted/40 animate-pulse" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{t("feedback.qrShareHint")}</p>
                {feedbackUrl && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(feedbackUrl);
                      toast.success(t("feedback.linkCopied"));
                    }}
                    className="flex items-center gap-1.5 text-xs text-[#007AFF] hover:underline font-medium cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    {t("feedback.copyLink")}
                  </button>
                )}
                {storedQrUrl && (
                  <a
                    href={storedQrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 font-medium"
                  >
                    {t("feedback.viewQr")}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-[#f5a623]" />
              <h2 className="text-sm font-semibold">{t("feedback.ratingOverview")}</h2>
            </div>
            {stats?.count === 0 ? (
              <p className="text-sm text-muted-foreground">{t("feedback.noStatsYet")}</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-[#f5a623]">{stats?.average.toFixed(1) ?? "—"}</p>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("feedback.reviewsCount").replace("{count}", String(stats?.count ?? 0))}
                  </p>
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

        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-[#007AFF]" />
            {t("feedback.allReviews")}
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
              <p className="text-sm text-muted-foreground">{t("feedback.noReviewsYet")}</p>
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
                      <div className="w-8 h-8 rounded-full bg-[#f5a623]/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#f5a623]">
                          {f.patientName ? f.patientName.charAt(0).toUpperCase() : "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{f.patientName ?? t("feedback.anonymous")}</p>
                        <StarRow rating={f.rating} />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {new Date(f.createdAt).toLocaleDateString(dateLocale, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed ps-11">
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
