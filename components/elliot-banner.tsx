"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, LinkIcon, Unlink, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BOT_USERNAME = "Elliot_abot";

export function ElliotBanner() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const status = useQuery(
    api.telegram.getTelegramStatus,
    clerkId ? { clerkId } : "skip"
  );

  const unlinkTelegram = useMutation(api.telegram.unlinkTelegram);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    if (!clerkId) return;
    setRevoking(true);
    try {
      await unlinkTelegram({ clerkId });
      toast.success("تم فصل إليوت عن حسابك");
    } catch {
      toast.error("فشل الفصل، حاول مجدداً");
    } finally {
      setRevoking(false);
    }
  }

  // Don't render until we know the status
  if (!status) return null;

  const connectUrl = `https://t.me/${BOT_USERNAME}?start=connect`;

  return (
    <AnimatePresence mode="wait">
      {status.linked ? (
        <motion.div
          key="connected"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-[#34c759]/20 bg-[#34c759]/6 dark:bg-[#34c759]/8"
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34c759]/15 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-[#34c759]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-[#1a1916] dark:text-[#f0efea]">
                  إليوت
                </span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#34c759] bg-[#34c759]/10 border border-[#34c759]/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  مرتبط
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                مساعدك الذكي جاهز على تيليجرام
              </p>
            </div>
          </div>

          {/* Right */}
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/8 disabled:opacity-50"
          >
            {revoking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Unlink className="w-3.5 h-3.5" />
            )}
            إلغاء الربط
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="disconnected"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border border-[#007AFF]/15 bg-[#007AFF]/5 dark:bg-[#007AFF]/8"
        >
          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1916] dark:text-[#f0efea]">
                ربط إليوت بعيادتك
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                أدر عيادتك مباشرة من تيليجرام
              </p>
            </div>
          </div>

          {/* Right */}
          <a
            href={connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062cc] transition-colors px-3 py-1.5 rounded-xl whitespace-nowrap"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            ربط العيادة
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
