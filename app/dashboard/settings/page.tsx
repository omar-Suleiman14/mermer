"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { PageHeader } from "@/components/page-header";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  User,
  MessageSquare,
  Upload,
  CheckCircle2,
  Clock,
  Camera,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Icon className="w-4 h-4 text-[#007AFF]" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
        />
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";

  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const profilePhotoUrl = useQuery(api.users.getProfilePhotoUrl, clerkId ? { clerkId } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const updateWhatsappTemplate = useMutation(api.users.updateWhatsappTemplate);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);
  const makeAdmin = useMutation(api.users.makeAdmin);

  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [credentials, setCredentials] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [workingHoursStart, setWorkingHoursStart] = useState("9");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("17");
  const [isAlwaysOpen, setIsAlwaysOpen] = useState(false);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("30");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // WhatsApp template
  const [template, setTemplate] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Profile photo
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Load data from current user
  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? "");
    setPhone(currentUser.phone ?? "");
    setClinicName(currentUser.clinicName ?? "");
    setSpecialty(currentUser.specialty ?? "");
    setCredentials(currentUser.credentials ?? "");
    setClinicAddress(currentUser.clinicAddress ?? "");
    setWorkingHoursStart(String((currentUser as any).workingHoursStart ?? 9));
    setWorkingHoursEnd(String((currentUser as any).workingHoursEnd ?? 17));
    setIsAlwaysOpen((currentUser as any).workingHoursStart === 0 && (currentUser as any).workingHoursEnd === 24);
    setSlotDurationMinutes(String(currentUser.slotDurationMinutes ?? 30));
    setBio((currentUser as any).bio ?? "");
    setTemplate(currentUser.whatsappTemplate ?? "");
  }, [currentUser]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateProfile({
        clerkId,
        name,
        phone,
        clinicName,
        specialty: specialty || undefined,
        credentials: credentials || undefined,
        clinicAddress: clinicAddress || undefined,
        workingHoursStart: isAlwaysOpen ? 0 : (workingHoursStart ? Number(workingHoursStart) : undefined),
        workingHoursEnd: isAlwaysOpen ? 24 : (workingHoursEnd ? Number(workingHoursEnd) : undefined),
        slotDurationMinutes: slotDurationMinutes ? Number(slotDurationMinutes) : undefined,
        bio: bio || undefined,
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveTemplate() {
    setSavingTemplate(true);
    try {
      await updateWhatsappTemplate({ clerkId, template });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleProfilePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId: sid } = await res.json();
      await saveProfilePhoto({ clerkId, storageId: sid as Id<"_storage"> });
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleMakeAdmin() {
    try {
      await makeAdmin({ clerkId });
      toast.success("You are now admin. Reload the page.");
    } catch {
      toast.error("Failed");
    }
  }

  const tier = currentUser?.tier ?? "free";

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Manage your profile, templates, and preferences" />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5 max-w-2xl">

        {/* Profile */}
        <Section title="Practice Profile" icon={User}>
          {/* Profile photo */}
          <div className="flex items-center gap-4 pb-2">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#007AFF]">
                  {name.charAt(0).toUpperCase() || "?"}
                </span>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
                title="Change photo"
              >
                {uploadingPhoto ? <IOSSpinner size={20} className="text-white" /> : <Camera className="w-5 h-5 text-white" />}
              </button>
            </div>
            <div>
              <p className="text-sm font-semibold">{name || "Your Name"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Shown in patient search results</p>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#007AFF] hover:underline disabled:opacity-60"
              >
                <Upload className="w-3 h-3" />
                {profilePhotoUrl ? "Change photo" : "Upload photo"}
              </button>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleProfilePhotoUpload(f);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Doctor Name" value={name} onChange={setName} placeholder="Dr. Mohamed Ahmed" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+20 1XX XXX XXXX" />
            <Field label="Clinic Name" value={clinicName} onChange={setClinicName} placeholder="Al Nour Clinic" />
            <Field label="Specialty" value={specialty} onChange={setSpecialty} placeholder="General Practitioner" />
            <Field label="Credentials" value={credentials} onChange={setCredentials} placeholder="MD, MRCGP" />
            <Field label="Clinic Address" value={clinicAddress} onChange={setClinicAddress} placeholder="123 Street, Cairo" />
            {/* 24/7 toggle */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setIsAlwaysOpen((v) => !v)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${isAlwaysOpen ? "bg-[#007AFF]" : "bg-muted-foreground/30"}`}
                  style={{ height: "22px", width: "42px" }}
                >
                  <span
                    className={`absolute top-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                      isAlwaysOpen ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium">
                  24/7 — Open around the clock
                </span>
              </label>
            </div>

            {!isAlwaysOpen && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Clinic Opens
                  </label>
                  <select
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {h === 0 ? "12:00 AM (midnight)" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Clinic Closes
                  </label>
                  <select
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h === 24 ? "12:00 AM (midnight)" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Appointment Slot Duration (minutes)
              </label>
              <input
                type="number"
                value={slotDurationMinutes}
                onChange={(e) => setSlotDurationMinutes(e.target.value)}
                min={5}
                max={120}
                className="w-full px-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
          </div>
          <div className="sm:col-span-2 mt-0">
            <Field
              label="Short Bio (shown on public profile)"
              value={bio}
              onChange={setBio}
              placeholder="Tell patients about your experience and what you specialise in…"
              textarea
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="flex items-center gap-2 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {savingProfile ? <IOSSpinner size={16} className="text-white" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Profile
          </button>
        </Section>

        {/* WhatsApp Template */}
        <Section title="WhatsApp Message Template" icon={MessageSquare}>
          <p className="text-xs text-muted-foreground">
            Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{"{{name}}"}</code> as a placeholder for the patient&apos;s name.
          </p>
          <Field
            label="Reminder Message"
            value={template}
            onChange={setTemplate}
            textarea
            placeholder="Hello {{name}}, you are next at the clinic. Please come over now. Thank you!"
          />
          <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground">
            <span className="font-medium">Preview: </span>
            {template.replace("{{name}}", "Ahmed")}
          </div>
          <button
            onClick={saveTemplate}
            disabled={savingTemplate}
            className="flex items-center gap-2 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {savingTemplate ? <IOSSpinner size={16} className="text-white" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Template
          </button>
        </Section>

      </div>
    </div>
  );
}
