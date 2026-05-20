"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Link as LinkIcon, Globe, Palette, CalendarDays, AlertTriangle, X, Bell } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { MessageTemplatesSection } from "@/components/message-templates-section";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";
import React from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { motion, AnimatePresence } from "framer-motion";

// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return "20" + digits;
  if (digits.length === 10) return "20" + digits;
  return digits;
}

const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Dentist",
  "ENT Specialist", "Endocrinologist", "Gastroenterologist", "Neurologist",
  "Obstetrician / Gynecologist", "Ophthalmologist", "Orthopedic Surgeon",
  "Pediatrician", "Psychiatrist", "Pulmonologist", "Radiologist",
  "Rheumatologist", "Surgeon", "Urologist", "Other",
];

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SettingsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const profilePhotoUrl = useQuery(api.users.getProfilePhotoUrl, clerkId ? { clerkId } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);

  // ── Rescheduling non-working days ──
  const [dateRange] = useState(() => {
    const now = Date.now();
    return { startDate: now, endDate: now + 30 * 86400000 };
  });

  const upcomingVisits = useQuery(api.visits.getVisitsByDateRange, clerkId ? {
    clerkId,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  } : "skip");
  const bulkReschedule = useMutation(api.visits.bulkRescheduleVisits);

  const [reschedulePromptOpen, setReschedulePromptOpen] = useState(false);
  const [conflictingVisits, setConflictingVisits] = useState<any[]>([]);
  const [rescheduling, setRescheduling] = useState(false);

  type AvailabilityUpdates = {
    workingHoursStart?: number;
    workingHoursEnd?: number;
    isAlwaysOpen?: boolean;
    slotMin?: number;
  };
  const [pendingAvailability, setPendingAvailability] = useState<AvailabilityUpdates | null>(null);
  const [conflictReason, setConflictReason] = useState<"hours">("hours");

  function requestAvailabilityChange(updates: AvailabilityUpdates) {
    if (upcomingVisits === undefined) {
      toast.info("Please wait while we check your schedule...");
      return;
    }

    const isHoursChange = updates.workingHoursStart !== undefined || updates.workingHoursEnd !== undefined || updates.isAlwaysOpen !== undefined;

    const newAlwaysOpen = updates.isAlwaysOpen ?? isAlwaysOpen;
    const newStart = newAlwaysOpen ? 0 : (updates.workingHoursStart ?? Number(workingHoursStart));
    const newEnd = newAlwaysOpen ? 24 : (updates.workingHoursEnd ?? Number(workingHoursEnd));

    const conflicts = upcomingVisits.filter(v => {
      if (v.status !== "confirmed" || new Date(v.date).getTime() <= Date.now()) return false;
      const vDate = new Date(v.date);
      const timeInHours = vDate.getHours() + vDate.getMinutes() / 60;

      // Hour conflict: visit falls outside new working hours window
      if (isHoursChange && !newAlwaysOpen && (timeInHours < newStart || timeInHours >= newEnd)) return true;

      return false;
    });

    if (conflicts.length > 0) {
      setConflictReason("hours");
      setPendingAvailability(updates);
      setConflictingVisits(conflicts);
      setReschedulePromptOpen(true);
    } else {
      applyAvailabilityChange(updates);
    }
  }

  function applyAvailabilityChange(updates: AvailabilityUpdates) {
    if (updates.workingHoursStart !== undefined) setWHS(String(updates.workingHoursStart));
    if (updates.workingHoursEnd !== undefined) setWHE(String(updates.workingHoursEnd));
    if (updates.isAlwaysOpen !== undefined) setIsAlwaysOpen(updates.isAlwaysOpen);
    if (updates.slotMin !== undefined) setSlotMin(String(updates.slotMin));
  }

  async function handleReschedule(direction: "before" | "after" | "futureDate") {
    setRescheduling(true);
    try {
      const updates: { visitId: any; newDate: number }[] = [];
      const newAlwaysOpen = pendingAvailability?.isAlwaysOpen ?? isAlwaysOpen;
      const newStartH = newAlwaysOpen ? 0 : (pendingAvailability?.workingHoursStart ?? Number(workingHoursStart));

      for (const v of conflictingVisits) {
        const attempt = new Date(v.date);
        let foundMs: number | null = null;

        // Search up to 60 days forward or backward
        for (let i = 0; i < 60; i++) {
          if (direction === "before") attempt.setDate(attempt.getDate() - 1);
          else attempt.setDate(attempt.getDate() + 1);

          attempt.setHours(newStartH || 9, 0, 0, 0);
          foundMs = attempt.getTime();
          break;
        }

        if (foundMs !== null) {
          updates.push({ visitId: v._id, newDate: foundMs });
        }
      }

      await bulkReschedule({ clerkId, updates });
      toast.success(t("toast.rescheduledSuccessfully") || "Visits rescheduled automatically");

      if (pendingAvailability) applyAvailabilityChange(pendingAvailability);
      setPendingAvailability(null);
      setReschedulePromptOpen(false);
    } catch {
      toast.error(t("toast.rescheduleFailed") || "Failed to reschedule visits");
    } finally {
      setRescheduling(false);
    }
  }

  // ── State ──
  const [selectKey, setSelectKey] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [credentials, setCredentials] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicAddressLink, setClinicAddressLink] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [workingHoursStart, setWHS] = useState("9");
  const [workingHoursEnd, setWHE] = useState("17");
  const [isAlwaysOpen, setIsAlwaysOpen] = useState(false);
  const [slotMin, setSlotMin] = useState("30");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Load user data
  useEffect(() => {
    if (!currentUser || initialised.current) return;
    initialised.current = true;
    setName(currentUser.name ?? "");
    setPhone(currentUser.phone ?? "");
    setClinicName(currentUser.clinicName ?? "");
    setSpecialty(currentUser.specialty ?? "");
    setCredentials(currentUser.credentials ?? "");
    setClinicAddress((currentUser as any).clinicAddress ?? "");
    setClinicAddressLink((currentUser as any).clinicAddressLink ?? "");
    setConsultationFee(String((currentUser as any).consultationFee ?? ""));
    setWHS(String((currentUser as any).workingHoursStart ?? 9));
    setWHE(String((currentUser as any).workingHoursEnd ?? 17));
    setIsAlwaysOpen((currentUser as any).workingHoursStart === 0 && (currentUser as any).workingHoursEnd === 24);
    setSlotMin(String(currentUser.slotDurationMinutes ?? 30));
    setWorkingDays((currentUser as any).availableDays ?? []);
    setBio((currentUser as any).bio ?? "");
    setPublicProfile(currentUser.publicProfile ?? false);
  }, [currentUser]);

  // ── Auto-save (1s debounce) ──
  const doSave = useCallback(async () => {
    if (!currentUser) return;
    try {
      await updateProfile({
        clerkId,
        name: name || currentUser.name,
        phone: normalisePhone(phone || currentUser.phone),
        clinicName: clinicName || currentUser.clinicName,
        specialty: specialty || undefined,
        credentials: credentials || undefined,
        clinicAddress: clinicAddress || undefined,
        clinicAddressLink: clinicAddressLink || undefined,
        workingHoursStart: isAlwaysOpen ? 0 : Number(workingHoursStart),
        workingHoursEnd: isAlwaysOpen ? 24 : Number(workingHoursEnd),
        slotDurationMinutes: slotMin ? Number(slotMin) : 30,
        bio: bio || undefined,
        publicProfile: false,
        feePerVisit: consultationFee ? Number(consultationFee) : undefined,
      });
      toast.success(t("toast.settingsSaved"), { id: "settings-save" });
    } catch { toast.error(t("toast.settingsSaveFailed"), { id: "settings-save-error" }); }
  }, [clerkId, currentUser, name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, consultationFee, updateProfile, t]);

  function triggerSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 2000);
  }

  // Trigger save on any field change (skip initial load)
  const prevValues = useRef("");
  useEffect(() => {
    if (!initialised.current) return;
    const key = JSON.stringify({ name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, consultationFee });
    if (prevValues.current && key !== prevValues.current) {
      triggerSave();
    }
    prevValues.current = key;
  }, [name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, consultationFee]);

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl({ clerkId: user.id });
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await saveProfilePhoto({ clerkId, storageId: storageId as Id<"_storage"> });
      toast.success(t("toast.photoUpdated"));
    } catch { toast.error(t("toast.photoUploadFailed")); }
    finally { setUploadingPhoto(false); }
  }

  const blockClass = "bg-card border border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden mb-8";
  const rowClass = "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 transition-colors focus-within:bg-muted/10 hover:bg-muted/5";
  const labelClass = "text-sm font-medium flex items-center gap-2 flex-shrink-0 min-w-[140px]";
  const inputClass = "flex-1 w-full bg-transparent text-sm sm:text-right focus:outline-none placeholder:text-muted-foreground/60 focus:text-[#007AFF] transition-colors";
  const sectionTitleClass = "text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 ms-4";

  return (
    <div className="flex flex-col h-full bg-muted/20" suppressHydrationWarning>
      <PageHeader title={t("settings.title")} description={t("settings.pageDescription")} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full pb-20">


        {/* ═══════════════════════════════════════════════════════════ */}
        {/* APPEARANCE & LANGUAGE                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.appearanceSection")}</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label className={labelClass}>
                <Globe className="w-4 h-4 text-muted-foreground" /> {t("settings.language")}
              </label>
              <div className="flex-1 flex justify-end">
                <LanguageToggle />
              </div>
            </div>
            {mounted && (
              <div className={rowClass}>
                <label htmlFor="settings-dark-mode" className={labelClass}>
                  <Palette className="w-4 h-4 text-muted-foreground" /> {t("settings.darkMode")}
                </label>
                <div className="flex-1 flex justify-end">
                  <Switch
                    id="settings-dark-mode"
                    name="darkMode"
                    checked={theme === "dark"}
                    onCheckedChange={(c) => setTheme(c ? "dark" : "light")}
                  />
                </div>
              </div>
            )}
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mt-[-20px] mb-8">
            {t("settings.appearanceHint")}
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE                                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Profile Settings Hidden for Now */}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLINIC & LOCATION                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.clinicSection")}</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label htmlFor="settings-clinic-name" className={labelClass}>{t("settings.clinicName")}</label>
              <input id="settings-clinic-name" name="clinicName" value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder={t("settings.placeholderClinic")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-phone" className={labelClass}>{t("settings.phoneWhatsapp")}</label>
              <div className="flex items-center gap-1 flex-1 justify-end" dir="ltr">
                <span className="text-muted-foreground text-sm">+20</span>
                <input id="settings-phone" name="phone" type="tel" value={phone.replace(/^\+?20/, "").replace(/^0/, "")}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="1142529590"
                  className={`${inputClass} !flex-none w-[120px] sm:w-[150px] !text-left`} />
              </div>
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-maps-link" className={labelClass}>{t("settings.mapsLink")}</label>
              <input id="settings-maps-link" name="mapsLink" value={clinicAddressLink} onChange={(e) => setClinicAddressLink(e.target.value)}
                placeholder="https://maps.google.com/..." className={inputClass} dir="ltr" />
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-address" className={labelClass}>{t("settings.addressText")}</label>
              <input id="settings-address" name="address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                placeholder={t("settings.placeholderAddress")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-fee" className={labelClass}>{t("settings.feeEgp")}</label>
              <input id="settings-fee" name="fee" type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="350" className={inputClass} />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mt-[-20px] mb-8">
            {t("settings.clinicHint")}
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SCHEDULE                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.availabilitySection")}</h3>
          <div className={blockClass}>


            <div className={rowClass}>
              <label htmlFor="settings-open-247" className={labelClass}>{t("settings.open247")}</label>
              <div className="flex-1 flex justify-end">
                <Switch id="settings-open-247" name="open247" checked={isAlwaysOpen} onCheckedChange={(c) => requestAvailabilityChange({ isAlwaysOpen: c })} />
              </div>
            </div>

            {!isAlwaysOpen && (
              <React.Fragment key={selectKey}>
                <div className={rowClass}>
                  <label htmlFor="settings-opens-at" className={labelClass}>{t("settings.opensAt")}</label>
                  <select id="settings-opens-at" name="opensAt" value={workingHoursStart} onChange={(e) => requestAvailabilityChange({ workingHoursStart: Number(e.target.value) })} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
                <div className={rowClass}>
                  <label htmlFor="settings-closes-at" className={labelClass}>{t("settings.closesAt")}</label>
                  <select id="settings-closes-at" name="closesAt" value={workingHoursEnd} onChange={(e) => requestAvailabilityChange({ workingHoursEnd: Number(e.target.value) })} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
              </React.Fragment>
            )}

            <div className={rowClass}>
              <label htmlFor="settings-slot-duration" className={labelClass}>{t("settings.slotDurationLabel")}</label>
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <input id="settings-slot-duration" name="slotDuration" type="number" value={slotMin} onChange={(e) => setSlotMin(e.target.value)} min={5} max={120} className={`${inputClass} !flex-none w-16 sm:text-right`} dir="ltr" />
                <span className="text-sm text-muted-foreground">{t("settings.mins")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MESSAGE TEMPLATES                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.msgTemplates")}</h3>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-2">
            <div className="p-4">
              <MessageTemplatesSection clerkId={clerkId} clinicAddressLink={clinicAddressLink} />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mb-8">
            {t("settings.messageTemplatesHint")}{" "}
            <span className="font-mono bg-card px-1 border border-border rounded text-[#007AFF] text-xs">@</span>{" "}
            {t("settings.messageTemplatesHintAfter")}
          </p>
        </section>

      </div>

      {/* Reschedule Prompt */}
      <AnimatePresence>
        {reschedulePromptOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="w-full">
                  <h3 className="text-base font-semibold">Reschedule Required</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed mb-3">
                    You have <strong className="text-foreground">{new Set(conflictingVisits.map(v => v.date)).size} upcoming appointment(s)</strong> scheduled outside your newly requested {conflictReason === "hours" ? "working hours" : "working days"}:
                  </p>
                  
                  <div className="max-h-32 overflow-y-auto bg-background/50 border border-border rounded-lg p-2 space-y-1 w-full text-left">
                    {Array.from(new Map(conflictingVisits.map(v => [v.date, v])).values()).map((v: any) => (
                      <div key={v._id} className="text-xs text-muted-foreground flex items-center justify-between p-1.5 hover:bg-muted/30 rounded">
                        <span className="font-medium text-foreground">
                          {new Date(v.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="truncate ml-2 max-w-[120px]">{v.reasonForVisit || "Visit"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-muted/30 p-5 border-t border-border space-y-2">
                <button
                  onClick={() => handleReschedule("before")}
                  disabled={rescheduling}
                  className="w-full text-left px-4 py-3 bg-background border border-border rounded-xl hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5 transition-colors disabled:opacity-60"
                >
                  <p className="text-sm font-semibold text-foreground">Back Date</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically moves visits to the closest previous available day.</p>
                </button>
                <button
                  onClick={() => handleReschedule("after")}
                  disabled={rescheduling}
                  className="w-full text-left px-4 py-3 bg-background border border-border rounded-xl hover:border-[#007AFF]/50 hover:bg-[#007AFF]/5 transition-colors disabled:opacity-60"
                >
                  <p className="text-sm font-semibold text-foreground">Future Date</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Automatically moves visits to the closest next available day.</p>
                </button>

              </div>
              <div className="p-4 border-t border-border flex justify-end">
                <button
                  onClick={() => {
                    setReschedulePromptOpen(false);
                    setPendingAvailability(null);
                    setSelectKey(k => k + 1);
                  }}
                  disabled={rescheduling}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/40 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
