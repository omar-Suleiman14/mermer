"use client";

import { useUser, SignIn } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Shield,
  Users,
  Crown,
  Star,
  Search,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

// ─── iOS-style activity indicator ──────────────────────────────────────────
function IOSSpinner({ size = 48 }: { size?: number }) {
  const blades = 12;
  return (
    <span style={{ width: size, height: size, position: "relative", display: "inline-block" }}>
      {Array.from({ length: blades }).map((_, i) => {
        const angle = (i / blades) * 360;
        const opacity = (i + 1) / blades;
        const bladeH = size * 0.28;
        const bladeW = size * 0.08;
        const offsetY = size * 0.22;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: bladeW,
              height: bladeH,
              marginLeft: -bladeW / 2,
              marginTop: -offsetY - bladeH / 2,
              borderRadius: bladeW,
              background: "currentColor",
              opacity,
              transform: `rotate(${angle}deg) translateY(${-(offsetY)}px)`,
              transformOrigin: `50% calc(50% + ${offsetY}px)`,
              animation: `ios-spin 1s linear infinite`,
              animationDelay: `${-(blades - i) / blades}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes ios-spin {
          0%   { opacity: 0.1 }
          100% { opacity: 1   }
        }
      `}</style>
    </span>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
      <div className="text-[#007AFF]">
        <IOSSpinner size={56} />
      </div>
    </div>
  );
}

// ─── Admin Dashboard ────────────────────────────────────────────────────────
function AdminDashboard({ clerkId }: { clerkId: string }) {
  const [search, setSearch] = useState("");
  const allDoctors = useQuery(api.users.listAllDoctors, { clerkId });
  const setTier = useMutation(api.users.setTier);
  const setAdmin = useMutation(api.users.setAdmin);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleSetTier(targetUserId: Id<"users">, tier: "free" | "premium") {
    setLoadingId(targetUserId);
    try {
      await setTier({ clerkId, targetUserId, tier });
      toast.success(`Moved to ${tier} tier`);
    } catch {
      toast.error("Failed to update tier");
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
      (d.specialty ?? "").toLowerCase().includes(search.toLowerCase())
  );
  const premiumCount = (allDoctors ?? []).filter((d) => d.tier === "premium").length;
  const freeCount = (allDoctors ?? []).filter((d) => (d.tier ?? "free") === "free").length;

  return (
    <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] text-[#1a1916] dark:text-[#f0efea]">
      <div className="border-b border-black/6 dark:border-white/6 px-6 py-4 bg-white/60 dark:bg-[#1a1a18]/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Ibn Sina superadmin</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#34c759] bg-[#34c759]/10 border border-[#34c759]/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Admin access
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Doctors", value: (allDoctors ?? []).length, icon: Users, color: "#007AFF" },
            { label: "Premium", value: premiumCount, icon: Crown, color: "#f5a623" },
            { label: "Free", value: freeCount, icon: Star, color: "#34c759" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1c1c1a] border border-black/6 dark:border-white/6 rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: stat.color }}>
                {allDoctors === undefined ? (
                  <span className="inline-block text-muted-foreground" style={{ color: stat.color }}>
                    <IOSSpinner size={24} />
                  </span>
                ) : stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-[#1c1c1a] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
          />
        </div>

        <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl border border-black/6 dark:border-white/6 overflow-hidden shadow-sm">
          <div className="grid grid-cols-[1fr,auto,auto,auto] text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3 border-b border-border">
            <span>Doctor</span>
            <span className="text-center px-4">Tier</span>
            <span className="text-center px-4">Admin</span>
            <span className="text-center px-4">Actions</span>
          </div>

          {allDoctors === undefined ? (
            <div className="flex items-center justify-center py-16 text-[#007AFF]">
              <IOSSpinner size={36} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No doctors found</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((doc) => {
                const isLoading = loadingId === doc._id;
                const tier = doc.tier ?? "free";
                return (
                  <div key={doc._id} className="grid grid-cols-[1fr,auto,auto,auto] items-center px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-[#007AFF]">{doc.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.specialty ?? "—"} · {doc.clinicName}</p>
                      </div>
                    </div>
                    <div className="flex justify-center px-4">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tier === "premium" ? "bg-[#f5a623]/10 text-[#f5a623] border-[#f5a623]/30" : "bg-muted/60 text-muted-foreground border-border"}`}>
                        {tier}
                      </span>
                    </div>
                    <div className="flex justify-center px-4">
                      {doc.isAdmin ? <CheckCircle2 className="w-4 h-4 text-[#34c759]" /> : <XCircle className="w-4 h-4 text-muted-foreground/40" />}
                    </div>
                    <div className="flex items-center gap-2 px-4">
                      {isLoading ? (
                        <span className="text-[#007AFF]"><IOSSpinner size={18} /></span>
                      ) : (
                        <>
                          <button onClick={() => handleSetTier(doc._id, tier === "premium" ? "free" : "premium")} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${tier === "premium" ? "border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-[#f5a623]/40 text-[#f5a623] hover:bg-[#f5a623]/10"}`}>
                            {tier === "premium" ? "Downgrade" : "↑ Premium"}
                          </button>
                          <button onClick={() => handleToggleAdmin(doc._id, !doc.isAdmin)} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-border hover:border-[#007AFF]/40 hover:text-[#007AFF] transition-colors">
                            {doc.isAdmin ? "Revoke" : "Make Admin"}
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
    </div>
  );
}

// ─── Claim Admin ────────────────────────────────────────────────────────────
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
            Open Admin Dashboard
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

// ─── Root /admin ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const clerkId = user?.id ?? "";

  // These two are fast/parallel — check admin existence and current user status
  const adminExists = useQuery(api.users.getAdminExists);
  const currentUser = useQuery(
    api.users.getCurrentUser,
    // Only run once Clerk has confirmed a signed-in user
    clerkId ? { clerkId } : "skip"
  );

  // Step 1: Wait only for Clerk to finish loading (fast — local SDK)
  if (!isLoaded) return <FullPageSpinner />;

  // Step 2: If not signed in, show sign-in immediately — no Convex wait needed
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

  // Step 3: Signed in — now wait for Convex queries (both run in parallel)
  if (adminExists === undefined || currentUser === undefined) return <FullPageSpinner />;

  // Signed in + IS admin → dashboard
  if (currentUser?.isAdmin) return <AdminDashboard clerkId={clerkId} />;

  // Admin exists but this user isn't it → locked
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

  // No admin exists yet → claim page
  return (
    <ClaimAdminPage
      clerkId={clerkId}
      userName={user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "you"}
    />
  );
}
