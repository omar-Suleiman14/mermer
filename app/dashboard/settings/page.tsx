"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { User, MessageSquare, Save } from "lucide-react";

const DEFAULT_TEMPLATE =
  "Hello {{name}}, this is a reminder that you are next in line at the clinic. Please make your way over now. Thank you!";

export default function SettingsPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const currentUser = useQuery(api.users.getCurrentUser, clerkId ? { clerkId } : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const updateTemplate = useMutation(api.users.updateWhatsappTemplate);

  const [profile, setProfile] = useState({ name: "", phone: "", clinicName: "" });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Populate from DB
  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name,
        phone: currentUser.phone,
        clinicName: currentUser.clinicName,
      });
      setTemplate(currentUser.whatsappTemplate || DEFAULT_TEMPLATE);
    }
  }, [currentUser]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ clerkId, ...profile });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setSavingTemplate(true);
    try {
      await updateTemplate({ clerkId, template });
      toast.success("Template saved");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSavingTemplate(false);
    }
  }

  const isLoading = currentUser === undefined;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Settings" description="Manage your profile and preferences" />

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-xl space-y-6">

          {/* Profile Section */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#007AFF]/10 flex items-center justify-center">
                <User className="w-4 h-4 text-[#007AFF]" />
              </div>
              <h2 className="text-sm font-semibold">Profile</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-clinic">Clinic Name</Label>
                  <input
                    id="settings-clinic"
                    value={profile.clinicName}
                    onChange={(e) => setProfile((p) => ({ ...p, clinicName: e.target.value }))}
                    placeholder="My Clinic"
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-name">Doctor Name</Label>
                  <input
                    id="settings-name"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Dr. John Doe"
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-phone">Phone Number</Label>
                  <input
                    id="settings-phone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+1234567890"
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 text-sm font-semibold bg-[#007AFF] text-white px-4 py-2 rounded-lg hover:bg-[#0062cc] transition-colors disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            )}
          </div>

          {/* WhatsApp Template Section */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#25D366]" />
              </div>
              <h2 className="text-sm font-semibold">WhatsApp Reminder Template</h2>
            </div>

            {isLoading ? (
              <Skeleton className="h-28 rounded-lg" />
            ) : (
              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="settings-template">Message Template</Label>
                  <textarea
                    id="settings-template"
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent resize-none font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[#007AFF] font-mono">
                      {"{{name}}"}
                    </code>{" "}
                    to insert the patient&apos;s name automatically.
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-muted/40 rounded-xl p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Preview
                  </p>
                  <p className="text-xs text-foreground leading-relaxed">
                    {template.replace("{{name}}", "Ahmed")}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="flex items-center gap-2 text-sm font-semibold bg-[#007AFF] text-white px-4 py-2 rounded-lg hover:bg-[#0062cc] transition-colors disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {savingTemplate ? "Saving..." : "Save Template"}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
