"use client";

import { useState, useEffect, useRef } from "react";
import { WifiOff, Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { useConnection } from "@/components/providers/ConnectionProvider";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Redesigned offline indicator — replaces the scary red banner with
 * a subtle, non-alarming status pill.
 *
 * States:
 * - Online + synced:    hidden (nothing to show)
 * - Offline:            Amber pill — "Working offline"
 * - Reconnecting/syncing: Blue pulsing pill — "Syncing N changes..."
 * - Just synced:        Brief green flash — "All synced ✓"
 */
export function OfflineWarning() {
  const { status, pendingSyncCount } = useConnection();
  const { lang, dir } = useI18n();
  const [showSyncComplete, setShowSyncComplete] = useState(false);
  const prevStatusRef = useRef(status);
  const prevCountRef = useRef(pendingSyncCount);

  // Show "All synced" briefly after reconnecting → online transition
  useEffect(() => {
    if (
      prevStatusRef.current === "reconnecting" &&
      status === "online" &&
      pendingSyncCount === 0
    ) {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 3000);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
    prevCountRef.current = pendingSyncCount;
  }, [status, pendingSyncCount]);

  const isOffline = status === "offline";
  const isReconnecting = status === "reconnecting" || pendingSyncCount > 0;
  const showIndicator = isOffline || isReconnecting || showSyncComplete;

  return (
    <AnimatePresence>
      {showIndicator && (
        <motion.div
          initial={{ y: -40, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-3 left-1/2 z-[9999] -translate-x-1/2"
          dir={dir}
        >
          {isOffline && (
            <div className="flex items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 text-white shadow-lg backdrop-blur-sm border border-amber-400/30">
              <CloudOff className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">
                {lang === "ar" ? "يعمل بدون إنترنت" : "Working offline"}
              </span>
              {pendingSyncCount > 0 && (
                <span className="bg-white/20 text-xs rounded-full px-2 py-0.5 font-semibold tabular-nums">
                  {pendingSyncCount}
                </span>
              )}
            </div>
          )}

          {isReconnecting && !isOffline && (
            <div className="flex items-center gap-2 rounded-full bg-blue-500/90 px-4 py-2 text-white shadow-lg backdrop-blur-sm border border-blue-400/30">
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              <span className="text-sm font-medium whitespace-nowrap">
                {lang === "ar"
                  ? `جاري المزامنة${pendingSyncCount > 0 ? ` (${pendingSyncCount})` : ""}...`
                  : `Syncing${pendingSyncCount > 0 ? ` ${pendingSyncCount} change${pendingSyncCount !== 1 ? "s" : ""}` : ""}...`}
              </span>
            </div>
          )}

          {showSyncComplete && !isOffline && !isReconnecting && (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-white shadow-lg backdrop-blur-sm border border-emerald-400/30"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">
                {lang === "ar" ? "تمت المزامنة ✓" : "All synced ✓"}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
