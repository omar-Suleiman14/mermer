import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { UserSync } from "../../components/user-sync";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <UserSync />
        <AppSidebar />
        <SidebarInset className="bg-background">
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
