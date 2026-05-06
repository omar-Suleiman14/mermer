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
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  Crown,
  Clock,
} from "lucide-react";

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
  const logoUrl = useQuery(api.users.getLogoUrl, clerkId ? { clerkId } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const updateWhatsappTemplate = useMutation(api.users.updateWhatsappTemplate);
  const updatePrescriptionTemplate = useMutation(api.users.updatePrescriptionTemplate);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const makeAdmin = useMutation(api.users.makeAdmin);

  // Profile state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [credentials, setCredentials] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState("30");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // WhatsApp template
  const [template, setTemplate] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Prescription template
  const [rxDoctorName, setRxDoctorName] = useState("");
  const [rxSpecialty, setRxSpecialty] = useState("");
  const [rxCredentials, setRxCredentials] = useState("");
  const [rxClinicName, setRxClinicName] = useState("");
  const [rxAddress, setRxAddress] = useState("");
  const [rxPhone, setRxPhone] = useState("");
  const [rxHours, setRxHours] = useState("");
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | undefined>();
  const [savingRx, setSavingRx] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load data from current user
  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name ?? "");
    setPhone(currentUser.phone ?? "");
    setClinicName(currentUser.clinicName ?? "");
    setSpecialty(currentUser.specialty ?? "");
    setCredentials(currentUser.credentials ?? "");
    setClinicAddress(currentUser.clinicAddress ?? "");
    setWorkingHours(currentUser.workingHours ?? "");
    setSlotDurationMinutes(String(currentUser.slotDurationMinutes ?? 30));
    setBio((currentUser as any).bio ?? "");
    setTemplate(currentUser.whatsappTemplate ?? "");

    setRxDoctorName(currentUser.prescriptionDoctorName ?? currentUser.name ?? "");
    setRxSpecialty(currentUser.prescriptionSpecialty ?? currentUser.specialty ?? "");
    setRxCredentials(currentUser.prescriptionCredentials ?? currentUser.credentials ?? "");
    setRxClinicName(currentUser.prescriptionClinicName ?? currentUser.clinicName ?? "");
    setRxAddress(currentUser.prescriptionAddress ?? currentUser.clinicAddress ?? "");
    setRxPhone(currentUser.prescriptionPhone ?? currentUser.phone ?? "");
    setRxHours(currentUser.prescriptionWorkingHours ?? currentUser.workingHours ?? "");
    setLogoStorageId(currentUser.logoStorageId);
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
        workingHours: workingHours || undefined,
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

  async function savePrescriptionTemplate() {
    setSavingRx(true);
    try {
      await updatePrescriptionTemplate({
        clerkId,
        logoStorageId: logoStorageId ?? undefined,
        prescriptionDoctorName: rxDoctorName || undefined,
        prescriptionSpecialty: rxSpecialty || undefined,
        prescriptionCredentials: rxCredentials || undefined,
        prescriptionClinicName: rxClinicName || undefined,
        prescriptionAddress: rxAddress || undefined,
        prescriptionPhone: rxPhone || undefined,
        prescriptionWorkingHours: rxHours || undefined,
      });
      toast.success("Prescription template saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingRx(false);
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId: sid } = await res.json();
      setLogoStorageId(sid as Id<"_storage">);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
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
        {/* Tier badge */}
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
          tier === "premium"
            ? "bg-[#f5a623]/10 text-[#f5a623] border border-[#f5a623]/20"
            : "bg-muted/60 text-muted-foreground border border-border"
        }`}>
          <Crown className="w-4 h-4" />
          {tier === "premium" ? "Premium Plan — Full automation enabled" : "Free Plan — Contact admin to upgrade to Premium"}
        </div>

        {/* Profile */}
        <Section title="Practice Profile" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Doctor Name" value={name} onChange={setName} placeholder="Dr. Mohamed Ahmed" />
            <Field label="Phone" value={phone} onChange={setPhone} placeholder="+20 1XX XXX XXXX" />
            <Field label="Clinic Name" value={clinicName} onChange={setClinicName} placeholder="Al Nour Clinic" />
            <Field label="Specialty" value={specialty} onChange={setSpecialty} placeholder="General Practitioner" />
            <Field label="Credentials" value={credentials} onChange={setCredentials} placeholder="MD, MRCGP" />
            <Field label="Clinic Address" value={clinicAddress} onChange={setClinicAddress} placeholder="123 Street, Cairo" />
            <Field label="Working Hours" value={workingHours} onChange={setWorkingHours} placeholder="Sat–Thu 9am–5pm" />
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
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
            {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Template
          </button>
        </Section>

        {/* Prescription Template */}
        <Section title="Prescription Template" icon={FileText}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            These details appear on the branded PDF generated when you complete a visit. Upload your clinic logo and fill in the details below.
          </p>

          {/* Logo upload */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Clinic Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Clinic logo"
                  className="w-16 h-16 rounded-xl object-contain border border-border bg-white p-1"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
                className="flex items-center gap-2 text-sm border border-border px-4 py-2 rounded-xl hover:bg-muted/40 transition-colors disabled:opacity-60"
              >
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {logoUrl ? "Replace Logo" : "Upload Logo"}
              </button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Doctor Name (on Rx)" value={rxDoctorName} onChange={setRxDoctorName} placeholder="Dr. Mohamed Ahmed" />
            <Field label="Specialty (on Rx)" value={rxSpecialty} onChange={setRxSpecialty} placeholder="General Practitioner" />
            <Field label="Credentials (on Rx)" value={rxCredentials} onChange={setRxCredentials} placeholder="MD, MRCGP" />
            <Field label="Clinic Name (on Rx)" value={rxClinicName} onChange={setRxClinicName} placeholder="Al Nour Clinic" />
            <Field label="Address (on Rx)" value={rxAddress} onChange={setRxAddress} placeholder="123 Street, Cairo" />
            <Field label="Phone (on Rx)" value={rxPhone} onChange={setRxPhone} placeholder="+20 1XX XXX XXXX" />
            <div className="sm:col-span-2">
              <Field label="Working Hours (on Rx)" value={rxHours} onChange={setRxHours} placeholder="Sat–Thu 9am–5pm" />
            </div>
          </div>

          {/* Rx Preview header */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="bg-[#007AFF] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  <img src={logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/20 p-1" />
                )}
                <div className="text-white">
                  <p className="font-bold text-sm">{rxDoctorName || "Dr. Name"}</p>
                  <p className="text-xs text-white/80">{rxSpecialty || "Specialty"}</p>
                  <p className="text-xs text-white/60">{rxCredentials || "Credentials"}</p>
                </div>
              </div>
              <div className="text-right text-xs text-white/70">
                <p>{rxClinicName || "Clinic Name"}</p>
                <p>{rxAddress || "Address"}</p>
                <p>{rxPhone || "Phone"}</p>
                <p>{rxHours || "Working Hours"}</p>
              </div>
            </div>
            <div className="bg-[#f0f7ff] px-5 py-2 text-xs text-[#1a1916] flex justify-between">
              <span><strong>Patient:</strong> Ahmad Ibrahim · Age: 42</span>
              <span><strong>Date:</strong> {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
            </div>
            <div className="px-5 py-4 bg-white">
              <p className="text-2xl font-bold text-[#007AFF] mb-2">Rx</p>
              <div className="h-px bg-[#007AFF]/20 mb-3" />
              <p className="text-xs text-muted-foreground italic">[Prescription content will appear here]</p>
            </div>
          </div>

          <button
            onClick={savePrescriptionTemplate}
            disabled={savingRx}
            className="flex items-center gap-2 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {savingRx ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Prescription Template
          </button>
        </Section>

        {/* Dev tools section (hidden in production) */}
        {process.env.NODE_ENV === "development" && (
          <div className="border border-dashed border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2 font-mono">DEV ONLY</p>
            <button
              onClick={handleMakeAdmin}
              className="text-xs text-[#007AFF] hover:underline"
            >
              Make this account admin (dev)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
