"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Camera, Globe, Palette, AlertTriangle, Bell, Loader2 } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/client";
import { useTheme } from "next-themes";
import { LanguageToggle } from "@/components/language-toggle";
import Image from "next/image";
import { WhatsAppIntegration } from "@/components/settings/whatsapp-integration";





// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return "20" + digits;
  if (digits.length === 10) return "20" + digits;
  return digits;
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Dentist",
  "ENT Specialist", "Endocrinologist", "Gastroenterologist", "Neurologist",
  "Obstetrician / Gynecologist", "Ophthalmologist", "Orthopedic Surgeon",
  "Otolaryngologist (ENT)", "Pediatrician", "Psychiatrist", "Pulmonologist",
  "Radiologist", "Rheumatologist", "Surgeon", "Urologist", "Other",
];

export default function SettingsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang, dir } = useI18n();
  // ── Appearance & Notifications ──
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");

  useEffect(() => {
    setMounted(true);
    if ("Notification" in window) {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const profilePhotoUrl = currentUser?.profilePhotoUrl;
  const updateProfile = useMutation(api.users.updateProfile);
  const updateClinicalPreferences = useMutation(api.users.updateClinicalPreferences);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);

  // ── Rescheduling non-working days ──
  const [reschedulePromptOpen, setReschedulePromptOpen] = useState(false);
  const [conflictingVisits, setConflictingVisits] = useState<any[]>([]);
  const [conflictReason, setConflictReason] = useState<"hours" | "days">("hours");

  const [validatingHours, setValidatingHours] = useState(false);
  const convex = useConvex();

  async function handleHoursChange(newStart?: string, newEnd?: string) {
    const checkStart = newStart !== undefined ? Number(newStart) : Number(workingHoursStart);
    const checkEnd = newEnd !== undefined ? Number(newEnd) : Number(workingHoursEnd);

    if (checkStart >= checkEnd && checkEnd !== 0) {
      toast.error(dir === "rtl" ? "وقت البدء يجب أن يكون قبل وقت الانتهاء" : "Start time must be before end time");
      return;
    }

    setValidatingHours(true);
    try {
      const { conflict, conflictingVisits } = await convex.query(api.visits.checkWorkingHoursConflict, {
        clerkId,
        newStart: checkStart,
        newEnd: checkEnd
      });
      if (conflict) {
        setConflictReason("hours");
        setConflictingVisits(conflictingVisits);
        setReschedulePromptOpen(true);
        toast.error(dir === "rtl" ? "لا يمكنك تقليص ساعات العمل لوجود حجوزات سابقة في هذه الأوقات." : "Cannot restrict hours: you have existing visits outside these bounds.");
        return;
      }

      if (newStart !== undefined) setWHS(newStart);
      if (newEnd !== undefined) setWHE(newEnd);
    } catch (e) {
      console.error(e);
      toast.error(dir === "rtl" ? "حدث خطأ أثناء التحقق من الساعات" : "Error validating hours");
    } finally {
      setValidatingHours(false);
    }
  }

  // ── State ──
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");
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
  const [showClinicLocationOnRx, setShowClinicLocationOnRx] = useState(true);

  // Clinical preferences
  const [enableDiagnosis, setEnableDiagnosis] = useState(false);
  const [enableMeasurements, setEnableMeasurements] = useState(false);
  const [enableVitals, setEnableVitals] = useState(false);
  const [enableNotes, setEnableNotes] = useState(false);
  const [enablePrescription, setEnablePrescription] = useState(true);
  const [clinicScreenShowNames, setClinicScreenShowNames] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  // Load user data
  useEffect(() => {
    if (!currentUser || initialised.current) return;
    initialised.current = true;
    setName(currentUser.name ?? "");
    setPhone(currentUser.phone ?? "");
    setClinicName(currentUser.clinicName ?? "");
    
    const dbSpec = currentUser.specialty ?? "";
    setSpecialty(dbSpec);
    if (!SPECIALTIES.includes(dbSpec) && dbSpec !== "") {
      setCustomSpecialty(dbSpec);
    } else {
      setCustomSpecialty("");
    }

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
    setPublicProfile((currentUser as any).publicProfile ?? false);
    setShowClinicLocationOnRx((currentUser as any).showClinicLocationOnRx ?? true);
    setEnableDiagnosis((currentUser as any).enableDiagnosis ?? false);
    setEnableMeasurements((currentUser as any).enableMeasurements ?? false);
    setEnableVitals((currentUser as any).enableVitals ?? false);
    setEnableNotes((currentUser as any).enableNotes ?? false);
    setEnablePrescription((currentUser as any).enablePrescription ?? true);
    setClinicScreenShowNames((currentUser as any).clinicScreenShowNames ?? false);

  }, [currentUser]);

  const originalKey = useMemo(() => {
    if (!currentUser) return "";
    return JSON.stringify({
      name: currentUser.name ?? "",
      phone: normalisePhone(currentUser.phone ?? ""),
      clinicName: currentUser.clinicName ?? "",
      specialty: SPECIALTIES.includes(currentUser.specialty ?? "") || (currentUser.specialty === "") ? (currentUser.specialty ?? "") : "Other",
      credentials: currentUser.credentials ?? "",
      clinicAddress: (currentUser as any).clinicAddress ?? "",
      clinicAddressLink: (currentUser as any).clinicAddressLink ?? "",
      workingHoursStart: String((currentUser as any).workingHoursStart ?? 9),
      workingHoursEnd: String((currentUser as any).workingHoursEnd ?? 17),
      isAlwaysOpen: (currentUser as any).workingHoursStart === 0 && (currentUser as any).workingHoursEnd === 24,
      slotMin: String(currentUser.slotDurationMinutes ?? 30),
      bio: (currentUser as any).bio ?? "",
      publicProfile: (currentUser as any).publicProfile ?? false,
      consultationFee: String((currentUser as any).consultationFee ?? ""),
      workingDays: (currentUser as any).availableDays ?? [],
      showClinicLocationOnRx: (currentUser as any).showClinicLocationOnRx ?? true,
      clinicScreenShowNames: (currentUser as any).clinicScreenShowNames ?? false,
      enableDiagnosis: (currentUser as any).enableDiagnosis ?? false,
      enableMeasurements: (currentUser as any).enableMeasurements ?? false,
      enableVitals: (currentUser as any).enableVitals ?? false,
      enableNotes: (currentUser as any).enableNotes ?? false,
      enablePrescription: (currentUser as any).enablePrescription ?? true,
      customSpecialty: !SPECIALTIES.includes(currentUser.specialty ?? "") && (currentUser.specialty ?? "") !== "" ? (currentUser.specialty ?? "") : ""
    });
  }, [currentUser]);

  const currentKey = JSON.stringify({
    name,
    phone: normalisePhone(phone),
    clinicName,
    specialty,
    credentials,
    clinicAddress,
    clinicAddressLink,
    workingHoursStart,
    workingHoursEnd,
    isAlwaysOpen,
    slotMin,
    bio,
    publicProfile,
    consultationFee,
    workingDays,
    showClinicLocationOnRx,
    clinicScreenShowNames,
    enableDiagnosis,
    enableMeasurements,
    enableVitals,
    enableNotes,
    enablePrescription,
    customSpecialty: specialty === "Other" ? customSpecialty : ""
  });

  const hasChanges = currentUser && originalKey !== currentKey;

  async function handleSave() {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateProfile({
        clerkId,
        name: name || currentUser.name,
        phone: normalisePhone(phone || currentUser.phone),
        clinicName: clinicName || currentUser.clinicName,
        specialty: specialty === "Other" ? (customSpecialty || "Other") : (specialty || undefined),
        credentials: credentials || undefined,
        clinicAddress: clinicAddress || undefined,
        clinicAddressLink: clinicAddressLink || undefined,
        workingHoursStart: isAlwaysOpen ? 0 : Number(workingHoursStart),
        workingHoursEnd: isAlwaysOpen ? 24 : Number(workingHoursEnd),
        slotDurationMinutes: slotMin ? Number(slotMin) : 30,
        bio: bio || undefined,
        publicProfile: publicProfile,
        feePerVisit: consultationFee ? Number(consultationFee) : undefined,
        workingDays: workingDays,
        showClinicLocationOnRx: showClinicLocationOnRx,
        clinicScreenShowNames: clinicScreenShowNames,
      });
      await updateClinicalPreferences({
        clerkId,
        enableDiagnosis,
        enableMeasurements,
        enableVitals,
        enableNotes,
        enablePrescription,
      });
      toast.success(t("toast.settingsSaved") || (dir === "rtl" ? "تم حفظ الإعدادات" : "Settings saved"));
    } catch { 
      toast.error(t("toast.settingsSaveFailed") || (dir === "rtl" ? "فشل حفظ الإعدادات" : "Failed to save settings")); 
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl({ clerkId });
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await saveProfilePhoto({ clerkId, storageId: storageId as Id<"_storage"> });
      toast.success(t("toast.photoUpdated"));
    } catch { toast.error(t("toast.photoUploadFailed")); }
    finally { setUploadingPhoto(false); }
  }

  const blockClass = "bg-card border border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden mb-8";
  const rowClass = "flex items-center justify-between p-4 gap-4 transition-colors focus-within:bg-muted/10 hover:bg-muted/5";
  const labelClass = "text-sm font-medium flex items-center gap-2 shrink-0 max-w-[50%]";
  const inputClass = "flex-1 min-w-0 w-full bg-transparent text-sm text-end focus:outline-none placeholder:text-muted-foreground/60 focus:text-[#007AFF] transition-colors";
  const sectionTitleClass = "text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 ms-4";

  return (
    <div className="flex flex-col h-full bg-muted/20" suppressHydrationWarning>
      <PageHeader title={t("settings.title")} description={t("settings.pageDescription")} />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full pb-20">


        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE                                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{t("settings.profileSection") || "Profile"}</h3>
          <div className={blockClass}>
            {/* Public Profile */}
            <div className={rowClass}>
              <label htmlFor="settings-public-profile" className={labelClass}>
                <Globe className="w-4 h-4 text-muted-foreground" /> {t("settings.publicProfile") || "Public Profile"}
              </label>
              <div className="flex-1 flex justify-end">
                <Switch
                  id="settings-public-profile"
                  name="publicProfile"
                  checked={publicProfile}
                  onCheckedChange={setPublicProfile}
                />
              </div>
            </div>

            {/* Specialty */}
            <div className={rowClass}>
              <label className={labelClass}>{t("onboarding.specialty")}</label>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <select 
                  value={SPECIALTIES.includes(specialty) || specialty === "" ? specialty : (customSpecialty ? "Other" : specialty)} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setSpecialty(val);
                    if (val !== "Other") setCustomSpecialty("");
                  }} 
                  className={inputClass}
                >
                  <option value="" disabled>{t("onboarding.selectSpecialty")}</option>
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>{s === "Other" ? (dir === "rtl" ? "تخصص آخر (Other)" : "Other") : (t("specialty." + s) || s)}</option>
                  ))}
                </select>
                {(!SPECIALTIES.includes(specialty) && specialty !== "") || specialty === "Other" ? (
                  <input
                    value={customSpecialty || (!SPECIALTIES.includes(specialty) && specialty !== "Other" ? specialty : "")}
                    onChange={(e) => {
                      setCustomSpecialty(e.target.value);
                      setSpecialty("Other");
                    }}
                    placeholder={dir === "rtl" ? "اكتب تخصصك..." : "Type your specialty..."}
                    className={inputClass}
                  />
                ) : null}
              </div>
            </div>

            {/* Bio */}
            <div className={`${rowClass} flex-col items-start gap-2`}>
              <label className="text-sm font-medium text-foreground block">
                {dir === "rtl" ? "نبذة شخصية" : "Short Bio"}
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder={dir === "rtl" ? "اكتب نبذة مختصرة عن تخصصك وخبرتك..." : "A brief intro about your specialty and experience..."}
                className="w-full bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/50 resize-none"
              />
            </div>

            {/* Photo */}
            <div className={rowClass}>
              <label className={labelClass}>
                <Camera className="w-4 h-4 text-muted-foreground" /> {dir === "rtl" ? "الصورة الشخصية" : "Profile Photo"}
              </label>
              <div className="flex items-center justify-end gap-3 flex-1">
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {dir === "rtl" ? "تغيير الصورة" : "Change Photo"}
                </button>
                <div
                  className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity shrink-0"
                  onClick={() => photoRef.current?.click()}
                >
                  {uploadingPhoto ? (
                    <IOSSpinner size={16} />
                  ) : profilePhotoUrl ? (
                    <Image src={profilePhotoUrl} alt="photo" width={100} height={100} className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 -mt-5 mb-8">
            {dir === "rtl" ? "عند التفعيل، سيتمكن المرضى من رؤية ملفك وحجز المواعيد عبر الإنترنت." : "When enabled, patients can view your profile and book online."}
          </p>
        </section>

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
              <label htmlFor="settings-address" className={labelClass}>{t("settings.addressText")}</label>
              <input id="settings-address" name="address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                placeholder={t("settings.placeholderAddress")} className={inputClass} />
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-maps-link" className={labelClass}>{t("settings.mapsLink")}</label>
              <input id="settings-maps-link" name="mapsLink" value={clinicAddressLink} onChange={(e) => setClinicAddressLink(e.target.value)}
                placeholder="https://maps.google.com/..." className={inputClass} dir="ltr" />
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-phone" className={labelClass}>{t("settings.phoneWhatsapp")}</label>
              <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0" dir="ltr">
                <span className="text-muted-foreground text-sm shrink-0">+20</span>
                <input id="settings-phone" name="phone" type="tel" value={phone.replace(/^\+?20/, "").replace(/^0/, "")}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="1023456789"
                  className="bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 focus:text-[#007AFF] transition-colors w-full max-w-30 text-left" dir="ltr" />
              </div>
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-fee" className={labelClass}>{t("settings.feeEgp")}</label>
              <input id="settings-fee" name="fee" type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="350" className={inputClass} />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 -mt-5 mb-8">
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
              <label className={labelClass}>{dir === "rtl" ? "ساعات العمل" : "Working Hours"}</label>
              <div className="flex items-center gap-2 flex-1 justify-end min-w-0" dir="ltr">
                <select
                  value={workingHoursStart}
                  onChange={(e) => handleHoursChange(e.target.value, undefined)}
                  className="bg-transparent text-sm focus:outline-none focus:text-[#007AFF] disabled:opacity-50"
                  disabled={validatingHours}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{`${i.toString().padStart(2, "0")}:00`}</option>
                  ))}
                </select>
                <span className="text-muted-foreground text-sm">-</span>
                <select
                  value={workingHoursEnd}
                  onChange={(e) => handleHoursChange(undefined, e.target.value)}
                  className="bg-transparent text-sm focus:outline-none focus:text-[#007AFF] disabled:opacity-50"
                  disabled={validatingHours}
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>{`${i.toString().padStart(2, "0")}:00`}</option>
                  ))}
                  <option value={24}>24:00</option>
                </select>
                {validatingHours && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className={`${rowClass} flex-col items-start gap-3`}>
              <div className="w-full">
                <label className="text-sm font-medium text-foreground block mb-2">{t("onboarding.workingDays") || "Working Days"}</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((d) => {
                    const isSelected = workingDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const newDays = isSelected ? workingDays.filter(x => x !== d) : [...workingDays, d];
                          setWorkingDays(newDays);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors border ${
                          isSelected 
                            ? "bg-[#007AFF] text-white border-[#007AFF]" 
                            : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                        }`}
                      >
                        {t(`days.${d.toLowerCase()}`) || d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-slot-duration" className={labelClass}>{t("settings.slotDurationLabel")}</label>
              <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                <input id="settings-slot-duration" name="slotDuration" type="number" value={slotMin} onChange={(e) => setSlotMin(e.target.value)} min={5} max={120} className={`${inputClass} max-w-15`} dir="ltr" />
                <span className="text-sm text-muted-foreground shrink-0">{t("settings.mins")}</span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 -mt-5 mb-8">
            {dir === "rtl" ? "هذا الخيار يؤثر فقط على الحجوزات الإلكترونية" : "This option only affects online booking."}
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* COMMUNICATIONS                                            */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{dir === "rtl" ? "التواصل والإشعارات" : "Communications"}</h3>
          
          <div className={blockClass}>
            {/* Browser Notifications */}
            <div className={rowClass}>
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-[#007AFF]" />
                <span className="text-sm font-medium">{dir === "rtl" ? "إشعارات المتصفح" : "Browser Notifications"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if ("Notification" in window) {
                    if (Notification.permission === "granted") {
                      toast.success(dir === "rtl" ? "الإشعارات مفعلة مسبقاً" : "Notifications already enabled");
                    } else {
                      Notification.requestPermission().then((permission) => {
                        setNotifPerm(permission);
                        if (permission === "granted") {
                          toast.success(dir === "rtl" ? "تم تفعيل الإشعارات بنجاح" : "Notifications enabled successfully");
                          window.dispatchEvent(new Event("subscribe-push"));
                        } else {
                          toast.error(dir === "rtl" ? "تم رفض الإشعارات" : "Notifications were denied");
                        }
                      });
                    }
                  } else {
                    toast.error(dir === "rtl" ? "متصفحك لا يدعم الإشعارات" : "Your browser does not support notifications");
                  }
                }}
                className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                  notifPerm === "granted"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-[#007AFF] text-white hover:bg-[#007AFF]/90"
                }`}
              >
                {notifPerm === "granted"
                  ? "✓ " + (dir === "rtl" ? "مفعلة" : "Enabled")
                  : (dir === "rtl" ? "تفعيل" : "Enable")}
              </button>
            </div>

            {/* WhatsApp Integration */}
            {currentUser && (
              <div className="p-4">
                <div className="mb-2 flex items-center gap-3">
                  <Globe className="w-4 h-4 text-[#25D366]" />
                  <span className="text-sm font-medium">{dir === "rtl" ? "ربط واتساب" : "WhatsApp Integration"}</span>
                </div>
                <WhatsAppIntegration clinicId={currentUser._id as string} />
              </div>
            )}

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLINICAL PREFERENCES                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>{dir === "rtl" ? "الإعدادات الطبية" : "Clinical Preferences"}</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label htmlFor="settings-enable-prescription" className={labelClass}>{dir === "rtl" ? "الوصفات الطبية (Prescriptions)" : "Prescriptions"}</label>
              <div className="flex-1 flex justify-end">
                <Switch
                  id="settings-enable-prescription"
                  checked={enablePrescription}
                  onCheckedChange={setEnablePrescription}
                />
              </div>
            </div>
            
            <div className={rowClass}>
              <label htmlFor="settings-show-clinic" className={labelClass}>{dir === "rtl" ? "إظهار عنوان العيادة في الوصفة" : "Show Address on Prescription"}</label>
              <div className="flex-1 flex justify-end">
                <Switch
                  id="settings-show-clinic"
                  checked={showClinicLocationOnRx}
                  onCheckedChange={setShowClinicLocationOnRx}
                />
              </div>
            </div>

            <div className={rowClass}>
              <label htmlFor="settings-clinic-screen-names" className={labelClass}>
                {dir === "rtl" ? "شاشة الانتظار: عرض أسماء المرضى" : "Waiting Screen: Show Patient Names"}
              </label>
              <div className="flex-1 flex justify-end">
                <Switch
                  id="settings-clinic-screen-names"
                  checked={clinicScreenShowNames}
                  onCheckedChange={setClinicScreenShowNames}
                />
              </div>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 -mt-5 mb-8">
            {dir === "rtl" ? "تخصيص الأقسام التي تظهر أثناء زيارة المريض." : "Customize visit sections."}
          </p>
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
        </section>

      </div>


      {hasChanges && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#007AFF] hover:bg-[#0062cc] disabled:opacity-60 text-white px-10 py-3.5 rounded-full text-sm font-bold shadow-[0_8px_30px_rgb(0,122,255,0.3)] flex items-center gap-2 border border-white/10"
          >
            {saving ? <IOSSpinner size={16} className="text-white" /> : null}
            {dir === "rtl" ? "حفظ التغييرات" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Reschedule Prompt */}
      {reschedulePromptOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="w-full">
                  <h3 className="text-base font-semibold">
                    {conflictReason === "hours" ? t("settings.conflictBlockTitle") || "Cannot Change Working Hours" : t("settings.conflictDaysBlockTitle") || "Cannot Change Working Days"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed mb-3">
                    {conflictReason === "hours"
                      ? (t("settings.conflictBlockDesc") || "You have {n} visit(s) scheduled outside your new hours. Please reschedule them first.").replace("{n}", String(new Set(conflictingVisits.map(v => v.date)).size))
                      : (t("settings.conflictDaysBlockDesc") || "You have {n} visit(s) on days you are removing. Please reschedule them first.").replace("{n}", String(new Set(conflictingVisits.map(v => v.date)).size))}
                  </p>
                  
                  <p className="text-xs font-semibold mb-2">{t("settings.conflictVisitsHeader") || "Conflicting visits:"}</p>
                  <div className="max-h-32 overflow-y-auto bg-background/50 border border-border rounded-lg p-2 space-y-1 w-full text-left">
                    {Array.from(new Map(conflictingVisits.map(v => [v.date, v])).values()).map((v: any) => (
                      <div key={v._id} className="text-xs text-muted-foreground flex items-center justify-between p-1.5 hover:bg-muted/30 rounded">
                        <span className="font-medium text-foreground">
                          {new Date(v.date).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="truncate ml-2 max-w-30">{v.reasonForVisit || "Visit"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-end gap-3 bg-muted/20">
                <button
                  onClick={() => setReschedulePromptOpen(false)}
                  className="px-4 py-2 bg-background border border-border rounded-xl hover:bg-muted/50 transition-colors text-sm font-semibold order-2 sm:order-1"
                >
                  {t("common.close")}
                </button>
                <button
                  onClick={() => { window.location.href = "/dashboard/queue"; }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  {t("settings.conflictGoFix") || "Go to Schedule"}
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
