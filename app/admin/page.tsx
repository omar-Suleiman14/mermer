"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Shield,
  Users,
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
  Ban,
  Globe,
  TrendingUp,
  CalendarDays,
  DollarSign,
  ChevronRight,
  ChevronDown,
  X,
  BarChart3,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { IOSSpinner } from "@/components/ui/spinner";

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
      <div className="text-[#007AFF]">
        <IOSSpinner size={56} />
      </div>
    </div>
  );
}

// ── Doctor analytics drawer ───────────────────────────────────────────────────

function DoctorAnalyticsPanel({
  clerkId,
  doctorId,
  doctorName,
  onClose,
}: {
  clerkId: string;
  doctorId: Id<"users">;
  doctorName: string;
  onClose: () => void;
}) {
  const analytics = useQuery(api.doctors.getDoctorAnalytics, { clerkId, targetUserId: doctorId });

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-[#1c1c1a] border-l border-border shadow-2xl z-50 flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="font-bold text-sm">Dr. {doctorName}</p>
          <p className="text-xs text-muted-foreground">Lifetime analytics</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {analytics === undefined ? (
          <div className="flex items-center justify-center h-32 text-[#007AFF]">
            <IOSSpinner size={28} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total visits", value: analytics.totalVisits, icon: CalendarDays, color: "#007AFF" },
                { label: "This month", value: analytics.monthlyVisits, icon: TrendingUp, color: "#34c759" },
                { label: "Patients", value: analytics.totalPatients, icon: Users, color: "#5856D6" },
                { label: "Reviews", value: analytics.reviewCount, icon: Star, color: "#FF9500" },
              ].map((stat) => (
                <div key={stat.label} className="bg-muted/20 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
                    <span className="text-[10px] text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <DollarSign className="w-3 h-3 text-[#34c759]" />
                  Total revenue (lifetime)
                </div>
                <span className="text-sm font-bold">{analytics.totalRevenue.toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <BarChart3 className="w-3 h-3 text-[#007AFF]" />
                  Revenue this month
                </div>
                <span className="text-sm font-bold">{analytics.monthlyRevenue.toLocaleString()} EGP</span>
              </div>
              {analytics.avgRating !== null && (
                <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-[#FF9500]" />
                    Avg rating
                  </div>
                  <span className="text-sm font-bold">{analytics.avgRating.toFixed(1)} / 5</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="w-3 h-3 text-[#5856D6]" />
                  Member since
                </div>
                <span className="text-sm font-bold">
                  {new Date(analytics.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ clerkId }: { clerkId: string }) {
  const [search, setSearch] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState<Id<"users"> | null>(null);
  const [selectedDoctorName, setSelectedDoctorName] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const allDoctors = useQuery(api.users.listAllDoctors, { clerkId });
  const overview = useQuery(api.doctors.getPlatformOverview, { clerkId });
  const banDoctor = useMutation(api.doctors.banDoctor);
  const setAdmin = useMutation(api.users.setAdmin);

  async function handleBan(targetUserId: Id<"users">, banned: boolean) {
    setLoadingId(targetUserId);
    try {
      await banDoctor({ clerkId, targetUserId, banned });
      toast.success(banned ? "Doctor banned — profile hidden from feed" : "Doctor unbanned");
    } catch {
      toast.error("Failed to update");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleToggleAdmin(targetUserId: Id<"users">, isAdmin: boolean) {
    setLoadingId(targetUserId);
    try {
      await setAdmin({ clerkId, targetUserId, isAdmin });
      toast.success(isAdmin ? "Admin granted" : "Admin revoked");
    } catch {
      toast.error("Failed");
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = (allDoctors ?? []).filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.clinicName.toLowerCase().includes(search.toLowerCase()) ||
      (d.specialty ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (d.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const nonAdmins = filtered.filter((d) => !d.isAdmin);

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      {/* Header */}
      <div className="border-b border-black/6 dark:border-white/6 px-6 py-4 bg-white/60 dark:bg-[#1a1a18]/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Ibn Sina platform control</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#34c759] bg-[#34c759]/10 border border-[#34c759]/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Admin access
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Platform overview cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Doctors", value: overview?.totalDoctors, icon: Users, color: "#007AFF" },
            { label: "Published", value: overview?.publishedDoctors, icon: Globe, color: "#34c759" },
            { label: "Banned", value: overview?.bannedDoctors, icon: Ban, color: "#FF3B30" },
            { label: "Visits (month)", value: overview?.totalVisitsThisMonth, icon: CalendarDays, color: "#FF9500" },
            { label: "Visits (total)", value: overview?.totalVisitsAllTime, icon: TrendingUp, color: "#5856D6" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1c1c1a] border border-black/6 dark:border-white/6 rounded-xl p-4"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>
                {overview === undefined ? <IOSSpinner size={18} /> : (stat.value ?? 0)}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
        </div>

        {/* Doctors table */}
        <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl border border-black/6 dark:border-white/6 overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr,auto,auto,auto,auto] text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3 border-b border-border">
            <span>Doctor</span>
            <span className="text-center px-3">Status</span>
            <span className="text-center px-3">Profile</span>
            <span className="text-center px-3">Admin</span>
            <span className="text-center px-3">Actions</span>
          </div>

          {allDoctors === undefined ? (
            <div className="flex items-center justify-center py-16 text-[#007AFF]">
              <IOSSpinner size={36} />
            </div>
          ) : nonAdmins.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No doctors found</div>
          ) : (
            <div className="divide-y divide-border">
              {nonAdmins.map((doc) => {
                const isLoading = loadingId === doc._id;
                const isBanned = (doc as any).isBanned === true;
                const isPublished = doc.publicProfile === true;
                return (
                  <div key={doc._id} className="grid grid-cols-[1fr,auto,auto,auto,auto] items-center px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    {/* Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isBanned ? "bg-red-100 dark:bg-red-900/20" : "bg-[#007AFF]/10"}`}>
                        <span className={`text-xs font-bold ${isBanned ? "text-red-500" : "text-[#007AFF]"}`}>
                          {doc.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-xs truncate ${isBanned ? "line-through text-muted-foreground" : ""}`}>{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{doc.email ?? doc.specialty ?? doc.clinicName}</p>
                        <p className="text-[10px] text-muted-foreground/60 truncate">{doc.clinicName}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex justify-center px-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isBanned
                          ? "bg-red-50 dark:bg-red-900/20 text-red-500 border-red-200 dark:border-red-800"
                          : "bg-[#34c759]/8 text-[#34c759] border-[#34c759]/20"
                      }`}>
                        {isBanned ? "Banned" : "Active"}
                      </span>
                    </div>

                    {/* Public profile */}
                    <div className="flex justify-center px-3">
                      {isPublished
                        ? <Globe className="w-3.5 h-3.5 text-[#34c759]" />
                        : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />}
                    </div>

                    {/* Admin */}
                    <div className="flex justify-center px-3">
                      {doc.isAdmin ? <CheckCircle2 className="w-3.5 h-3.5 text-[#34c759]" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 px-3">
                      {isLoading ? (
                        <span className="text-[#007AFF]"><IOSSpinner size={16} /></span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleBan(doc._id, !isBanned)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                              isBanned
                                ? "border-[#34c759]/40 text-[#34c759] hover:bg-[#34c759]/10"
                                : "border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            }`}
                          >
                            {isBanned ? "Unban" : "Ban"}
                          </button>
                          <button
                            onClick={() => { setSelectedDoctorId(doc._id); setSelectedDoctorName(doc.name); }}
                            className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-border hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors"
                          >
                            Stats
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Doctor analytics slide-over */}
      <AnimatePresence>
        {selectedDoctorId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoctorId(null)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            />
            <DoctorAnalyticsPanel
              clerkId={clerkId}
              doctorId={selectedDoctorId}
              doctorName={selectedDoctorName}
              onClose={() => setSelectedDoctorId(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Claim Admin ───────────────────────────────────────────────────────────────

function ClaimAdminPage({ clerkId, userName }: { clerkId: string; userName: string }) {
  const claimAdmin = useMutation(api.users.claimAdmin);
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  async function handleClaim() {
    setLoading(true);
    try {
      await claimAdmin({ clerkId });
      setClaimed(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to claim admin");
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center px-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#34c759]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-[#34c759]" />
          </div>
          <h2 className="text-xl font-bold mb-2">Admin access granted</h2>
          <p className="text-sm text-muted-foreground mb-6">Reload to open your dashboard.</p>
          <button onClick={() => window.location.reload()} className="bg-[#007AFF] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors">
            Open Admin Panel
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-[#007AFF]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Claim Admin</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            No admin exists yet. You&apos;re signed in as{" "}
            <span className="font-semibold text-foreground">{userName}</span>.
          </p>
        </div>
        <div className="bg-white dark:bg-[#1c1c1a] border border-black/6 dark:border-white/6 rounded-2xl p-6 shadow-sm">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>One-time setup.</strong> After you claim admin, this option disappears permanently.
            </p>
          </div>
          <button onClick={handleClaim} disabled={loading} className="w-full bg-[#007AFF] text-white font-semibold py-3 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60 flex items-center justify-center gap-3">
            {loading ? <IOSSpinner size={20} /> : <Shield className="w-4 h-4" />}
            Claim Admin Role
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Root /admin ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const clerkId = user?.id ?? "";

  const adminExists = useQuery(api.users.getAdminExists);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  if (!isLoaded) return <FullPageSpinner />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-[#007AFF]" />
            </div>
            <h1 className="text-xl font-bold mb-1">Admin Access</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
          <SignIn routing="hash" />
        </div>
      </div>
    );
  }

  if (adminExists === undefined || currentUser === undefined) return <FullPageSpinner />;

  if (currentUser?.isAdmin) return <AdminDashboard clerkId={clerkId} />;

  if (adminExists && !currentUser?.isAdmin) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center text-center px-6">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            The admin role is already claimed. Contact your system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClaimAdminPage
      clerkId={clerkId}
      userName={user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "you"}
    />
  );
}
