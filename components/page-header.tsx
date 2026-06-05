"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationCenter } from "@/components/notification-center";


import { useEffect } from "react";

import { useI18n } from "@/lib/i18n/client";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  const { lang } = useI18n();

  useEffect(() => {
    if (title) {
      document.title = `${title} — ${lang === "ar" ? "مرمر" : "mermer"}`;
    }
  }, [title, lang]);
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4 border-b border-border/60 bg-background">
      <SidebarTrigger className="-ms-1 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="me-2 data-vertical:h-4 data-vertical:self-auto" />
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 ms-auto">
        {action}
        {children}
        <NotificationCenter />
      </div>
    </header>
  );
}
