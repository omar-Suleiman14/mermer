"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserSync } from "../../components/user-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DoctorOnboarding } from "@/components/doctor-onboarding";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { OnlineBookingNotifier } from "@/components/online-booking-notifier";
import { AlertTriangle, X } from "lucide-react";
import { UserProvider, useCurrentUser } from "@/components/providers/user-provider";
import { IOSSpinner } from "@/components/ui/spinner";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const { dir, lang } = useI18n();

  const { currentUser, isLoading } = useCurrentUser();
  const clerkId = user?.id ?? "";

  // Show onboarding when: user loaded, profile exists, but clinicName is the default
  // and specialty hasn't been set yet — i.e. fresh account never completed setup.
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showBannedPopup, setShowBannedPopup] = useState(false);

  useEffect(() => {
    if (currentUser?.isBanned) {
      const lastDismissed = localStorage.getItem("bannedPopupDismissedAt");
      if (!lastDismissed || Date.now() - parseInt(lastDismissed) > 24 * 60 * 60 * 1000) {
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
    currentUser.clinicName === "My Clinic" &&
    !currentUser.specialty;

  const sidebarSide = dir === "rtl" ? "right" : "left";

  if (!isLoaded || isLoading || currentUser === undefined) {
    return (
      <div className="min-h-screen bg-[#f0efea] dark:bg-[#111110] flex items-center justify-center">
        <IOSSpinner size={48} className="text-[#007AFF]" />
      </div>
    );
  }

  if (currentUser?.isBlocked) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-background" dir={dir}>
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-500 mb-2">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-red-500">blocked until unblocked</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please contact <span className="font-semibold text-foreground" dir="ltr">+201012756994</span> to gain access.
          </p>
          <SignOutButton>
            <button className="w-full py-2.5 bg-secondary text-secondary-foreground text-sm font-semibold rounded-xl hover:bg-secondary/80 transition-colors mt-2">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="dashboard-font contents">
        <SidebarProvider>
          <UserSync />
          <OnlineBookingNotifier />
          <AppSidebar side={sidebarSide} />
          <SidebarInset className="bg-background">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>

      {needsOnboarding && (
        <DoctorOnboarding
          clerkId={clerkId}
          defaultName={user?.fullName ?? user?.firstName ?? "Doctor"}
          onComplete={() => setOnboardingDone(true)}
        />
      )}

      {showBannedPopup && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir={dir}>
          <div className="w-full max-w-sm bg-card border border-border/50 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden p-6 relative">
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
              <h3 className="text-lg font-bold">Subscription Required</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please subscribe to continue using all features. Contact <span className="font-semibold text-foreground" dir="ltr">+201012756994</span> to renew your subscription.
              </p>
              <button onClick={() => {
                setShowBannedPopup(false);
                localStorage.setItem("bannedPopupDismissedAt", Date.now().toString());
              }} className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                Remind Me Later
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
