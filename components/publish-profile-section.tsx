"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Globe,
  Lock,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Languages,
  Camera,
  ExternalLink,
  Eye,
  Upload,
} from "lucide-react";
import { IOSSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

const SPECIALTIES = [
  "General Practitioner", "Cardiologist", "Dermatologist", "Dentist",
  "ENT Specialist", "Gastroenterologist", "Neurologist", "Obstetrician",
  "Oncologist", "Ophthalmologist", "Orthopedist", "Pediatrician",
  "Psychiatrist", "Pulmonologist", "Radiologist", "Surgeon", "Urologist",
];

const LANGUAGES = ["Arabic", "English", "French", "German", "Spanish", "Turkish", "Italian"];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: `${h.toString().padStart(2, "0")}:00`,
  label: h === 0 ? "12:00 AM" : h === 12 ? "12:00 PM" : h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`,
}));

interface User {
  name: string;
  specialty?: string | null;
  bio?: string | null;
  clinicAddress?: string | null;
  city?: string | null;
  consultationFee?: number | null;
  languages?: string[];
  availableDays?: string[];
  availableFrom?: string | null;
  availableTo?: string | null;
  publicProfile?: boolean;
  qrSlug?: string | null;
  profilePhotoId?: Id<"_storage"> | null;
}

interface Props {
  clerkId: string;
  currentUser: User;
  profilePhotoUrl?: string | null;
}

function DoctorCardPreview({
  name, specialty, bio, fee, city, address, languages, days, from, to, photoUrl, rating,
}: {
  name: string; specialty: string; bio: string; fee: string; city: string;
  address: string; languages: string[]; days: string[]; from: string; to: string;
  photoUrl?: string | null; rating?: number | null;
}) {
  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const availableToday = days.includes(todayName);

  return (
    <div className="bg-white dark:bg-[#1c1c1a] border border-black/8 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm max-w-xs w-full">
      {/* Photo + badge */}
      <div className="relative h-24 bg-linear-to-br from-[#007AFF]/20 to-[#5856D6]/20 flex items-center justify-start px-5 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#007AFF]/10 border-2 border-white dark:border-[#1c1c1a] overflow-hidden flex items-center justify-center shrink-0 shadow-md">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-[#007AFF]">{(name || "D").charAt(0)}</span>
          )}
        </div>
        {availableToday && (
          <span className="absolute top-3 right-3 text-[10px] font-bold bg-[#34c759] text-white px-2 py-0.5 rounded-full">
            Available Today
          </span>
        )}
      </div>

      <div className="px-5 pt-3 pb-5 space-y-3">
        <div>
          <p className="font-bold text-sm">Dr. {name || "Your Name"}</p>
          <p className="text-xs text-[#007AFF] font-medium">{specialty || "Specialty"}</p>
          {rating && (
            <div className="flex items-center gap-1 mt-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-2.5 h-2.5 ${i < Math.round(rating) ? "fill-[#FF9500] text-[#FF9500]" : "text-muted-foreground/30"}`} />
              ))}
              <span className="text-[10px] text-muted-foreground ml-0.5">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {bio && <p className="text-xs text-muted-foreground line-clamp-2">{bio}</p>}

        <div className="grid grid-cols-2 gap-2">
          {fee && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3 text-[#34c759]" />
              <span>{fee} EGP</span>
            </div>
          )}
          {(city || address) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-[#FF3B30]" />
              <span className="truncate">{city || address}</span>
            </div>
          )}
          {from && to && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
              <Clock className="w-3 h-3 text-[#007AFF]" />
              <span>{from} – {to}</span>
            </div>
          )}
          {languages.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground col-span-2">
              <Languages className="w-3 h-3 text-[#5856D6]" />
              <span>{languages.join(", ")}</span>
            </div>
          )}
        </div>

        {days.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <span key={d} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${days.includes(d) ? "bg-[#007AFF]/10 text-[#007AFF]" : "bg-muted/30 text-muted-foreground/40"}`}>
                {d.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PublishProfileSection({ clerkId, currentUser, profilePhotoUrl }: Props) {
  const [specialty, setSpecialty] = useState(currentUser.specialty ?? "");
  const [bio, setBio] = useState(currentUser.bio ?? "");
  const [fee, setFee] = useState(currentUser.consultationFee ? String(currentUser.consultationFee) : "");
  const [languages, setLanguages] = useState<string[]>(currentUser.languages ?? []);
  const [address, setAddress] = useState(currentUser.clinicAddress ?? "");
  const [city, setCity] = useState(currentUser.city ?? "");
  const [days, setDays] = useState<string[]>(currentUser.availableDays ?? []);
  const [availFrom, setAvailFrom] = useState(currentUser.availableFrom ?? "09:00");
  const [availTo, setAvailTo] = useState(currentUser.availableTo ?? "17:00");
  const [isPublished, setIsPublished] = useState(currentUser.publicProfile ?? false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const updatePublicProfile = useMutation(api.doctors.updatePublicProfile);
  const setVisibility = useMutation(api.doctors.setPublicProfileVisibility);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveProfilePhoto = useMutation(api.users.saveProfilePhoto);
  const photoRef = useRef<HTMLInputElement>(null);

  // Checklist
  const checks = [
    { label: "Specialty", done: !!specialty },
    { label: "Bio", done: bio.trim().length >= 20 },
    { label: "Profile photo", done: !!profilePhotoUrl },
    { label: "Consultation fee", done: !!fee && Number(fee) > 0 },
    { label: "Clinic address", done: !!address },
    { label: "Available days", done: days.length > 0 },
  ];
  const allDone = checks.every((c) => c.done);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePublicProfile({
        clerkId,
        specialty: specialty || undefined,
        bio: bio || undefined,
        consultationFee: fee ? Number(fee) : undefined,
        languages,
        clinicAddress: address || undefined,
        city: city || undefined,
        availableDays: days,
        availableFrom: availFrom || undefined,
        availableTo: availTo || undefined,
      });
      toast.success("Profile saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish() {
    if (!allDone && !isPublished) {
      toast.error("Complete your profile before publishing");
      return;
    }
    const next = !isPublished;
    setSaving(true);
    try {
      await handleSave();
      await setVisibility({ clerkId, publicProfile: next });
      setIsPublished(next);
      toast.success(next ? "Profile is now public 🎉" : "Profile hidden from feed");
    } catch {
      toast.error("Failed to update visibility");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhoto(file: File) {
    setUploadingPhoto(true);
    try {
      const url = await generateUploadUrl({ clerkId });
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await saveProfilePhoto({ clerkId, storageId: storageId as Id<"_storage"> });
      toast.success("Photo updated");
    } catch { toast.error("Photo upload failed"); } finally { setUploadingPhoto(false); }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/doctors/${currentUser.qrSlug}`;

  function toggleDay(d: string) {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }
  function toggleLang(l: string) {
    setLanguages((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
  }

  return (
    <div className="space-y-6">
      {/* Publish toggle */}
      <div className="flex items-center justify-between p-4 bg-linear-to-r from-[#007AFF]/5 to-[#5856D6]/5 border border-[#007AFF]/15 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isPublished ? "bg-[#34c759]/15" : "bg-muted/40"}`}>
            {isPublished ? <Globe className="w-4 h-4 text-[#34c759]" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{isPublished ? "Profile is Public" : "Profile is Private"}</p>
            <p className="text-xs text-muted-foreground">
              {isPublished ? "Visible in the patient feed" : "Not visible to patients"}
            </p>
          </div>
        </div>
        <div className={saving ? "opacity-60 pointer-events-none" : ""}>
          <Switch
            checked={isPublished}
            onCheckedChange={handleTogglePublish}
          />
        </div>
      </div>

      {/* View public link */}
      {isPublished && (
        <motion.a
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          href={publicUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-sm text-[#007AFF] font-semibold hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          View my public profile
        </motion.a>
      )}

      {/* Checklist */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Profile Completeness</p>
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-2.5 text-sm">
            {c.done
              ? <CheckCircle2 className="w-4 h-4 text-[#34c759] shrink-0" />
              : <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
            <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
          </div>
        ))}
      </div>

      {/* Two-column layout: form + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6">
        {/* Form */}
        <div className="space-y-4">
          {/* Photo */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Profile Photo</p>
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                {profilePhotoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={profilePhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-[#007AFF]">{(currentUser.name || "D").charAt(0)}</span>}
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center rounded-xl transition-opacity"
                >
                  {uploadingPhoto ? <IOSSpinner size={16} className="text-white" /> : <Camera className="w-4 h-4 text-white" />}
                </button>
              </div>
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 text-xs text-[#007AFF] font-medium hover:underline"
              >
                <Upload className="w-3 h-3" />
                {profilePhotoUrl ? "Change photo" : "Upload photo"}
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhoto(f); }} />
            </div>
          </div>

          {/* Specialty */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Specialty *</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            >
              <option value="">Select specialty…</option>
              {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bio * (min 20 chars)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Describe your experience, approach, and what patients can expect…"
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF] resize-none"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{bio.length} chars</p>
          </div>

          {/* Fee + City */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Consultation Fee (EGP) *</label>
              <input
                type="number" value={fee} onChange={(e) => setFee(e.target.value)}
                placeholder="350"
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">City</label>
              <input
                type="text" value={city} onChange={(e) => setCity(e.target.value)}
                placeholder="Cairo, Giza…"
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              />
            </div>
          </div>

          {/* Clinic address */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Clinic Address *</label>
            <input
              type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Tahrir Square, Cairo"
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
            />
          </div>

          {/* Languages */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Languages Spoken</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLang(l)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    languages.includes(l)
                      ? "bg-[#5856D6]/10 border-[#5856D6]/30 text-[#5856D6]"
                      : "border-border text-muted-foreground hover:border-[#5856D6]/30"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Available days */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Available Days *</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    days.includes(d)
                      ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
                      : "border-border text-muted-foreground hover:border-[#007AFF]/30"
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Available hours */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["From", availFrom, setAvailFrom] as const,
              ["To", availTo, setAvailTo] as const,
            ].map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
                <select
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                >
                  {HOURS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#007AFF] text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-[#0062cc] transition-colors disabled:opacity-60"
          >
            {saving ? <IOSSpinner size={16} className="text-white" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Profile
          </button>
        </div>

        {/* Live Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <Eye className="w-3.5 h-3.5" />
            Live Preview
          </div>
          <DoctorCardPreview
            name={currentUser.name}
            specialty={specialty}
            bio={bio}
            fee={fee}
            city={city}
            address={address}
            languages={languages}
            days={days}
            from={availFrom}
            to={availTo}
            photoUrl={profilePhotoUrl}
          />
        </div>
      </div>
    </div>
  );
}
