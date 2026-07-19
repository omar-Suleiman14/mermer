"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "./user-provider";
import { getFailedEntries, retryEntry, discardEntry } from "@/lib/offline/syncQueue";
import { getSyncEngine } from "@/lib/offline/syncEngine";
import { useI18n } from "@/lib/i18n/client";

const POLL_INTERVAL_MS = 30_000;

/**
 * FailedSyncNotifier — surfaces permanently failed offline sync operations so
 * clinical writes are never silently lost.
 *
 * Each failed queue entry raises a persistent toast with the error details and
 * a retry action. Entries stay in the queue until the user retries them or
 * explicitly discards them — they are never auto-purged.
 */
export function FailedSyncNotifier() {
  const { clerkId } = useCurrentUser();
  const { lang } = useI18n();
  const notifiedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!clerkId) return;

    let cancelled = false;

    const check = async () => {
      try {
        const failed = await getFailedEntries(clerkId);
        if (cancelled) return;

        for (const entry of failed) {
          if (entry.id === undefined) continue;
          if (notifiedKeys.current.has(entry.idempotencyKey)) continue;
          notifiedKeys.current.add(entry.idempotencyKey);

          const entryId = entry.id;
          const key = entry.idempotencyKey;

          const isArabic = lang === "ar";
          const tableNames: Record<string, string> = {
            installments: isArabic ? "التقسيط" : "installments",
            visits: isArabic ? "المواعيد" : "visits",
            patients: isArabic ? "المرضى" : "patients",
          };
          const friendlyTable = tableNames[entry.table] || entry.table;

          toast.error(isArabic ? `فشل مزامنة (${friendlyTable})` : `Sync Failed (${friendlyTable})`, {
            description: isArabic 
              ? "تعذر حفظ التغييرات بشكل دائم في الخادم السحابي بسبب مشكلة في الاتصال أو الخادم."
              : "Could not save your changes permanently to the cloud server due to a connection or server issue.",
            duration: Infinity,
            action: {
              label: isArabic ? "إعادة المحاولة" : "Retry",
              onClick: () => {
                void retryEntry(entryId).then(() => {
                  notifiedKeys.current.delete(key);
                  void getSyncEngine()?.manualSync();
                });
              },
            },
            cancel: {
              label: isArabic ? "تجاهل" : "Dismiss",
              onClick: () => {
                void discardEntry(entryId);
              },
            },
          });
        }
      } catch (err) {
        console.error("[FailedSyncNotifier] check failed:", err);
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [clerkId]);

  return null;
}
