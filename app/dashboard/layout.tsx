"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserSync } from "../../components/user-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DoctorOnboarding } from "@/components/doctor-onboarding";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const clerkId = user?.id ?? "";
  const { dir } = useI18n();

  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  // Show onboarding when: user loaded, profile exists, but clinicName is the default
  // and specialty hasn't been set yet — i.e. fresh account never completed setup.
  const [onboardingDone, setOnboardingDone] = useState(false);

  const needsOnboarding =
    isLoaded &&
    !!user &&
    currentUser !== undefined &&
    currentUser !== null &&
    !onboardingDone &&
    currentUser.clinicName === "My Clinic" &&
    !currentUser.specialty;

  const sidebarSide = dir === "rtl" ? "right" : "left";

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <UserSync />
        <AppSidebar side={sidebarSide} />
        <SidebarInset className="bg-background">
          {children}
        </SidebarInset>
      </SidebarProvider>

      {needsOnboarding && (
        <DoctorOnboarding
          clerkId={clerkId}
          defaultName={user?.fullName ?? user?.firstName ?? "Doctor"}
          onComplete={() => setOnboardingDone(true)}
        />
      )}
    </TooltipProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayoutInner>{children}</DashboardLayoutInner>;
}
