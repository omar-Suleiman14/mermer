"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "./user-provider";
import { toast } from "sonner";
import { openWhatsApp } from "@/lib/scheduling";

export function FailedMessageNotifier() {
  const { clerkId } = useCurrentUser();
  const [mountedAt] = useState(() => Date.now());
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());

  const recentFailures = useQuery(
    api.whatsappAutomations.getRecentFailedMessages,
    clerkId ? { clerkId, since: mountedAt } : "skip"
  );

  useEffect(() => {
    if (!recentFailures) return;

    recentFailures.forEach((log) => {
      if (!notifiedIds.has(log._id)) {
        toast.error(`فشل إرسال رسالة واتساب إلى ${log.patientPhone}`, {
          description: log.error || "حدث خطأ غير معروف",
          duration: 10000, // 10 seconds to allow the user to click
          action: {
            label: "إرسال يدوياً",
            onClick: () => {
              openWhatsApp(log.patientPhone, log.messageText);
            },
          },
        });
        
        setNotifiedIds((prev) => {
          const next = new Set(prev);
          next.add(log._id);
          return next;
        });
      }
    });
  }, [recentFailures, notifiedIds]);

  return null;
}
