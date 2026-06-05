"use client";

import { memo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  FolderOpen,
  MessageCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useI18n } from "@/lib/i18n/client";
import { formatTime } from "@/lib/scheduling";

export interface SortableApptItemProps {
  appt: any;
  onComplete: () => void;
  onReminder: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onReschedule: () => void;
  tag?: "current" | "next";
  canReschedule?: boolean;
  canCancel?: boolean;
  onConfirm?: () => void;
}

export const SortableApptItem = memo(function SortableApptItem({
  appt,
  onComplete,
  onReminder,
  onCancel,
  onReschedule,
  tag,
  canReschedule = true,
  canCancel = true,
  onConfirm,
}: SortableApptItemProps) {
  const isinstallmentVisit = appt.source === "installment";
  const isDone = appt.status === "completed";
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: appt._id,
    disabled: isDone
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: "relative" as const,
  };

  const initials = (appt.patientName ?? "?")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { t, dir, lang } = useI18n();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl border transition-all ${
        !isDone ? "hover:shadow-md" : ""
      } ${
        isDragging ? "opacity-90 shadow-2xl scale-[1.02] bg-background border-[#007AFF]/40" : 
        isDone ? "opacity-55 bg-muted/20 border-border/40" : "bg-card border-black/5 dark:border-white/5 shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      {!isDone && (
        <div 
          {...attributes} 
          {...listeners}
          className="shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <div className="flex flex-col items-center w-12 sm:w-14 shrink-0">
        <Clock className="w-3 h-3 text-muted-foreground mb-0.5" />
        <span className="text-xs font-bold text-[#1a1916] dark:text-[#f0efea]">
          {formatTime(appt.date, lang)}
        </span>
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-[#007AFF]">
          {initials}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-start">
        <div className="flex items-center gap-2 flex-wrap">
          {appt.patientId ? (
            <Link
              href={`/dashboard/patients/${appt.patientId}`}
              className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
            >
              {appt.patientName}
            </Link>
          ) : (
              <span className="font-semibold text-sm truncate">
                {appt.patientName}
              </span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "installment" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.installment")}
            </span>
          ) : appt.source === "follow-up" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.followUp")}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
              {t("dashboard.manual")}
            </span>
          )}
          {tag === "current" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "الحالي" : "Current"}
            </span>
          )}
          {tag === "next" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "التالي" : "Next"}
            </span>
          )}
          {appt.status === "pending" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "قيد الانتظار" : "Pending"}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {appt.patientAge && `${appt.patientAge}y`}
          {appt.patientAge && appt.patientPhone && " · "}
          {appt.patientPhone}
        </p>
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={onComplete}
              className="p-2 rounded-full hover:bg-muted/80 text-muted-foreground hover:text-[#007AFF] transition-colors"
              title="Open visit"
            >
              <FolderOpen className="w-5 h-5" />
            </button>
            {appt.patientPhone && (
              <button
                onClick={onReminder}
                className="p-2 rounded-full hover:bg-[#25D366]/10 text-muted-foreground hover:text-[#25D366] transition-colors relative"
                title="Send WhatsApp Message"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
            )}
            {appt.status === "pending" && onConfirm && (
              <button
                onClick={onConfirm}
                className="p-2 rounded-full hover:bg-green-500/10 text-muted-foreground hover:text-green-500 transition-colors"
                title={t("common.confirm") || "Confirm"}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            )}
            {canReschedule && (
              <button
                onClick={onReschedule}
                className={`p-2 rounded-full transition-colors ${isinstallmentVisit ? "hover:bg-[#AF52DE]/10 text-muted-foreground hover:text-[#AF52DE]" : "hover:bg-[#007AFF]/10 text-muted-foreground hover:text-[#007AFF]"}`}
                title={t("schedule.reschedule") || "Reschedule"}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            {canCancel && !isinstallmentVisit && (
              <button
                onClick={onCancel}
                className="p-2 rounded-full hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                title="Cancel appointment"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="block sm:hidden">
            <DropdownMenu dir={dir}>
              <DropdownMenuTrigger asChild>
                <button className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/80 text-muted-foreground transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onComplete} className="gap-2 cursor-pointer font-medium text-[#007AFF] focus:text-[#007AFF]">
                  <FolderOpen className="w-4 h-4" />
                  <span>{t("dashboard.openVisit")}</span>
                </DropdownMenuItem>
                {appt.patientPhone && (
                  <DropdownMenuItem onClick={onReminder} className="gap-2 cursor-pointer font-medium text-[#25D366] focus:text-[#25D366]">
                    <MessageCircle className="w-4 h-4" />
                    <span>{t("schedule.sendReminder") || "Send Reminder"}</span>
                  </DropdownMenuItem>
                )}
                {appt.status === "pending" && onConfirm && (
                  <DropdownMenuItem onClick={onConfirm} className="gap-2 cursor-pointer font-medium text-green-500 focus:text-green-500 focus:bg-green-500/10">
                        <CheckCircle2 className="w-4 h-4" />
                    <span>{t("common.confirm") || "Confirm"}</span>
                  </DropdownMenuItem>
                )}
                {(canReschedule || (canCancel && !isinstallmentVisit)) && <DropdownMenuSeparator />}
                {canReschedule && (
                  <DropdownMenuItem onClick={onReschedule} className={`gap-2 cursor-pointer font-medium ${isinstallmentVisit ? "text-[#AF52DE] focus:text-[#AF52DE] focus:bg-[#AF52DE]/10" : "text-[#007AFF] focus:text-[#007AFF] focus:bg-[#007AFF]/10"}`}>
                    <RefreshCw className="w-4 h-4" />
                    <span>{t("schedule.reschedule")}</span>
                  </DropdownMenuItem>
                )}
                {canCancel && !isinstallmentVisit && (
                  <DropdownMenuItem onClick={onCancel} className="gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10">
                    <XCircle className="w-4 h-4" />
                    <span>{t("common.cancel") || "Cancel"}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
});
