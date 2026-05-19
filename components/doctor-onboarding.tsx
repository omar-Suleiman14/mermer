"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  User,
  Building2,
  Clock,
  Camera,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  MapPin,
  Bell,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n";

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return "20" + digits.slice(1);
  if (digits.length === 10) return "20" + digits;
  return digits;
}

interface DoctorOnboardingProps {
  clerkId: string;
  defaultName: string;
  onComplete: () => void;
}

const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Dentist",
  "ENT Specialist", "Endocrinologist", "Gastroenterologist", "Neurologist",
  "Obstetrician / Gynecologist", "Ophthalmologist", "Orthopedic Surgeon",
  "Otolaryngologist (ENT)", "Pediatrician", "Psychiatrist", "Pulmonologist",
  "Radiologist", "Rheumatologist", "Surgeon", "Urologist", "Other",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-[#007AFF]"
              : i < current
              ? "w-3 bg-[#007AFF]/40"
              : "w-3 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

export function DoctorOnboarding({ clerkId, defaultName, onComplete }: DoctorOnboardingProps) {
  const { t, dir } = useI18n();
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);
  const updatePrescriptionTemplate = useMutation(api.users.updatePrescriptionTemplate);

  const [step, setStep] = useState(0);
  const TOTAL_STEPS = 4;

  // Step 0 — Basic info
  const [name, setName] = useState(defaultName);
  const [specialty, setSpecialty] = useState("");
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [credentials, setCredentials] = useState("");

  // Step 1 — Clinic info
  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicAddressLink, setClinicAddressLink] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");

  // Step 2 — Availability
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openTo, setOpenTo] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [feePerVisit, setFeePerVisit] = useState("");

  // Step 3 — Bio & photo & privacy
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileStorageId, setProfileStorageId] = useState<Id<"_storage"> | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const [saving, setSaving] = useState(false);
  const isMobile = useIsMobile();

  function toggleDay(d: string) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function buildWorkingHours() {
    const days = selectedDays.length === 7 ? "Daily" : selectedDays.join("–");
    const from = formatTime12h(openFrom);
    const to = formatTime12h(openTo);
    return days ? `${days} ${from}–${to}` : "";
  }

  function formatTime12h(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      setProfileStorageId(storageId as Id<"_storage">);
      setAvatarPreview(URL.createObjectURL(file));
      toast.success(t("onboarding.photoUploaded") || "Photo uploaded");
    } catch {
      toast.error(t("onboarding.photoUploadFail") || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const effectiveSpecialty = specialty === "Other" ? customSpecialty : specialty;
      const workingHours = buildWorkingHours();
      const startHour = openFrom ? parseInt(openFrom.split(":")[0], 10) : 9;
      const endHour = openTo ? parseInt(openTo.split(":")[0], 10) : 17;

      await updateProfile({
        clerkId,
        name,
        phone: normalisePhone(phone),
        clinicName,
        specialty: effectiveSpecialty || undefined,
        credentials: credentials || undefined,
        clinicAddress: clinicAddress || undefined,
        clinicAddressLink: clinicAddressLink || undefined,
        workingHours: workingHours || undefined,
        workingHoursStart: startHour,
        workingHoursEnd: endHour,
        slotDurationMinutes: Number(slotDuration),
        bio: bio || undefined,
        workingDays: selectedDays.length > 0 ? selectedDays : undefined,
        feePerVisit: feePerVisit ? Number(feePerVisit) : undefined,
        publicProfile,
      });

      if (profileStorageId) {
        await saveProfilePhoto({ clerkId, storageId: profileStorageId });
      }

      if (profileStorageId || bio) {
        await updatePrescriptionTemplate({
          clerkId,
          logoStorageId: profileStorageId ?? undefined,
          prescriptionDoctorName: name,
          prescriptionSpecialty: effectiveSpecialty || undefined,
          prescriptionCredentials: credentials || undefined,
          prescriptionClinicName: clinicName,
          prescriptionAddress: clinicAddress || undefined,
          prescriptionPhone: normalisePhone(phone) || undefined,
          prescriptionWorkingHours: workingHours || undefined,
        });
      }

      toast.success(t("onboarding.welcomeSuccess"));
      onComplete();
    } catch (err: any) {
      console.error("Onboarding error:", err);
      toast.error(err?.message ?? (t("onboarding.saveFail") || "Failed to save profile. Try again."));
    } finally {
      setSaving(false);
    }
  }

  const canAdvanceStep0 = name.trim().length > 0 && (specialty !== "Other" ? specialty !== "" : customSpecialty.trim().length > 0);
  const canAdvanceStep1 = clinicName.trim().length > 0 && phone.trim().length > 0 && clinicAddressLink.trim().length > 0;
  const canAdvanceStep2 = selectedDays.length > 0 && feePerVisit.trim().length > 0 && openFrom.trim().length > 0 && openTo.trim().length > 0;

  const inputClass =
    "w-full px-4 py-3 text-sm bg-muted/30 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

  const content = (
    <>
      <div className="px-6 pt-8 pb-2 flex-shrink-0">
        <p className="text-[#007AFF] text-xs font-semibold tracking-widest uppercase mb-1">
          {t("onboarding.welcome")}
        </p>
        <h2 className="text-foreground text-2xl font-bold tracking-tight">
          {t("onboarding.setup")}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          {t("onboarding.setupDesc")}
        </p>
      </div>

      {/* Scrollable step content */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <StepIndicator current={step} total={TOTAL_STEPS} />

        <AnimatePresence mode="wait">

          {/* ── Step 0: Personal Info ── */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-[#007AFF]" />
                <span className="font-semibold text-sm">{t("onboarding.yourDetails")}</span>
              </div>

              <div className="border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
                <div>
                  <p className="text-sm font-semibold">{t("settings.publicProfile") || "Public Profile"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.profileHint") || "Allow patients to find and book you online"}
                  </p>
                </div>
                <div className="flex items-center">
                  <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.fullName")} *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.placeholderName") || "Dr. Mohamed Ahmed"} className={inputClass} dir="auto" />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.specialty")} *</label>
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputClass}>
                  <option value="">{t("onboarding.selectSpecialty")}</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{t("specialty." + s) || s}</option>)}
                </select>
              </div>

              {specialty === "Other" && (
                <input value={customSpecialty} onChange={(e) => setCustomSpecialty(e.target.value)} placeholder={t("settings.placeholderSpecialty") || "Enter your specialty"} className={inputClass} />
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {t("onboarding.credentials")} <span className="font-normal">({t("onboarding.optional")})</span>
                </label>
                <input value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder={t("settings.placeholderCredentials") || "MD, MRCGP, FRCS…"} className={inputClass} />
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Clinic Info ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-4 h-4 text-[#007AFF]" />
                <span className="font-semibold text-sm">{t("onboarding.yourClinic")}</span>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.clinicName")} *</label>
                <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder={t("settings.placeholderClinic") || "Al Nour Medical Clinic"} className={inputClass} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.whatsappPhone")} *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-muted/60 border border-border rounded-2xl text-sm text-muted-foreground font-mono flex-shrink-0" dir="ltr">+20</span>
                  <input value={phone.replace(/^\+?20/, "").replace(/^0/, "")} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="1142529590" type="tel" className={`flex-1 ${inputClass} !text-left`} dir="ltr" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("onboarding.phoneDesc")}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  <span className="flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" /> {t("onboarding.googleMapsLink")} *
                  </span>
                </label>
                <input value={clinicAddressLink} onChange={(e) => setClinicAddressLink(e.target.value)} placeholder="https://maps.google.com/…" className={inputClass} dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">{t("onboarding.mapDesc")}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {t("onboarding.addressText")} <span className="font-normal text-muted-foreground/60">({t("onboarding.optional")})</span>
                  </span>
                </label>
                <input value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} placeholder={t("settings.placeholderAddress") || "123 Street, Cairo, Egypt"} className={inputClass} />
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Availability ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-[#007AFF]" />
                <span className="font-semibold text-sm">{t("onboarding.availability")}</span>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("onboarding.workingDays")} *</p>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d) => (
                    <button key={d} onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        selectedDays.includes(d)
                          ? "bg-[#007AFF] text-white border-[#007AFF]"
                          : "border-border hover:border-[#007AFF]/40 text-muted-foreground"
                      }`}>
                      {t(`days.${d}`) || d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.opensAt")} *</label>
                  <select value={openFrom} onChange={(e) => setOpenFrom(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`} required>
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = `${h.toString().padStart(2, '0')}:00`;
                      const label = h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
                      return <option key={val} value={val}>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.closesAt")} *</label>
                  <select value={openTo} onChange={(e) => setOpenTo(e.target.value)} className={`${inputClass} appearance-none cursor-pointer`} required>
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = `${h.toString().padStart(2, '0')}:00`;
                      const label = h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
                      return <option key={val} value={val}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{t("onboarding.slotDuration")} *</label>
                <select value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)} className={inputClass}>
                  {[10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} {t("onboarding.minutes")}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {t("onboarding.feePerVisit")} *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    value={feePerVisit}
                    onChange={(e) => setFeePerVisit(e.target.value)}
                    placeholder="350"
                    className={`${inputClass} pe-12`}
                  />
                  <span className="absolute end-4 text-xs text-muted-foreground font-medium pointer-events-none">{t("common.currency")}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t("onboarding.feeDesc")}</p>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Photo, Bio & Privacy ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }} className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4 text-[#007AFF]" />
                <span className="font-semibold text-sm">{t("onboarding.photoBio")} <span className="text-muted-foreground font-normal">({t("onboarding.optional")})</span></span>
              </div>

              <div className="flex items-center gap-4">
                <div
                  className="w-20 h-20 rounded-2xl bg-[#007AFF]/10 border-2 border-dashed border-[#007AFF]/30 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:bg-[#007AFF]/15 transition-colors"
                  onClick={() => photoRef.current?.click()}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : uploadingPhoto ? (
                    <IOSSpinner size={24} className="text-[#007AFF]" />
                  ) : (
                    <Camera className="w-6 h-6 text-[#007AFF]/60" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{t("onboarding.profilePhoto")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                    {t("onboarding.photoDesc")}
                  </p>
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="text-xs text-[#007AFF] hover:underline font-medium disabled:opacity-60">
                    {avatarPreview ? t("onboarding.changePhoto") : t("onboarding.uploadPhoto")}
                  </button>
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {t("onboarding.shortBio")} <span className="font-normal">({t("onboarding.optional")})</span>
                </label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder={t("onboarding.bioPlaceholder") || "I am a specialist in..."}
                  rows={4} maxLength={500}
                  className={`${inputClass} resize-none`} />
                <p className="text-xs text-muted-foreground mt-1" style={{ textAlign: dir === "rtl" ? "left" : "right" }}>{bio.length}/500</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t("settings.notifications") || "Online Booking Alerts"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("settings.notificationsDesc") || "Get notified immediately when a patient books online"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      const perm = await Notification.requestPermission();
                      if (perm === "granted") {
                        setNotificationsEnabled(true);
                        toast.success(t("settings.notificationsEnabled") || "Notifications enabled");
                      } else {
                        toast.error(t("settings.notificationsDenied") || "Notification permission denied");
                        setNotificationsEnabled(false);
                      }
                    } else {
                      setNotificationsEnabled(false);
                    }
                  }}
                />
              </div>

              <div className="bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-2xl p-3 text-xs text-[#007AFF]">
                {t("onboarding.almostDone")}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Fixed bottom navigation */}
      <div className="flex-shrink-0 border-t border-border bg-background px-6 py-4 flex items-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-2xl hover:bg-muted/40">
            {dir === "rtl" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />} {t("onboarding.back")}
          </button>
        )}

        <div className="flex-1" />

        {step < TOTAL_STEPS - 1 ? (
          <button onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canAdvanceStep0) || (step === 1 && !canAdvanceStep1) || (step === 2 && !canAdvanceStep2)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm">
            {t("onboarding.next")} {dir === "rtl" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <button onClick={handleFinish} disabled={saving}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-sm">
            {saving ? (
              <><IOSSpinner size={16} className="text-white" /> {t("onboarding.saving")}</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> {t("onboarding.finishSetup")}</>
            )}
          </button>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={true}>
        <DrawerContent className="p-0 overflow-hidden bg-[var(--background)] border-t-0 rounded-t-2xl flex flex-col max-h-[95vh]">
          <DrawerTitle className="sr-only">{t("onboarding.setup")}</DrawerTitle>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Centered Card */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 w-full max-w-3xl h-[85vh] md:h-[80vh] bg-[var(--background)] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
      >
        {content}
      </motion.div>
    </div>
  );
}
