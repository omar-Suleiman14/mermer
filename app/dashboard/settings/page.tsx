"use client";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Camera, Clock, Upload, MapPin, Link as LinkIcon, MessageSquare, Globe, Moon, Sun, MonitorSmartphone, Palette, Building2 } from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { MessageTemplatesSection } from "@/components/message-templates-section";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "next-themes";
import { LanguageToggle } from "@/components/language-toggle";

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

export default function SettingsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const profilePhotoUrl = useQuery(api.users.getProfilePhotoUrl, clerkId ? { clerkId } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);

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
  const [bio, setBio] = useState("");
  const [publicProfile, setPublicProfile] = useState(false);  
  
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const initialised = useRef(false);

  useEffect(() => {
    setMounted(true);
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
      });
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
  }, [clerkId, currentUser, name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile, updateProfile]);

  function triggerSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1000);
  }

  // Trigger save on any field change (skip initial load)
  const prevValues = useRef("");
  useEffect(() => {
    if (!initialised.current) return;
    const key = JSON.stringify({ name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile });
    if (prevValues.current && key !== prevValues.current) {
      triggerSave();
    }
    prevValues.current = key;
  }, [name, phone, clinicName, specialty, credentials, clinicAddress, clinicAddressLink, workingHoursStart, workingHoursEnd, isAlwaysOpen, slotMin, bio, publicProfile]);

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await saveProfilePhoto({ clerkId, storageId: storageId as Id<"_storage"> });
      toast.success("Photo updated");
    } catch { toast.error("Photo upload failed"); }
    finally { setUploadingPhoto(false); }
  }

  const blockClass = "bg-card border border-border rounded-xl shadow-sm divide-y divide-border overflow-hidden mb-8";
  const rowClass = "flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4 transition-colors focus-within:bg-muted/10 hover:bg-muted/5";
  const labelClass = "text-sm font-medium flex items-center gap-2 flex-shrink-0 min-w-[140px]";
  const inputClass = "flex-1 w-full bg-transparent text-sm sm:text-right focus:outline-none placeholder:text-muted-foreground/60 focus:text-[#007AFF] transition-colors";
  const sectionTitleClass = "text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 ml-4";

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <PageHeader title={t("settings.title")} description="Manage your preferences and clinic details." />

      <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full pb-20">

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* APPEARANCE & LANGUAGE                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>Appearance & Language</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label className={labelClass}>
                <Globe className="w-4 h-4 text-muted-foreground" /> Language
              </label>
              <div className="flex-1 flex justify-end">
                <LanguageToggle />
              </div>
            </div>
            {mounted && (
              <div className={rowClass}>
                <label className={labelClass}>
                  <Palette className="w-4 h-4 text-muted-foreground" /> Dark Mode
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
            Language and theme are applied globally.
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFILE                                                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>Profile</h3>
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
                  <h4 className="text-sm font-semibold">{name || "Your Name"}</h4>
                  <button onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                    className="text-[13px] text-[#007AFF] hover:underline mt-0.5">
                    {profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                  </button>
                  <input ref={photoRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
                </div>
              </div>
              <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border">
                 <span className="text-xs font-medium">Public Profile</span>
                 <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
              </div>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Full Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Mohamed Ahmed" className={inputClass} />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Specialty</label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={`${inputClass} sm:text-right appearance-none bg-transparent cursor-pointer`}>
                <option value="">Select specialty…</option>
                {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Credentials</label>
              <input value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="MD, MRCGP, FRCS…" className={inputClass} />
            </div>

            <div className={`${rowClass} flex-col !items-start`}>
              <label className={labelClass}>Short Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Tell patients about your experience…"
                className="w-full text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/60 resize-none mt-2" />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mt-[-20px] mb-8">
            Turning on your Public Profile makes it visible on the booking feed.
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CLINIC & LOCATION                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>Clinic & Location</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label className={labelClass}>Clinic Name</label>
              <input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="Al Nour Clinic" className={inputClass} />
            </div>
            
            <div className={rowClass}>
              <label className={labelClass}>Phone / WhatsApp</label>
              <div className="flex items-center gap-1 flex-1 justify-end" dir="ltr">
                <span className="text-muted-foreground text-sm">+20</span>
                <input type="tel" value={phone.replace(/^\+?20/, "").replace(/^0/, "")}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="1142529590"
                  className={`${inputClass} !flex-none w-[120px] sm:w-[150px] !text-left`} />
              </div>
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Maps Link</label>
              <input value={clinicAddressLink} onChange={(e) => setClinicAddressLink(e.target.value)}
                placeholder="https://maps.google.com/..." className={inputClass} dir="ltr" />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Address Text</label>
              <input value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)}
                placeholder="123 Tahrir Square, Downtown" className={inputClass} />
            </div>

            <div className={rowClass}>
              <label className={labelClass}>Fee (EGP)</label>
              <input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="350" className={inputClass} />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mt-[-20px] mb-8">
            The maps link will be shown to patients when they book online.
          </p>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SCHEDULE                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>Schedule</h3>
          <div className={blockClass}>
            <div className={rowClass}>
              <label className={labelClass}>Open 24/7</label>
              <div className="flex-1 flex justify-end">
                <Switch checked={isAlwaysOpen} onCheckedChange={setIsAlwaysOpen} />
              </div>
            </div>

            {!isAlwaysOpen && (
              <>
                <div className={rowClass}>
                  <label className={labelClass}>Opens at</label>
                  <select value={workingHoursStart} onChange={(e) => setWHS(e.target.value)} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
                <div className={rowClass}>
                  <label className={labelClass}>Closes at</label>
                  <select value={workingHoursEnd} onChange={(e) => setWHE(e.target.value)} className={`${inputClass} sm:text-right appearance-none cursor-pointer`}>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className={rowClass}>
              <label className={labelClass}>Slot Duration</label>
              <div className="flex items-center gap-2 flex-1 sm:justify-end">
                <input type="number" value={slotMin} onChange={(e) => setSlotMin(e.target.value)} min={5} max={120} className={`${inputClass} !flex-none w-16 sm:text-right`} dir="ltr" />
                <span className="text-sm text-muted-foreground">mins</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MESSAGE TEMPLATES                                         */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <section>
          <h3 className={sectionTitleClass}>Message Templates</h3>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-2">
            <div className="p-4">
              <MessageTemplatesSection clerkId={clerkId} clinicAddressLink={clinicAddressLink} />
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground ms-4 mb-8">
            Create WhatsApp message templates. Type <span className="font-mono bg-card px-1 border border-border rounded text-[#007AFF] text-xs">@</span> to insert variables.
          </p>
        </section>

      </div>
    </div>
  );
}
