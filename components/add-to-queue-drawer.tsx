"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import dynamic from "next/dynamic";
const PatientIntakeDrawer = dynamic(() =>
  import("@/components/patient-intake-drawer").then((m) => m.PatientIntakeDrawer)
);
import { toast } from "sonner";
import { IOSSpinner } from "./ui/spinner";
import { openWhatsApp } from "@/lib/scheduling";
import { Search, UserPlus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { motion, AnimatePresence } from "framer-motion";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";

interface AddToQueueDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clerkId: string;
  selectedDate?: number; // midnight timestamp of the target day
  /** If provided, booking goes into this specific slot */
  preselectedSlot?: number | null;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AddToQueueDrawer({
  open,
  onOpenChange,
  clerkId,
  selectedDate,
  preselectedSlot,
}: AddToQueueDrawerProps) {
  // eslint-disable-next-line react-hooks/purity
  const dayTs = selectedDate ?? startOfDay(Date.now());
  const { t, dir, lang } = useI18n();
  const isDesktop = useIsDesktop();
  const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();

  // ── Search ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [intakeOpen, setIntakeOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Snap points — taller snap when keyboard is open so content stays visible
  const snapPoints = isKeyboardOpen ? [0.95] : [0.55, 0.92];

  const patients = useQuery(
    api.patients.searchPatients,
    clerkId ? { clerkId, search } : "skip"
  );
  const addManualAppointment = useMutation(api.appointments.addManualAppointment);

  // Focus search after the sheet has animated in (avoids keyboard popping mid-animation)
  useEffect(() => {
    if (open && !isDesktop) {
      const timer = setTimeout(() => searchRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [open, isDesktop]);

  function resetState() {
    setSearch("");
  }

  async function handleSelectPatient(patientId: Id<"patients">) {
    const bookingTime = preselectedSlot ?? dayTs;
    try {
      await addManualAppointment({
        clerkId,
        patientId,
        date: bookingTime,
      });
      toast.success(
        preselectedSlot
          ? `تم الحجز بنجاح في ${formatTime(preselectedSlot)}`
          : "تمت إضافة المريض للجدول"
      );
      onOpenChange(false);
      resetState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already booked")) {
        toast.error(lang === "ar" ? "هذا الوقت محجوز مسبقاً — اختر وقتاً آخر" : "This time slot is already reserved — choose another");
      } else {
        toast.error(lang === "ar" ? "حدث خطأ، يرجى المحاولة مرة أخرى" : "An error occurred, please try again");
      }
    }
  }

  const formContent = (
    <div className="flex flex-col flex-1 overflow-hidden" dir={dir}>
      {/* Search */}
      <div className="px-6 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("drawer.searchByNamePhone") || "Search by name or phone..."}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-shadow"
          />
        </div>
      </div>

      {/* Patient list */}
      <div className="px-6 overflow-y-auto flex-1 space-y-1.5 pb-4 min-h-[200px] max-h-[45vh]">
        {patients === undefined ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Loading...
          </p>
        ) : patients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {search
                ? (t("patients.noResults")?.replace("{q}", search) || `No results for "${search}"`)
                : (t("patients.noPatients") || "No patients yet")}
            </p>
          </div>
        ) : (
          patients.map((p) => (
            <button
              key={p._id}
              onClick={() => handleSelectPatient(p._id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[#007AFF]">
                  {p.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:text-[#007AFF]">
                  {p.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.age}y · {p.phone}
                </p>
              </div>
              <UserPlus className="w-4 h-4 text-muted-foreground group-hover:text-[#007AFF] shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* New patient */}
      <div className="px-6 py-4 border-t border-border bg-muted/20">
        <button
          onClick={() => {
            onOpenChange(false);
            setTimeout(() => setIntakeOpen(true), 150);
          }}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#007AFF] hover:underline py-1.5"
        >
          <UserPlus className="w-4 h-4" />
          {t("drawer.newPatientCreate") || "New patient — create profile"}
        </button>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex flex-row border-t border-border px-6 py-4">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="w-full text-sm text-muted-foreground border border-border rounded-xl py-2.5 hover:bg-muted/40 transition-colors"
      >
        {t("common.cancel") || "Cancel"}
      </button>
    </div>
  );

  // ── DESKTOP: centered modal popup ─────────────────────────────────────────
  if (isDesktop) {
    return (
      <>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              dir={dir}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
              />
              {/* Panel */}
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border mb-4">
                  <div>
                    <h2 className="text-base font-semibold">{t("drawer.addToSchedule") || "Add Patient to Schedule"}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {preselectedSlot
                        ? (t("drawer.bookingFor")?.replace("{time}", formatTime(preselectedSlot)) || `Booking for ${formatTime(preselectedSlot)} — select a patient below.`)
                        : "Search for a patient or create a new one."}
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {formContent}
                {footerContent}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <PatientIntakeDrawer
          open={intakeOpen}
          onOpenChange={(v) => {
            setIntakeOpen(v);
            if (!v) resetState();
          }}
          clerkId={clerkId}
        />
      </>
    );
  }

  // ── MOBILE: bottom drawer ──────────────────────────────────────────────────
  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(v) => {
          if (!v) resetState();
          onOpenChange(v);
        }}
        snapPoints={snapPoints}
      >
        <DrawerContent
          dir={dir}
          // Shift the sheet up when keyboard is visible so the search input stays reachable
          style={
            isKeyboardOpen && keyboardHeight > 0
              ? { paddingBottom: keyboardHeight }
              : undefined
          }
        >
          <DrawerHeader className="text-start px-6">
            <DrawerTitle>{t("drawer.addToSchedule") || "Add Patient to Schedule"}</DrawerTitle>
            <DrawerDescription>
              {preselectedSlot
                ? (t("drawer.bookingFor")?.replace("{time}", formatTime(preselectedSlot)) || `Booking for ${formatTime(preselectedSlot)} — select a patient below.`)
                : "Search for a patient or create a new one."}
            </DrawerDescription>
          </DrawerHeader>
          {formContent}
          <DrawerFooter className="p-0">
            {footerContent}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <PatientIntakeDrawer
        open={intakeOpen}
        onOpenChange={(v) => {
          setIntakeOpen(v);
          if (!v) resetState();
        }}
        clerkId={clerkId}
      />
    </>
  );
}
