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
  ArrowUpDown,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useI18n } from "@/lib/i18n/client";
import { formatTime } from "@/lib/scheduling";

export interface DraggableApptItemProps {
  appt: any;
  ts: number;
  isSelectedDayPast: boolean;
  isDone: boolean;
  initials: string;
  onComplete: () => void;
  onReminder: (e: React.MouseEvent) => void;
  onCancel: () => void;
  onReschedule: () => void;
  onMove?: () => void;
  tag?: "current" | "next";
  canReschedule?: boolean;
  canCancel?: boolean;
  onConfirm?: () => void;
}

export const DraggableApptItem = memo(function DraggableApptItem({
  appt,
  ts,
  isSelectedDayPast,
  isDone,
  initials,
  onComplete,
  onReminder,
  onCancel,
  onReschedule,
  onMove,
  tag,
  canReschedule = true,
  canCancel = true,
  onConfirm,
}: DraggableApptItemProps) {
  const { t, dir, lang } = useI18n();
  const isinstallmentVisit = appt.source === "installment";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appt._id,
    disabled: isSelectedDayPast || isDone,
    data: { appt },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : 1,
        position: "relative" as const,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border transition-all ${
        !isSelectedDayPast && !isDone ? "hover:shadow-md" : ""
      } ${
        isDone
          ? "opacity-60 bg-muted/20 border-border/40"
          : "bg-card border-black/5 dark:border-white/5 shadow-sm"
      }`}
    >
      {/* Drag Handle */}
      {!isSelectedDayPast && !isDone && (
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 -ms-2 p-1 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors cursor-grab active:cursor-grabbing outline-none"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      <span className="text-xs font-bold w-16 shrink-0 text-start">{formatTime(ts, lang)}</span>

      <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[#007AFF]">{initials}</span>
      </div>

      <div className="flex-1 min-w-0 text-start">
        <div className="flex items-center gap-1.5 flex-wrap">
          {appt.patientId ? (
            <Link
              href={`/dashboard/patients/${appt.patientId}`}
              className="font-semibold text-sm hover:text-[#007AFF] transition-colors"
            >
              {appt.patientName}
            </Link>
          ) : (
            <span className="font-semibold text-sm truncate">{appt.patientName}</span>
          )}
          {appt.source === "online" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 px-1.5 py-0.5 rounded-full">
              {t("dashboard.online")}
            </span>
          ) : appt.source === "installment" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#AF52DE]/10 text-[#AF52DE] border border-[#AF52DE]/20 px-1.5 py-0.5 rounded-full">
              {t("schedule.installment")}
            </span>
          ) : appt.source === "follow-up" ? (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#FF9500]/10 text-[#FF9500] border border-[#FF9500]/20 px-1.5 py-0.5 rounded-full">
              {t("schedule.followUp")}
            </span>
          ) : (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted/60 text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
              {t("dashboard.manual")}
            </span>
          )}
          {tag === "current" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#34c759]/15 text-[#34c759] border border-[#34c759]/30 px-1.5 py-0.5 rounded-full">
              Current
            </span>
          )}
          {tag === "next" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30 px-1.5 py-0.5 rounded-full">
              Next
            </span>
          )}
          {appt.status === "pending" && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded-full">
              {lang === "ar" ? "قيد الانتظار" : "Pending"}
            </span>
          )}
        </div>
        {appt.patientPhone && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">{appt.patientPhone}</p>
        )}
      </div>

      {isDone ? (
        <Badge className="text-[10px] border bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shrink-0">
          {t("dashboard.done")}
        </Badge>
      ) : (
        <div className="flex items-center gap-1 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            {!isSelectedDayPast ? (
              <>
                <button
                  onClick={onComplete}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#007AFF] border border-[#007AFF]/30 px-2 py-1 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {t("dashboard.openVisit")}
                </button>
                <button
                  onClick={onReminder}
                  title={t("schedule.reminderWhatsAppTitle")}
                  className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                {appt.status === "pending" && onConfirm && (
                  <button
                    onClick={onConfirm}
                    title={t("common.confirm") || "Confirm"}
                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    title={t("schedule.reschedule") || "Reschedule"}
                    className={`p-1.5 rounded-lg transition-colors ${isinstallmentVisit ? "text-[#AF52DE] hover:bg-[#AF52DE]/10" : "text-[#007AFF] hover:bg-[#007AFF]/10"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
                {canCancel && !isinstallmentVisit && (
                  <button
                    onClick={onCancel}
                    title={t("schedule.cancelTitle") || "Cancel"}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            ) : (
              <>
                <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                  {t("schedule.missed")}
                </Badge>
                {canReschedule && (
                  <button
                    onClick={onReschedule}
                    title={t("schedule.reschedule") || "Reschedule"}
                    className={`p-1.5 rounded-lg transition-colors ${isinstallmentVisit ? "text-[#AF52DE] hover:bg-[#AF52DE]/10" : "text-[#007AFF] hover:bg-[#007AFF]/10"}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
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
                {!isSelectedDayPast ? (
                  <>
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
                        <span>{t("schedule.reschedule") || "Reschedule"}</span>
                      </DropdownMenuItem>
                    )}
                    {onMove && (
                      <DropdownMenuItem onClick={onMove} className="gap-2 cursor-pointer font-medium text-[#FF9500] focus:text-[#FF9500] focus:bg-[#FF9500]/10">
                        <ArrowUpDown className="w-4 h-4" />
                        <span>{lang === "ar" ? "نقل إلى موعد" : "Move to slot"}</span>
                      </DropdownMenuItem>
                    )}
                    {canCancel && !isinstallmentVisit && (
                      <DropdownMenuItem onClick={onCancel} className="gap-2 cursor-pointer font-medium text-red-500 focus:text-red-500 focus:bg-red-500/10">
                        <XCircle className="w-4 h-4" />
                        <span>{t("common.cancel") || "Cancel"}</span>
                      </DropdownMenuItem>
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem disabled className="gap-2 font-medium text-amber-600">
                      <Badge className="text-[10px] border bg-amber-500/10 text-amber-600 border-amber-500/30">
                        {t("schedule.missed")}
                      </Badge>
                    </DropdownMenuItem>
                    {canReschedule && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onReschedule} className={`gap-2 cursor-pointer font-medium ${isinstallmentVisit ? "text-[#AF52DE] focus:text-[#AF52DE] focus:bg-[#AF52DE]/10" : "text-[#007AFF] focus:text-[#007AFF] focus:bg-[#007AFF]/10"}`}>
                          <RefreshCw className="w-4 h-4" />
                          <span>{t("schedule.reschedule") || "Reschedule"}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
});
