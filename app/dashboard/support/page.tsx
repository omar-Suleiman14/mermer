"use client";

import { useState, useEffect, Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n/client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { MessageCircle, Phone, Send, Trash2, X } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";

// ── User Support Chat Drawer ───────────────────────────────────────────────────

function UserSupportChatDrawer({
  clerkId,
  isAr,
  onClose,
}: {
  clerkId: string;
  isAr: boolean;
  onClose: () => void;
}) {
  const messages = useQuery(api.support.listUserSupportMessages, { clerkId });
  const sendMessage = useMutation(api.support.sendMessageToAdmin);
  const deleteMutation = useMutation(api.support.deleteSupportMessage);
  const [replyText, setReplyText] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    await sendMessage({ clerkId, message: replyText.trim() });
    setReplyText("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -40 : 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? -40 : 40 }}
      className={`fixed inset-y-0 ${isAr ? 'left-0 border-r' : 'right-0 border-l'} w-full max-w-sm bg-background border-border shadow-2xl z-50 flex flex-col`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card z-10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="font-bold text-sm">{isAr ? "المحادثة المباشرة" : "Live Chat"}</p>
            <p className="text-xs text-muted-foreground">{isAr ? "فريق الدعم" : "Support Team"}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4 flex flex-col bg-muted/20">
        {messages === undefined ? (
          <div className="flex items-center justify-center h-32 text-primary">
            <IOSSpinner size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <MessageCircle className="w-8 h-8 opacity-20" />
            <p className="text-sm">{isAr ? "لا توجد رسائل بعد" : "No messages yet"}</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg._id} className={`flex ${msg.fromAdmin ? 'justify-start' : 'justify-end'}`}>
              <div className={`group relative max-w-[85%] rounded-2xl p-3 text-sm ${msg.fromAdmin ? 'bg-white dark:bg-neutral-800 border border-border rounded-bl-sm shadow-sm' : 'bg-primary text-primary-foreground rounded-br-sm'}`}>
                <p className="whitespace-pre-wrap">{msg.message}</p>
                
                <div className={`flex items-center justify-between gap-3 mt-1 ${msg.fromAdmin ? 'text-muted-foreground' : 'text-primary-foreground/70'}`}>
                  <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  
                  {!msg.fromAdmin && (
                    <button 
                      onClick={() => deleteMutation({ messageId: msg._id })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-primary-foreground/20 text-primary-foreground"
                      title={isAr ? "حذف" : "Delete"}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {msg.reply && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-[10px] font-bold text-green-500 mb-1">{isAr ? "رد الدعم القديم:" : "Legacy Reply:"}</p>
                    <p className="whitespace-pre-wrap">{msg.reply}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-card border-t border-border flex items-end gap-2">
        <textarea
          className="flex-1 text-sm p-3 rounded-xl border border-border bg-background resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder={isAr ? "اكتب رسالتك..." : "Type a message..."}
          rows={1}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!replyText.trim()}
          className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
}

function SupportPageInner() {
  const { t, lang, dir } = useI18n();
  const isAr = lang === "ar";
  const { user, isLoaded } = useUser();
  const clerkId = user?.id ?? "";
  const searchParams = useSearchParams();

  // Auto-open chat drawer when navigated from a push notification (?chat=1)
  const [isChatOpen, setIsChatOpen] = useState(() => searchParams.get("chat") === "1");

  return (
    <div className="flex flex-col h-full bg-muted/20" dir={dir}>
      <PageHeader
        title={isAr ? "الدعم والمساعدة" : "Support"}
        description={isAr ? "تواصل معنا لأي استفسار أو مشكلة" : "Contact us for any questions or issues"}
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 pb-24">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Contact Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <a 
              href="https://wa.me/201035555282" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-green-500/50 hover:shadow-md transition-all group flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">{isAr ? "واتساب" : "WhatsApp"}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {isAr ? "تواصل معنا مباشرة عبر واتساب للحصول على مساعدة سريعة." : "Contact us directly via WhatsApp for quick support."}
                </p>
                <span dir="ltr" className="text-green-600 dark:text-green-500 font-semibold inline-block">
                  +20 10 3555 5282
                </span>
              </div>
            </a>

            <a 
              href="tel:+201035555282" 
              className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:border-[#007AFF]/50 hover:shadow-md transition-all group flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6 text-[#007AFF]" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">{isAr ? "اتصال هاتفي" : "Phone Call"}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {isAr ? "يمكنك الاتصال بنا في أوقات العمل الرسمية." : "You can call us during official working hours."}
                </p>
                <span dir="ltr" className="text-[#007AFF] font-semibold inline-block">
                  +20 10 3555 5282
                </span>
              </div>
            </a>
          </div>

          {/* Chat Launcher */}
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">{isAr ? "المحادثة المباشرة" : "Live Chat"}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isAr ? "تحدث مع فريق الدعم لحل مشكلتك فوراً." : "Chat with our support team to resolve your issue instantly."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <MessageCircle className="w-5 h-5" />
              {isAr ? "افتح المحادثة" : "Open Chat"}
            </button>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <UserSupportChatDrawer
            clerkId={clerkId}
            isAr={isAr}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportPageInner />
    </Suspense>
  );
}
