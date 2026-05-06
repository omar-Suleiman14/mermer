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
  MapPin,
  Clock,
  FileText,
  Camera,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

interface DoctorOnboardingProps {
  clerkId: string;
  defaultName: string;
  onComplete: () => void;
}

const SPECIALTIES = [
  "General Practitioner",
  "Cardiologist",
  "Dermatologist",
  "Endocrinologist",
  "Gastroenterologist",
  "Neurologist",
  "Obstetrician / Gynecologist",
  "Ophthalmologist",
  "Orthopedic Surgeon",
  "Otolaryngologist (ENT)",
  "Pediatrician",
  "Psychiatrist",
  "Pulmonologist",
  "Radiologist",
  "Rheumatologist",
  "Urologist",
  "Other",
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
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
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
  const [clinicAddress, setClinicAddress] = useState(""); // optional

  // Step 2 — Availability
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openTo, setOpenTo] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState("30");
  const [acceptsOnline, setAcceptsOnline] = useState(true);

  // Step 3 — Bio & photo (optional)
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);

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
      setLogoStorageId(storageId as Id<"_storage">);
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const effectiveSpecialty = specialty === "Other" ? customSpecialty : specialty;
      const workingHours = buildWorkingHours();

      await updateProfile({
        clerkId,
        name,
        phone,
        clinicName,
        specialty: effectiveSpecialty || undefined,
        credentials: credentials || undefined,
        clinicAddress: clinicAddress || undefined,
        workingHours: workingHours || undefined,
        slotDurationMinutes: acceptsOnline ? Number(slotDuration) : undefined,
      });

      // Save logo/bio to prescription template
      if (logoStorageId || bio) {
        await updatePrescriptionTemplate({
          clerkId,
          logoStorageId: logoStorageId ?? undefined,
          prescriptionDoctorName: name,
          prescriptionSpecialty: effectiveSpecialty || undefined,
          prescriptionCredentials: credentials || undefined,
          prescriptionClinicName: clinicName,
          prescriptionAddress: clinicAddress || undefined,
          prescriptionPhone: phone || undefined,
          prescriptionWorkingHours: workingHours || undefined,
        });
      }

      toast.success("Welcome to Ibn Sina! Your profile is ready.");
      onComplete();
    } catch {
      toast.error("Failed to save profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const canAdvanceStep0 = name.trim().length > 0 && (specialty !== "Other" ? specialty !== "" : customSpecialty.trim().length > 0);
  const canAdvanceStep1 = clinicName.trim().length > 0 && phone.trim().length > 0;
  const canAdvanceStep2 = true; // availability is optional-ish
  const canFinish = true;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="w-full max-w-md bg-[var(--background)] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#007AFF] px-6 pt-8 pb-6">
          <p className="text-white/70 text-xs font-semibold tracking-widest uppercase mb-1">
            Welcome to Ibn Sina
          </p>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Set up your practice
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Takes 2 minutes. You can update everything later in Settings.
          </p>
        </div>

        <div className="p-6">
          <StepIndicator current={step} total={TOTAL_STEPS} />

          <AnimatePresence mode="wait">

            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-[#007AFF]" />
                  <span className="font-semibold text-sm">Your Details</span>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Full Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Mohamed Ahmed"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Specialty *</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  >
                    <option value="">Select specialty…</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {specialty === "Other" && (
                  <input
                    value={customSpecialty}
                    onChange={(e) => setCustomSpecialty(e.target.value)}
                    placeholder="Enter your specialty"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Credentials <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <input
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="MD, MRCGP, FRCS…"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Clinic Info ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-[#007AFF]" />
                  <span className="font-semibold text-sm">Your Clinic</span>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clinic Name *</label>
                  <input
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    placeholder="Al Nour Medical Clinic"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">WhatsApp / Phone Number *</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+20 1XX XXX XXXX"
                    type="tel"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Used for WhatsApp reminders to patients</p>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Clinic Address <span className="font-normal text-muted-foreground">(optional)</span>
                    </span>
                  </label>
                  <input
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    placeholder="123 Street, Cairo, Egypt"
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  />
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Availability ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-[#007AFF]" />
                  <span className="font-semibold text-sm">Availability</span>
                </div>

                {/* Online bookings toggle */}
                <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3 border border-border">
                  <div>
                    <p className="text-sm font-medium">Accept Online Appointments</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Patients can book via your public profile (Premium)</p>
                  </div>
                  <button
                    onClick={() => setAcceptsOnline((v) => !v)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${acceptsOnline ? "bg-[#007AFF]" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${acceptsOnline ? "translate-x-5" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                {acceptsOnline && (
                  <>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Working Days</p>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((d) => (
                          <button
                            key={d}
                            onClick={() => toggleDay(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              selectedDays.includes(d)
                                ? "bg-[#007AFF] text-white border-[#007AFF]"
                                : "border-border hover:border-[#007AFF]/40 text-muted-foreground"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Opens at</label>
                        <input
                          type="time"
                          value={openFrom}
                          onChange={(e) => setOpenFrom(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1.5">Closes at</label>
                        <input
                          type="time"
                          value={openTo}
                          onChange={(e) => setOpenTo(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Appointment Slot Duration (minutes)</label>
                      <select
                        value={slotDuration}
                        onChange={(e) => setSlotDuration(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                      >
                        {[10, 15, 20, 30, 45, 60].map((m) => (
                          <option key={m} value={m}>{m} minutes</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {!acceptsOnline && (
                  <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground">
                    You can enable online booking anytime in Settings → Practice Profile.
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Photo & Bio ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-[#007AFF]" />
                  <span className="font-semibold text-sm">Profile Photo & Bio <span className="text-muted-foreground font-normal">(optional)</span></span>
                </div>

                {/* Photo */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl bg-[#007AFF]/10 border-2 border-dashed border-[#007AFF]/30 flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover:bg-[#007AFF]/15 transition-colors"
                    onClick={() => photoRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : uploadingPhoto ? (
                      <Loader2 className="w-6 h-6 text-[#007AFF] animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-[#007AFF]/60" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile Photo</p>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                      Used on your prescription header & public profile
                    </p>
                    <button
                      onClick={() => photoRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="text-xs text-[#007AFF] hover:underline font-medium disabled:opacity-60"
                    >
                      {avatarPreview ? "Change photo" : "Upload photo"}
                    </button>
                  </div>
                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                    }}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Short Bio <span className="font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell patients a bit about yourself, your experience, and what you specialize in…"
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-2.5 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{bio.length}/500</p>
                </div>

                <div className="bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl p-3 text-xs text-[#007AFF]">
                  You&apos;re almost done! This is the last step. You can update all of this later in Settings.
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 mt-6">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2.5 rounded-xl hover:bg-muted/40"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}

            <div className="flex-1" />

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 0 && !canAdvanceStep0) ||
                  (step === 1 && !canAdvanceStep1)
                }
                className="flex items-center gap-1.5 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-50"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Finish Setup</>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
