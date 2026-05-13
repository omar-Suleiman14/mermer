"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface VisitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  patientId: Id<"patients">;
  patientName: string;
}

export function VisitDrawer({ open, onOpenChange, clerkId, patientId, patientName }: VisitDrawerProps) {
  const { t } = useI18n();
  const now = new Date();
  const [form, setForm] = useState({
    visitDate: now.toLocaleDateString("en-CA"),
    visitTime: now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
    reasonForVisit: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const createVisit = useMutation(api.visits.createVisit);

  function set(field: string, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleOpen(v: boolean) {
    if (v) {
      const n = new Date();
      setForm({
        visitDate: n.toLocaleDateString("en-CA"),
        visitTime: n.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" }),
        reasonForVisit: "",
        notes: "",
      });
    }
    onOpenChange(v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await createVisit({
        clerkId,
        patientId,
        date: new Date(`${form.visitDate}T${form.visitTime}`).getTime(),
        source: "manual",
        reasonForVisit: form.reasonForVisit || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Visit recorded");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save visit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader>
          <DrawerTitle>{t("visit.newVisit")}</DrawerTitle>
          <DrawerDescription>{t("visit.recordingFor")} {patientName}</DrawerDescription>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-4 space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="visit-date">{t("visit.visitDate")}</Label>
                <input
                  id="visit-date"
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => set("visitDate", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visit-time">{t("visit.visitTime")}</Label>
                <input
                  id="visit-time"
                  type="time"
                  value={form.visitTime}
                  onChange={(e) => set("visitTime", e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visit-reason">{t("visit.reasonForVisit")}</Label>
              <input
                id="visit-reason"
                type="text"
                value={form.reasonForVisit}
                onChange={(e) => set("reasonForVisit", e.target.value)}
                placeholder="e.g. Follow-up, checkup, acute complaint…"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="visit-notes">{t("visit.notes")}</Label>
              <textarea
                id="visit-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional free-form notes..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none"
              />
            </div>
          </div>
        </form>

        <DrawerFooter className="flex flex-row gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[#007AFF] text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {loading ? t("onboarding.saving") : t("visit.saveVisit")}
          </button>
          <DrawerClose className="flex-shrink-0 text-sm text-muted-foreground border border-border rounded-lg px-4 py-2.5 hover:text-foreground">
            {t("common.cancel")}
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
