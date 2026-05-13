"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
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
      {children && <div className="flex items-center gap-2 ms-auto">{children}</div>}
    </header>
  );
}
