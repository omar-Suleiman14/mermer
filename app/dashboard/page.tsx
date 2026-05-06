"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  MessageCircle,
  CheckCheck,
  PlusCircle,
  User,
  TrendingUp,
  Crown,
  CalendarCheck,
  ClipboardList,
  Zap,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { AddToQueueDrawer } from "@/components/add-to-queue-drawer";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";

// ─── Free / Premium feature lists ────────────────────────────────────────────
const FREE_FEATURES = [
  { label: "Patient records & visit history", done: true },
  { label: "Smart drag-to-reorder queue", done: true },
  { label: "Manual WhatsApp reminders (1 tap)", done: true },
  { label: "Branded prescription PDFs", done: true },
  { label: "QR feedback page & ratings", done: true },
];
const PREMIUM_ONLY = [
  "Auto WhatsApp confirmation (YES/NO reply)",
  "Auto next-patient WhatsApp (no tap needed)",
  "Prescription PDF auto-sent after visit",
  "Public doctor profile in patient search",
  "Online appointment booking calendar",
];

// ─── Visits vs Appointments explainer ────────────────────────────────────────
// VISITS  = internal clinical records (stored per patient, contain Rx, notes, labs)
// APPOINTMENTS = patient-facing bookings from the public profile (premium)
// The QUEUE is the live daily workflow — it can be populated manually OR
// automatically when a confirmed appointment is due.
// Both visits and appointments end up in the patient's visit timeline.

export default function DashboardPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const queue = useQuery(api.queue.getTodayQueue, clerkId ? { clerkId } : "skip");
  const recentVisits = useQuery(api.visits.getRecentVisits, clerkId ? { clerkId, limit: 5 } : "skip");
  const stats = useQuery(api.visits.getVisitStats, clerkId ? { clerkId } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const upcomingAppts = useQuery(
    api.appointments.listUpcomingAppointments,
    clerkId ? { clerkId } : "skip"
  );

  const markDone = useMutation(api.queue.markDone);
  const markReminder = useMutation(api.queue.markReminderSent);

  const [addQueueOpen, setAddQueueOpen] = useState(false);

  const current = queue?.find((q) => q.status === "in-progress");
  const next = queue?.find(
    (q) => q.status === "waiting" && q.position === (current?.position ?? 0) + 1
  );
  const waiting = queue?.filter((q) => q.status === "waiting") ?? [];
  const showWhatsApp = !!current && waiting.length >= 1 && !!next;

  const isPremium = currentUser?.tier === "premium";

  function buildWhatsAppLink(phone: string, patientName: string) {
    const template =
      currentUser?.whatsappTemplate ??
      "Hello {{name}}, you are next in line at the clinic. Please make your way over now. Thank you!";
    const message = template.replace("{{name}}", patientName);
    const cleanPhone = phone.replace(/\D/g, "");
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  async function handleMarkDone(queueId: Id<"queue">) {
    try {
      await markDone({ clerkId, queueId });
      toast.success("Patient marked as done");
    } catch {
      toast.error("Failed to update queue");
    }
  }

  async function handleSendReminder(queueId: Id<"queue">, phone: string, name: string) {
    const link = buildWhatsAppLink(phone, name);
    window.open(link, "_blank");
    await markReminder({ clerkId, queueId });
  }

  const isLoading = queue === undefined || recentVisits === undefined || stats === undefined;

  const todayAppts = (upcomingAppts ?? []).filter((a) => {
    const d = new Date(a.date);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        description={`Good morning${currentUser?.name ? `, Dr. ${currentUser.name.split(" ")[0]}` : ""}`}
      >
        <button
          onClick={() => setAddQueueOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium bg-[#007AFF] text-white px-3 py-1.5 rounded-lg hover:bg-[#0062cc] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Add to Queue
        </button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">

        {/* ── Tier Banner (free users only) ── */}
        {!isLoading && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 mt-0.5 flex-shrink-0 text-yellow-300" />
              <div>
                <p className="font-bold text-sm">You&apos;re on the Free plan</p>
                <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                  Upgrade to Premium for automatic WhatsApp, online bookings, and your public profile.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/settings"
              className="flex-shrink-0 text-xs font-bold bg-white text-[#007AFF] px-4 py-2 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              See Premium →
            </Link>
          </motion.div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* ── TODAY'S QUEUE ── */}
            <div className="bg-card border border-border rounded-xl p-5 col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Today&apos;s Queue</h2>
                <Badge variant="secondary" className="text-xs">
                  {queue.filter((q) => q.status !== "done").length} active
                </Badge>
              </div>

              {queue.filter((q) => q.status !== "done").length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-2">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm mt-2">Queue is empty</p>
                  <button
                    onClick={() => setAddQueueOpen(true)}
                    className="mt-3 text-xs text-[#007AFF] hover:underline"
                  >
                    Add a patient
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {current && (
                    <div className="bg-[#007AFF]/8 border border-[#007AFF]/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-[#007AFF]">
                          Now Seeing
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" />
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">{current.patient?.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {current.patient?.age}y · {current.patient?.chronicConditions?.[0] ?? "No conditions"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarkDone(current._id)}
                          className="flex-shrink-0 text-[11px] font-semibold bg-[#34c759] text-white px-2.5 py-1 rounded-lg hover:bg-[#28a745] transition-colors"
                        >
                          Done ✓
                        </button>
                      </div>
                    </div>
                  )}

                  {next && (
                    <div className="bg-muted/40 rounded-xl p-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                        Next Up
                      </p>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{next.patient?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{next.patient?.age}y</p>
                        </div>
                        <button
                          onClick={() => handleMarkDone(next._id)}
                          className="flex-shrink-0 text-[11px] text-muted-foreground px-2 py-1 rounded-lg border border-border hover:border-[#007AFF] hover:text-[#007AFF] transition-colors"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}

                  {waiting.length > 2 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{waiting.length - 1} more waiting
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <Link href="/dashboard/queue" className="text-xs text-[#007AFF] hover:underline font-medium">
                  View full queue →
                </Link>
              </div>
            </div>

            {/* ── WHATSAPP REMINDER ── */}
            {showWhatsApp && next ? (
              <div className="bg-card border border-[#007AFF]/30 rounded-xl p-5 col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-[#007AFF]" />
                  </div>
                  <h2 className="text-sm font-semibold">WhatsApp Reminder</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Patient almost up:</p>
                <p className="font-semibold text-base mb-1">{next.patient?.name}</p>
                <p className="text-xs text-muted-foreground mb-4 font-mono">{next.patient?.phone}</p>
                {next.reminderSent ? (
                  <div className="flex items-center gap-2 bg-muted/50 text-muted-foreground text-sm font-medium py-2.5 px-4 rounded-lg">
                    <CheckCheck className="w-4 h-4 text-[#34c759]" />
                    Reminder Sent ✓
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      handleSendReminder(
                        next._id as Id<"queue">,
                        next.patient?.phone ?? "",
                        next.patient?.name ?? ""
                      )
                    }
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm py-2.5 px-4 rounded-lg hover:bg-[#1ebe5d] transition-colors shadow-sm"
                  >
                    <WhatsAppIcon />
                    Send on WhatsApp
                  </button>
                )}
              </div>
            ) : (
              <QuickStatsCard stats={stats} />
            )}

            {showWhatsApp && <QuickStatsCard stats={stats} />}

            {/* ── UPCOMING APPOINTMENTS (premium shows real data, free shows promo) ── */}
            {isPremium ? (
              <div className="bg-card border border-border rounded-xl p-5 col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarCheck className="w-4 h-4 text-[#007AFF]" />
                  <h2 className="text-sm font-semibold">Today&apos;s Appointments</h2>
                  {todayAppts.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">{todayAppts.length}</Badge>
                  )}
                </div>
                {todayAppts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No online appointments today</p>
                ) : (
                  <div className="space-y-2">
                    {todayAppts.slice(0, 5).map((a) => (
                      <div key={a._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.patientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(a.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          a.status === "confirmed"
                            ? "bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border">
                  <Link href="/dashboard/appointments" className="text-xs text-[#007AFF] hover:underline font-medium">
                    View all appointments →
                  </Link>
                </div>
              </div>
            ) : (
              /* Free users: show premium features teaser */
              <PremiumTeaserCard />
            )}

            {/* ── RECENT PATIENTS ── */}
            <div className="bg-card border border-border rounded-xl p-5 col-span-1 md:col-span-2 xl:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-4 h-4 text-[#007AFF]" />
                <h2 className="text-sm font-semibold">Recent Visits</h2>
              </div>
              {recentVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No visits yet</p>
              ) : (
                <div className="space-y-2">
                  {recentVisits.map((v) => (
                    <Link
                      key={v._id}
                      href={`/dashboard/patients/${v.patientId}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-[#007AFF]">
                          {(v.patient?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-[#007AFF] transition-colors">
                          {v.patient?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {v.reasonForVisit ?? "Visit recorded"}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <Link href="/dashboard/patients" className="text-xs text-[#007AFF] hover:underline font-medium">
                  View all patients →
                </Link>
              </div>
            </div>

            {/* ── HOW IT ALL CONNECTS (visits vs appointments explained) ── */}
            <div className="bg-card border border-border rounded-xl p-5 col-span-1 md:col-span-2 xl:col-span-2">
              <h2 className="text-sm font-semibold mb-4">How the workflow connects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-[#007AFF]" />
                    </div>
                    <span className="font-semibold text-xs">Queue</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your live daily list. Add patients manually or they appear automatically when an appointment is confirmed. Drag to reorder, mark done, send WhatsApp alerts.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-[#34c759]/10 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5 text-[#34c759]" />
                    </div>
                    <span className="font-semibold text-xs">Visits</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clinical records attached to a patient. Every time you mark a queue patient as done, a visit is created — recording the date, reason, prescription photo, notes, and labs.
                  </p>
                </div>
                <div className={`rounded-xl p-4 ${isPremium ? "bg-muted/30" : "bg-[#f5a623]/5 border border-[#f5a623]/20"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-[#f5a623]/10 flex items-center justify-center">
                      <CalendarCheck className="w-3.5 h-3.5 text-[#f5a623]" />
                    </div>
                    <span className="font-semibold text-xs">Appointments</span>
                    {!isPremium && (
                      <span className="text-[9px] font-bold text-[#f5a623] bg-[#f5a623]/10 px-1.5 py-0.5 rounded-full border border-[#f5a623]/30 ml-auto">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Online bookings from patients who find you on the Ibn Sina landing page. They pick a slot, get a WhatsApp confirmation, and appear in your queue automatically on the day.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <AddToQueueDrawer open={addQueueOpen} onOpenChange={setAddQueueOpen} clerkId={clerkId} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function QuickStatsCard({ stats }: { stats?: { today: number; week: number; month: number } }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 col-span-1">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-[#007AFF]" />
        <h2 className="text-sm font-semibold">Quick Stats</h2>
      </div>
      <div className="space-y-4">
        {[
          { label: "Today", value: stats?.today ?? 0, color: "#007AFF" },
          { label: "This Week", value: stats?.week ?? 0, color: "#34c759" },
          { label: "This Month", value: stats?.month ?? 0, color: "#f5a623" },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: s.color }}>
              {stats === undefined ? "—" : s.value}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-4">Patients seen (visits logged)</p>
    </div>
  );
}

function PremiumTeaserCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 col-span-1">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="w-4 h-4 text-[#f5a623]" />
        <h2 className="text-sm font-semibold">Unlock Premium</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Everything you have now, plus full automation.
      </p>

      <div className="space-y-2 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">You have</p>
        {FREE_FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-3.5 h-3.5 text-[#34c759] flex-shrink-0" />
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#f5a623] mb-2">Premium adds</p>
        {PREMIUM_ONLY.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-[#f5a623] flex-shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>

      <Link
        href="/dashboard/settings"
        className="flex items-center justify-center gap-1.5 w-full bg-[#f5a623] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#e09520] transition-colors"
      >
        <Crown className="w-3.5 h-3.5" />
        Contact admin to upgrade
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
