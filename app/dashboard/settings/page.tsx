"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Link as LinkIcon, Globe, Palette, CalendarDays, Bot, CheckCircle2, Loader2, Unlink, AlertTriangle, X, Bell } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { MessageTemplatesSection } from "@/components/message-templates-section";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";
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

  // ── Telegram / Elliot ──
  const telegramStatus = useQuery(api.telegram.getTelegramStatus, clerkId ? { clerkId } : "skip");
  const unlinkTelegram = useMutation(api.telegram.unlinkTelegram);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    if (!clerkId) return;
    setRevoking(true);
    try {
      await unlinkTelegram({ clerkId });
      toast.success(t("elliot.unlinkedToast"));
    } catch {
      toast.error(t("elliot.unlinkFailed"));
    } finally {
      setRevoking(false);
    }
  }

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
    workingDays?: string[];
    workingHoursStart?: number;
    workingHoursEnd?: number;
    isAlwaysOpen?: boolean;
    slotMin?: number;
  };
  const [pendingAvailability, setPendingAvailability] = useState<AvailabilityUpdates | null>(null);
  const [conflictReason, setConflictReason] = useState<"days" | "hours">("days");

  function requestAvailabilityChange(updates: AvailabilityUpdates) {
    if (upcomingVisits === undefined) {
      toast.info("Please wait while we check your schedule...");
      return;
    }

    const isDaysChange = updates.workingDays !== undefined;
    const isHoursChange = updates.workingHoursStart !== undefined || updates.workingHoursEnd !== undefined || updates.isAlwaysOpen !== undefined;

    const newDays = updates.workingDays ?? workingDays;
    const newAlwaysOpen = updates.isAlwaysOpen ?? isAlwaysOpen;
    const newStart = newAlwaysOpen ? 0 : (updates.workingHoursStart ?? Number(workingHoursStart));
    const newEnd = newAlwaysOpen ? 24 : (updates.workingHoursEnd ?? Number(workingHoursEnd));

    const conflicts = upcomingVisits.filter(v => {
      if (v.status !== "confirmed" || new Date(v.date).getTime() <= Date.now()) return false;
      const vDate = new Date(v.date);
      const dayName = vDate.toLocaleDateString("en-US", { weekday: "short" });
      const timeInHours = vDate.getHours() + vDate.getMinutes() / 60;

      // Day conflict: visit falls on a day being removed
      if (isDaysChange && newDays.length > 0 && !newDays.includes(dayName)) return true;

      // Hour conflict: visit falls outside new working hours window
      if (isHoursChange && !newAlwaysOpen && (timeInHours < newStart || timeInHours >= newEnd)) return true;

      return false;
    });

    if (conflicts.length > 0) {
      setConflictReason(isHoursChange ? "hours" : "days");
      setPendingAvailability(updates);
      setConflictingVisits(conflicts);
      setReschedulePromptOpen(true);
    } else {
      applyAvailabilityChange(updates);
    }
  }

  function applyAvailabilityChange(updates: AvailabilityUpdates) {
    if (updates.workingDays !== undefined) setWorkingDays(updates.workingDays);
    if (updates.workingHoursStart !== undefined) setWHS(String(updates.workingHoursStart));
    if (updates.workingHoursEnd !== undefined) setWHE(String(updates.workingHoursEnd));
    if (updates.isAlwaysOpen !== undefined) setIsAlwaysOpen(updates.isAlwaysOpen);
    if (updates.slotMin !== undefined) setSlotMin(String(updates.slotMin));
  }

  function handleToggleWorkingDay(d: string) {
    if (workingDays.includes(d)) {
      // Removing a day → check for conflicts with upcoming visits
      requestAvailabilityChange({ workingDays: workingDays.filter(x => x !== d) });
    } else {
      // Adding a day → can never create conflicts, apply directly
      setWorkingDays(prev => [...prev, d]);
    }
  }

  async function handleReschedule(direction: "before" | "after" | "futureDate") {
    setRescheduling(true);
    try {
      const updates: { visitId: any; newDate: number }[] = [];
      const newDays = pendingAvailability?.workingDays ?? workingDays;
      const newAlwaysOpen = pendingAvailability?.isAlwaysOpen ?? isAlwaysOpen;
      const newStartH = newAlwaysOpen ? 0 : (pendingAvailability?.workingHoursStart ?? Number(workingHoursStart));

      for (const v of conflictingVisits) {
        const attempt = new Date(v.date);
        let foundMs: number | null = null;

        // Search up to 60 days forward or backward
        for (let i = 0; i < 60; i++) {
          if (direction === "before") attempt.setDate(attempt.getDate() - 1);
          else attempt.setDate(attempt.getDate() + 1);

          const dayName = attempt.toLocaleDateString("en-US", { weekday: "short" });
          if (newDays.length === 0 || newDays.includes(dayName)) {
            attempt.setHours(newStartH || 9, 0, 0, 0);
            foundMs = attempt.getTime();
            break;
          }
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
        publicProfile,
        workingDays: workingDays.length > 0 ? workingDays : undefined,
        feePerVisit: consultationFee ? Number(consultationFee) : undefined,
      });
      toast.success(t("toast.settingsSaved"));
    } catch { toast.error(t("toast.settingsSaveFailed")); }
  }, [clerkId, currentUser, name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile, workingDays, consultationFee, updateProfile, t]);

  function triggerSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1000);
  }

  // Trigger save on any field change (skip initial load)
  const prevValues = useRef("");
  useEffect(() => {
    if (!initialised.current) return;
    const key = JSON.stringify({ name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile, workingDays, consultationFee });
    if (prevValues.current && key !== prevValues.current) {
      triggerSave();
    }
    prevValues.current = key;
  }, [name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile, workingDays, consultationFee]);

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
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
        {/* VISIBILITY                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.visibilitySection") || "Visibility"}</h3>
          <div className={blockClass}>
            <div className={`${rowClass} !py-5`}>
              <div>
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#007AFF]" /> {t("settings.publicProfile") || "Public Profile"}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.publicProfileDesc") || "Allow patients to find and book you online."}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center">
                <Switch
                  checked={publicProfile}
                  onCheckedChange={(c) => setPublicProfile(c)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* NOTIFICATIONS                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.notifications") || "Notifications"}</h3>
          <div className={blockClass}>
            <div className={`${rowClass} !py-5`}>
              <div>
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#007AFF]" /> {t("settings.onlineBookingAlerts") || "Online Booking Alerts"}
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.notificationsDesc") || "Get notified immediately when a patient books online"}
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-4">
                <button
                  onClick={() => {
                    if (Notification.permission === "granted") {
                      try {
                        const noti = new window.Notification("Test Notification", {
                          body: "This is a test notification from IbnSina",
                          requireInteraction: true,
                        });
                        navigator.serviceWorker?.getRegistration().then((reg) => {
                          if (reg) reg.showNotification("Test Notification", { body: "This is a test from Service Worker" });
                        });
                      } catch (e) {
                        toast.error("Browser error: " + (e as Error).message);
                      }
                    } else {
                      toast.error("Permission not granted");
                    }
                  }}
                  className="text-xs font-semibold px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Test
                </button>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      const perm = await Notification.requestPermission();
                      if (perm === "granted") {
                        setNotificationsEnabled(true);
                        localStorage.setItem("muteOnlineBookings", "false");
                        toast.success("Notifications enabled");
                      } else {
                        toast.error("Notification permission denied");
                        setNotificationsEnabled(false);
                      }
                    } else {
                      localStorage.setItem("muteOnlineBookings", "true");
                      setNotificationsEnabled(false);
                      toast.success("Notifications muted");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </section>

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
                <label className={labelClass}>
                  <Palette className="w-4 h-4 text-muted-foreground" /> {t("settings.darkMode")}
                </label>
                <div className="flex-1 flex justify-end">
                  <Switch
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
        {/* TELEGRAM / ELLIOT                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("elliot.sectionTitle")}</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              {/* Label */}
              <label className={labelClass}>
                <Bot className="w-4 h-4 text-muted-foreground" />
                {t("elliot.name")}
              </label>

              {/* Right side */}
              <div className="flex items-center gap-3 flex-1 justify-end">
                {telegramStatus === undefined ? (
                  /* Loading */
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : telegramStatus?.linked ? (
                  /* Connected */
                  <>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#34c759] bg-[#34c759]/10 border border-[#34c759]/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      {t("elliot.linked")}
                    </span>
                    <button
                      onClick={handleRevoke}
                      disabled={revoking}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/8 disabled:opacity-50"
                    >
                      {revoking
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Unlink className="w-3.5 h-3.5" />}
                      {t("elliot.unlink")}
                    </button>
                  </>
                ) : (
                  /* Disconnected */
                  <a
                    href={`https://t.me/Elliot_abot?start=connect`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[#007AFF] hover:bg-[#0062cc] transition-colors px-3 py-1.5 rounded-xl whitespace-nowrap"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    {t("elliot.linkBtn")}
                  </a>
                )}
              </div>
            </div>

            {/* Sub-description row */}
            <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
              {telegramStatus?.linked ? t("elliot.ready") : t("elliot.linkDesc")}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE                                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.profileSection")}</h3>
          <div className={blockClass}>

            <div className={`${rowClass} !py-6`}>
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 shadow-sm">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-[#007AFF]">{(name || "?").charAt(0).toUpperCase()}</span>
                  )}
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    {uploadingPhoto ? <IOSSpinner size={16} className="text-white" /> : <Camera className="w-4 h-4 text-white" />}
                  </button>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{name || t("settings.yourName")}</h4>
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="text-[13px] text-[#007AFF] hover:underline mt-0.5">
                    {profilePhotoUrl ? t("settings.changePhoto") : t("settings.uploadPhoto")}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                </div>
              </div>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.fullName")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.placeholderFullName")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.specialty")}</label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={`${inputClass} sm:text-right appearance-none bg-transparent cursor-pointer`}>
                <option value="">{t("settings.selectSpecialty")}</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.credentials")}</label>
              <input value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder={t("settings.placeholderCredentials")} className={inputClass} />
            </div>

            <div className={`${rowClass} flex-col !items-start`}>
              <label className={labelClass}>{t("settings.shortBio")}</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder={t("settings.placeholderBio")}
                className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/60 resize-none mt-2" />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mt-[-20px] mb-8">
            {t("settings.profileHint")}
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLINIC & LOCATION                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.clinicSection")}</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label className={labelClass}>{t("settings.clinicName")}</label>
              <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder={t("settings.placeholderClinic")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.phoneWhatsapp")}</label>
              <div className="flex items-center gap-1 flex-1 justify-end" dir="ltr">
                <span className="text-muted-foreground text-sm">+20</span>
                <input type="tel" value={phone.replace(/^\+?20/, "").replace(/^0/, "")}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="1142529590"
                  className={`${inputClass} !flex-none w-[120px] sm:w-[150px] !text-left`} />
              </div>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.mapsLink")}</label>
              <input value={clinicAddressLink} onChange={(e) => setClinicAddressLink(e.target.value)}
                placeholder="https://maps.google.com/..." className={inputClass} dir="ltr" />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.addressText")}</label>
              <input value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                placeholder={t("settings.placeholderAddress")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.feeEgp")}</label>
              <input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)}
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

            {/* Working Days Picker */}
            <div className={`${rowClass} flex-col !items-start gap-3`}>
              <label className={`${labelClass} flex items-center gap-2`}>
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                {t("settings.workingDays")}
              </label>
              <div className="flex flex-wrap gap-1.5 w-full">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleToggleWorkingDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${workingDays.includes(d)
                        ? "bg-[#007AFF] text-white border-[#007AFF]"
                        : "border-border hover:border-[#007AFF]/40 text-muted-foreground"
                      }`}
                  >
                    {t(`days.${d}`) || d}
                  </button>
                ))}
              </div>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.open247")}</label>
              <div className="flex-1 flex justify-end">
                <Switch checked={isAlwaysOpen} onCheckedChange={(c) => requestAvailabilityChange({ isAlwaysOpen: c })} />
              </div>
            </div>

            {!isAlwaysOpen && (
              <>
                <div className={rowClass}>
                  <label className={labelClass}>{t("settings.opensAt")}</label>
                  <select value={workingHoursStart} onChange={(e) => requestAvailabilityChange({ workingHoursStart: Number(e.target.value) })} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
                <div className={rowClass}>
                  <label className={labelClass}>{t("settings.closesAt")}</label>
                  <select value={workingHoursEnd} onChange={(e) => requestAvailabilityChange({ workingHoursEnd: Number(e.target.value) })} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className={rowClass}>
              <label className={labelClass}>{t("settings.slotDurationLabel")}</label>
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <input type="number" value={slotMin} onChange={(e) => setSlotMin(e.target.value)} min={5} max={120} className={`${inputClass} !flex-none w-16 sm:text-right`} dir="ltr" />
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
