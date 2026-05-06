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
  ClipboardList,
  Settings,
  Sun,
  Moon,
  Star,
  Shield,
  CalendarDays,
  Crown,
} from "lucide-react";
import { useTheme } from "next-themes";
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

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Patients", href: "/dashboard/patients", icon: Users },
  { title: "Queue", href: "/dashboard/queue", icon: ClipboardList },
  { title: "Appointments", href: "/dashboard/appointments", icon: CalendarDays, premiumOnly: true },
  { title: "Feedback", href: "/dashboard/feedback", icon: Star },
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const clerkId = user?.id ?? "";
  const currentUser = useQuery(
    api.users.getCurrentUser,
    clerkId ? { clerkId } : "skip"
  );

  const tier = currentUser?.tier ?? "free";
  const isAdmin = currentUser?.isAdmin ?? false;
  const isPremium = tier === "premium";

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-3 px-2 py-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                fill="white"
              />
            </svg>
          </div>
          <div className="overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <p className="text-sm font-bold tracking-tight text-[#007AFF] leading-tight truncate">
              Ibn Sina
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {currentUser?.clinicName ?? "Your Clinic"}
            </p>
          </div>
        </div>

        {/* Tier pill */}
        {isPremium && (
          <div className="px-3 pb-2 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#f5a623] bg-[#f5a623]/10 border border-[#f5a623]/20 px-2 py-1 rounded-full w-fit">
              <Crown className="w-2.5 h-2.5" />
              Premium
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 pt-2">
        <SidebarMenu>
          {navItems.map((item) => {
            // Hide premium-only items for free users
            if (item.premiumOnly && !isPremium) return null;

            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                >
                  <Link href={item.href}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Admin section */}
        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/admin")}
                  tooltip="Admin Panel"
                >
                  <Link href="/admin">
                    <Shield className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {/* Render neutral icon until mounted to avoid SSR mismatch */}
              {!mounted ? (
                <Moon className="w-4 h-4" />
              ) : theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span>{mounted && theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-1.5">
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  baseTheme: theme === "dark" ? dark : undefined,
                }}
              />
              <div className="overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
                <p className="text-sm font-medium truncate">
                  {currentUser?.name ?? user?.fullName ?? "Doctor"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
