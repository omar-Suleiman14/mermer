"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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
  Pill,
  LifeBuoy,
  Moon,
  Sun,
  Globe,
} from "lucide-react";


import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/client";
import { useState, useEffect } from "react";
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
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const clerkId = user?.id ?? "";
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const isAdmin = currentUser?.isAdmin ?? false;
  const isAssistant = currentUser?.role === "assistant";
  const userPerms: string[] = currentUser?.permissions ?? [];

  const navGroups = [
    [
      { title: t("nav.dashboard") || "Dashboard", href: "/dashboard", icon: LayoutDashboard, perm: null },
      { title: t("nav.schedule") || "Schedule", href: "/dashboard/queue", icon: CalendarDays, perm: "appointments.create" },
      { title: t("nav.installments") || "Installments", href: "/dashboard/installments", icon: FileText, perm: "appointments.create" },
      { title: t("nav.patients") || "Patients", href: "/dashboard/patients", icon: Users, perm: "patients.manage" },
    ],
    [
      { title: t("nav.medications") || "Medications", href: "/dashboard/medications", icon: Pill, perm: null, doctorOnly: true },
      { title: lang === "ar" ? "بيانات" : "Insights", href: "/dashboard/patients-analytics", icon: Users, perm: "analytics.access", doctorOnly: true },
      { title: t("nav.analytics") || "Analytics", href: "/dashboard/stats", icon: BarChart3, perm: "finances.access", doctorOnly: true },
      { title: t("nav.feedback") || "Feedback", href: "/dashboard/feedback", icon: Star, perm: "feedback.access" },
      { title: t("nav.staff") || "Staff", href: "/dashboard/staff", icon: UserCheck, perm: null, doctorOnly: true },
    ],
    [
      { title: t("nav.history") || "History", href: "/dashboard/history", icon: History, perm: null, doctorOnly: true },
      { title: t("nav.settings") || "Settings", href: "/dashboard/settings", icon: Settings, perm: "settings.access", doctorOnly: true },
      { title: lang === "ar" ? "الدعم" : "Support", href: "/dashboard/support", icon: LifeBuoy, perm: null },
    ]
  ];

  const filteredGroups = navGroups.map(group => group.filter(item => {
    // Doctor always sees everything
    if (!isAssistant) return true;
    // Items marked doctorOnly are hidden for assistants by default unless they have the perm
    if ("doctorOnly" in item && item.doctorOnly) {
      return item.perm ? userPerms.includes(item.perm) : false;
    }
    // If item requires a perm, check it
    if (item.perm) return userPerms.includes(item.perm);
    return true;
  })).filter(group => group.length > 0);

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
          {filteredGroups.map((group, groupIdx) => (
            <React.Fragment key={groupIdx}>
              {groupIdx > 0 && <SidebarSeparator className="my-2 opacity-50" />}
              {group.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href} prefetch={true} target={"target" in item ? item.target as string : undefined} className="flex items-center gap-2 relative">
                        <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </React.Fragment>
          ))}
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

      <SidebarFooter className="px-2 pb-3 gap-1">
        <div className="flex items-center gap-1 overflow-hidden transition-all">
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            aria-label={lang === "en" ? "Switch to Arabic" : "Switch to English"}
            title={lang === "en" ? "العربية" : "English"}
            className="flex items-center gap-2 px-2 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200 shrink-0"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden truncate">
              {lang === "en" ? "العربية" : "English"}
            </span>
          </button>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? (lang === "ar" ? "وضع مضيء" : "Light mode") : (lang === "ar" ? "وضع مظلم" : "Dark mode")}
              className="flex items-center gap-2 px-2 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all duration-200 shrink-0"
            >
              {theme === "dark"
                ? <Sun className="w-4 h-4 shrink-0" />
                : <Moon className="w-4 h-4 shrink-0" />}
              <span className="group-data-[collapsible=icon]:hidden truncate">
                {theme === "dark"
                  ? (lang === "ar" ? "وضع مضيء" : "Light")
                  : (lang === "ar" ? "وضع مظلم" : "Dark")}
              </span>
            </button>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
