"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserSync } from "../../components/user-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DoctorOnboarding } from "@/components/doctor-onboarding";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";
import { OnlineBookingNotifier } from "@/components/online-booking-notifier";
import { WhatsAppReconnectPrompt } from "@/components/whatsapp-reconnect-prompt";
import { OfflineWarning } from "@/components/offline-warning";
import { AlertTriangle, X, Building2, UserCheck, UserX, Clock } from "lucide-react";
import { UserProvider, useCurrentUser } from "@/components/providers/user-provider";
import { IOSSpinner } from "@/components/ui/spinner";
import { toast } from "sonner";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { dir, lang } = useI18n();

  const { currentUser, isLoading } = useCurrentUser();
  const clerkId = user?.id ?? "";

  // Invite flow for new users signing up
  const pendingInvite = useQuery(api.users.getPendingInvitation, clerkId ? { clerkId } : "skip");
  const acceptInvite = useMutation(api.users.acceptInvitation);
  const declineInvite = useMutation(api.users.declineInvitation);
  const [inviteLoading, setInviteLoading] = useState<"accept" | "decline" | null>(null);
  const [inviteDeclined, setInviteDeclined] = useState(false);

  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showBannedPopup, setShowBannedPopup] = useState(false);

  useEffect(() => {
    if (currentUser?.isBanned) {
      const lastDismissed = localStorage.getItem("bannedPopupDismissedAt");
      if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 3 * 24 * 60 * 60 * 1000) {
        setShowBannedPopup(true);
      }
    }
  }, [currentUser?.isBanned]);

  const needsOnboarding =
    isLoaded &&
    !!user &&
    currentUser !== undefined &&
    currentUser !== null &&
    !onboardingDone &&
    currentUser.role !== "assistant" &&
    currentUser.clinicName === "My Clinic" &&
    !currentUser.specialty;

  // Show invite card for new users who have a pending invite
  // Don't show if they're already an assistant, or if they declined
  const showInviteCard =
    !!pendingInvite &&
    !inviteDeclined &&
    currentUser?.role !== "assistant";

  const sidebarSide = dir === "rtl" ? "right" : "left";

  if (!isLoaded) {
    return (
      <div className="dashboard-font fixed inset-0 z-9999 flex items-center justify-center bg-background" dir={dir}>
        <IOSSpinner className="w-8 h-8 text-[#007AFF]" />
      </div>
    );
  }

  if (currentUser?.isBlocked) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-background" dir={dir}>
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500 mb-2">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-foreground">
            {dir === "rtl" ? "في انتظار الموافقة" : "Pending Approval"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {dir === "rtl"
              ? "تم إنشاء حسابك بنجاح. سيتم مراجعته وتفعيله قريباً. للتواصل:"
              : "Your account has been created and is under review. You'll have access shortly. To reach us:"}
          </p>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace('+', '') || '201035555282'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-xl hover:bg-emerald-500/20 transition-colors"
          >
            <span dir="ltr">WhatsApp: {process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '+201035555282'}</span>
          </a>
          <SignOutButton>
            <button className="w-full py-2.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary/80 transition-colors">
              {dir === "rtl" ? "تسجيل خروج" : "Sign Out"}
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <OfflineWarning />
      <div className="dashboard-font relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <SidebarProvider>
          <UserSync />
          <OnlineBookingNotifier />
          <WhatsAppReconnectPrompt />
          <AppSidebar side={sidebarSide} />
          <SidebarInset className="bg-background overflow-x-hidden">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>

      {/* New-user invite card — shown on top of onboarding or dashboard */}
      {showInviteCard && (
        <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" dir={dir}>
          <div className="w-full sm:max-w-sm bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
            {/* Header gradient */}
            <div className="h-2 bg-linear-to-r from-[#007AFF] to-[#5AC8FA]" />
            <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-[#007AFF]" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wider mb-0.5">
                    {lang === "ar" ? "دعوة لعيادة" : "Clinic Invitation"}
                  </p>
                  <h2 className="text-lg font-bold leading-tight">
                    {pendingInvite.doctorClinicName}
                  </h2>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {lang === "ar"
                  ? `دعاك ${pendingInvite.doctorName} للانضمام إلى عيادة "${pendingInvite.doctorClinicName}" بصفتك ${pendingInvite.role}. إذا قبلت، ستُربط حسابك بهذه العيادة وستُعدَّل صلاحياتك وفقًا لذلك.`
                  : `${pendingInvite.doctorName} has invited you to join "${pendingInvite.doctorClinicName}" as ${pendingInvite.role}. If you accept, your account will be linked to this clinic.`}
              </p>

              <div className="flex gap-3">
                <button
                  disabled={!!inviteLoading}
                  onClick={async () => {
                    setInviteLoading("accept");
                    try {
                      await acceptInvite({ clerkId, invitationId: pendingInvite._id });
                      toast.success(lang === "ar" ? "مرحباً بك في العيادة! 🎉" : "Welcome to the clinic! 🎉");
                    } catch {
                      toast.error("Failed to accept");
                    }
                    setInviteLoading(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#007AFF] text-white text-sm font-bold rounded-xl hover:bg-[#007AFF]/90 active:scale-95 transition-all disabled:opacity-60"
                >
                  <UserCheck className="w-4 h-4" />
                  {inviteLoading === "accept" ? "..." : (lang === "ar" ? "قبول الدعوة" : "Accept Invitation")}
                </button>
                <button
                  disabled={!!inviteLoading}
                  onClick={async () => {
                    setInviteLoading("decline");
                    try {
                      await declineInvite({ clerkId, invitationId: pendingInvite._id });
                      setInviteDeclined(true);
                      toast(lang === "ar" ? "تم رفض الدعوة" : "Invitation declined");
                    } catch {
                      toast.error("Failed");
                    }
                    setInviteLoading(null);
                  }}
                  className="flex items-center gap-2 px-4 py-3 bg-muted text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted/80 active:scale-95 transition-all disabled:opacity-60"
                >
                  <UserX className="w-4 h-4" />
                  {inviteLoading === "decline" ? "..." : (lang === "ar" ? "رفض" : "Decline")}
                </button>
              </div>

              {needsOnboarding && !showInviteCard && (
                <p className="text-center text-[11px] text-muted-foreground mt-4">
                  {lang === "ar" ? "أو أنشئ عيادتك الخاصة عبر الرفض" : "Or set up your own clinic by declining"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {needsOnboarding && !showInviteCard && (
        <DoctorOnboarding
          clerkId={clerkId}
          defaultName={user?.fullName ?? user?.firstName ?? "Doctor"}
          onComplete={() => setOnboardingDone(true)}
        />
      )}

      {showBannedPopup && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={dir}>
          <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] relative">
            <button onClick={() => {
              setShowBannedPopup(false);
              localStorage.setItem("bannedPopupDismissedAt", Date.now().toString());
            }} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500 mb-2">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">
                {lang === "ar" ? "اشتراك مطلوب" : "Subscription Required"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {lang === "ar" 
                  ? "يرجى الاشتراك للاستمرار في استخدام جميع الميزات. للتجديد تواصل معنا على" 
                  : "Please subscribe to continue using all features. To renew, contact us at"} <span className="font-semibold text-foreground" dir="ltr">{process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '+201035555282'}</span>
              </p>
              <button onClick={() => {
                setShowBannedPopup(false);
                localStorage.setItem("bannedPopupDismissedAt", Date.now().toString());
              }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                {lang === "ar" ? "ذكرني لاحقاً" : "Remind Me Later"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </UserProvider>
  );
}
