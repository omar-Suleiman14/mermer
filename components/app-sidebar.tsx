"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  Star,
  Shield,
  BarChart3,
  FileText,
  Monitor,
  History,
  UserCheck,
} from "lucide-react";


import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useUser();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const clerkId = user?.id ?? "";
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const isAdmin = currentUser?.isAdmin ?? false;
  const isAssistant = currentUser?.role === "assistant";
  const userPerms: string[] = currentUser?.permissions ?? [];

  const allNavItems = [
    { title: t("nav.dashboard") || "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: null },
    { title: t("nav.schedule") || "Schedule", href: "/dashboard/queue", icon: CalendarDays, perm: "manage_queue" },
    { title: t("nav.patients") || "Patients", href: "/dashboard/patients", icon: Users, perm: "manage_patients" },
    { title: t("nav.installments") || "Installments", href: "/dashboard/installments", icon: FileText, perm: "manage_installments" },
    { title: t("nav.feedback") || "Feedback", href: "/dashboard/feedback", icon: Star, perm: null },
    { title: t("nav.analytics") || "Analytics", href: "/dashboard/stats", icon: BarChart3, perm: "manage_analytics", doctorOnly: true },
    { title: t("nav.history") || "History", href: "/dashboard/history", icon: History, perm: "manage_history", doctorOnly: true },
    { title: t("nav.clinicScreen") === "nav.clinicScreen" ? (lang === "ar" ? "شاشة العيادة" : "Clinic Screen") : (t("nav.clinicScreen") || "Clinic Screen"), href: "/clinic-screen", icon: Monitor, target: "_blank", perm: null },
    { title: t("nav.staff") || "Staff", href: "/dashboard/staff", icon: UserCheck, perm: null, doctorOnly: true },
    { title: t("nav.settings") || "Settings", href: "/dashboard/settings", icon: Settings, perm: "manage_settings", doctorOnly: true },
  ];

  const navItems = allNavItems.filter((item) => {
    // Doctor always sees everything
    if (!isAssistant) return true;
    // Items marked doctorOnly are hidden for assistants by default unless they have the perm
    if ((item as any).doctorOnly) {
      return item.perm ? userPerms.includes(item.perm) : false;
    }
    // If item requires a perm, check it
    if (item.perm) return userPerms.includes(item.perm);
    return true;
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-3 px-2 py-3">
          {/* Clerk UserButton — force popup z-index above SidebarInset */}
          <div
            className="shrink-0"
            style={{ position: "relative", zIndex: 9999, isolation: "isolate" }}
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                baseTheme: theme === "dark" ? dark : undefined,
                elements: {
                  // Ensure the popup card floats above everything
                  userButtonPopoverCard: {
                    zIndex: 99999,
                    pointerEvents: "auto",
                  },
                  userButtonPopoverActionButton: {
                    pointerEvents: "auto",
                  },
                },
              }}
            />
          </div>
          <div className="overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <p className="text-sm font-bold tracking-tight text-[#007AFF] leading-tight truncate">
              {currentUser?.name ?? user?.fullName ?? "mermer"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentUser?.clinicName ?? "Your Clinic"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.href} prefetch={true} target={(item as any).target} className="flex items-center gap-2 relative">
                    <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin")}
                  tooltip={t("nav.admin")}
                >
                  <Link href="/admin" prefetch={true}>
                    <Shield className="w-4 h-4" aria-hidden="true" />
                    <span>{t("nav.admin")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3 gap-1" />
      <SidebarRail />
    </Sidebar>
  );
}
