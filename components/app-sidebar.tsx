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
  Sun,
  Moon,
  Star,
  Shield,
  BarChart3,
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
  const isPremium = tier === "premium";
  const isAdmin = currentUser?.isAdmin ?? false;

  const navItems = [
    { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { title: "Patients", href: "/dashboard/patients", icon: Users },
    { title: "Schedule", href: "/dashboard/queue", icon: CalendarDays },
    ...(isPremium
      ? [
          { title: "Feedback", href: "/dashboard/feedback", icon: Star },
          { title: "Statistics", href: "/dashboard/stats", icon: BarChart3 },
        ]
      : []),
    { title: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="pb-0">
        <div className="flex items-center gap-3 px-2 py-3">
          {/* Clerk avatar in place of the person icon */}
          <div className="flex-shrink-0">
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                baseTheme: theme === "dark" ? dark : undefined,
              }}
            />
          </div>
          <div className="overflow-hidden transition-all group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            <p className="text-sm font-bold tracking-tight text-[#007AFF] leading-tight truncate">
              {currentUser?.name ?? user?.fullName ?? "Ibn Sina"}
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
                  <Link href={item.href}>
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
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
                <SidebarMenuButton asChild isActive={pathname.startsWith("/admin")} tooltip="Admin Panel">
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
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
