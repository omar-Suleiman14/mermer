"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCcw, X, Wifi, WifiOff } from "lucide-react";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/client";

export function WhatsAppReconnectPrompt() {
  const { user } = useUser();
  const { dir, lang } = useI18n();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const getConnectionState = useAction(api.evolution.getConnectionState);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show when status is "disconnected" and Evolution was active
  const isDisconnected =
    currentUser?.isEvolutionActive &&
    currentUser?.evolutionStatus === "disconnected";

  // Reset dismissed state if it reconnects successfully then drops again
  useEffect(() => {
    if (isDisconnected) setDismissed(false);
  }, [isDisconnected]);

  const fetchQr = useCallback(async () => {
    if (!currentUser?._id || !currentUser?.evolutionInstanceName) return;
    setLoadingQr(true);
    try {
      const res = await getConnectionState({
        clinicId: currentUser._id,
        instanceName: currentUser.evolutionInstanceName,
      });
      if (res.qrCode) setQrCode(res.qrCode);
      else if (res.status === "open") {
        // Reconnected! Close the prompt.
        setDismissed(true);
      }
    } catch {
      // ignore
    } finally {
      setLoadingQr(false);
    }
  }, [currentUser, getConnectionState]);

  // Fetch QR as soon as the prompt appears
  useEffect(() => {
    if (isDisconnected && !dismissed) {
      fetchQr();
    }
  }, [isDisconnected, dismissed]);

  // Poll every 5 seconds to detect when user scanned and reconnected
  useEffect(() => {
    if (!isDisconnected || dismissed) return;
    const interval = setInterval(() => {
      // If status changed to "open" in DB, currentUser will update reactively.
      // Also call getConnectionState to force-check and update DB status.
      fetchQr();
    }, 6000);
    return () => clearInterval(interval);
  }, [isDisconnected, dismissed, fetchQr]);

  const show = isDisconnected && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative z-10 w-full max-w-sm bg-background rounded-2xl shadow-2xl border border-border overflow-hidden"
            dir={dir}
          >
            {/* Header */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900/50 px-5 py-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <WifiOff className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                  {lang === "ar" ? "انقطع اتصال الواتساب" : "WhatsApp Disconnected"}
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5 leading-relaxed">
                  {lang === "ar"
                    ? "امسح الكود بواتساب العيادة لإعادة الاتصال."
                    : "Scan the QR code from the clinic's WhatsApp to reconnect."}
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-amber-600 dark:text-amber-400 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Section */}
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                {qrCode ? (
                  <Image
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    width={200}
                    height={200}
                    className="w-48 h-48"
                  />
                ) : (
                  <div className="w-48 h-48 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                    <p className="text-xs text-muted-foreground">
                      {lang === "ar" ? "جاري تحميل الكود..." : "Loading QR code..."}
                    </p>
                  </div>
                )}
              </div>

              {/* Steps */}
              <ol className="text-xs text-muted-foreground space-y-1 w-full px-1 list-decimal list-inside">
                <li>
                  {lang === "ar"
                    ? "افتح واتساب على هاتف العيادة"
                    : "Open WhatsApp on the clinic's phone"}
                </li>
                <li>
                  {lang === "ar"
                    ? "اذهب إلى الأجهزة المرتبطة"
                    : "Go to Linked Devices"}
                </li>
                <li>
                  {lang === "ar" ? "امسح هذا الكود" : "Scan this QR code"}
                </li>
              </ol>

              {/* Actions */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={fetchQr}
                  disabled={loadingQr}
                  className="flex-1 h-9 flex items-center justify-center gap-2 text-sm font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loadingQr ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-4 h-4" />
                  )}
                  {lang === "ar" ? "تحديث الكود" : "Refresh Code"}
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="h-9 px-4 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-muted/40 transition-colors"
                >
                  {lang === "ar" ? "لاحقاً" : "Later"}
                </button>
              </div>

              <p className="text-[11px] text-muted-foreground/60 text-center">
                {lang === "ar"
                  ? "سيُغلق هذا تلقائياً عند الاتصال"
                  : "This will close automatically once reconnected"}
              </p>
            </div>

            {/* Animated connecting indicator */}
            <div className="px-5 pb-4 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {lang === "ar" ? "في انتظار الاتصال..." : "Waiting for connection..."}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
