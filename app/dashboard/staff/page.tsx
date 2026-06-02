"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n/client";
import { PageHeader } from "@/components/page-header";
import { IOSSpinner } from "@/components/ui/spinner";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  UserPlus,
  Users,
  Mail,
  Shield,
  Trash2,
  Check,
  X,
  ClipboardList,
} from "lucide-react";

const ALL_PERMISSIONS = [
  "appointments.create",
  "appointments.reschedule",
  "appointments.cancel",
  "patients.manage",
  "analytics.access",
  "feedback.access",
  "settings.access",
  "finances.access",
] as const;

type Permission = (typeof ALL_PERMISSIONS)[number];

const PERM_LABELS_EN: Record<Permission, string> = {
  "appointments.create": "Manage Appointments",
  "appointments.reschedule": "Reschedule Appointments",
  "appointments.cancel": "Cancel Appointments",
  "patients.manage": "Manage Patients",
  "analytics.access": "View Analytics",
  "feedback.access": "View Feedback",
  "settings.access": "Manage Settings",
  "finances.access": "View Finances",
};

const PERM_LABELS_AR: Record<Permission, string> = {
  "appointments.create": "إدارة المواعيد",
  "appointments.reschedule": "إعادة جدولة",
  "appointments.cancel": "إلغاء المواعيد",
  "patients.manage": "إدارة المرضى",
  "analytics.access": "عرض التحليلات",
  "feedback.access": "عرض التقييمات",
  "settings.access": "إدارة الإعدادات",
  "finances.access": "عرض المالية",
};

function permLabel(perm: string, lang: string): string {
  const p = perm as Permission;
  if (lang === "ar") return PERM_LABELS_AR[p] ?? perm;
  return PERM_LABELS_EN[p] ?? perm;
}

function PermissionCheckbox({
  perm,
  checked,
  onChange,
  lang,
}: {
  perm: Permission;
  checked: boolean;
  onChange: () => void;
  lang: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 cursor-pointer transition-colors group w-full text-start"
    >
      <div
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          checked
            ? "bg-[#007AFF] border-[#007AFF]"
            : "border-border group-hover:border-[#007AFF]/50"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm font-medium">{permLabel(perm, lang)}</span>
    </button>
  );
}

function PermBadge({ perm, lang }: { perm: string; lang: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]">
      <Check className="w-3 h-3 shrink-0" />
      {permLabel(perm, lang)}
    </span>
  );
}

export default function StaffPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { lang } = useI18n();
  const isRtl = lang === "ar";

  const data = useQuery(api.users.listStaff, clerkId ? { clerkId } : "skip");

  const inviteStaff = useMutation(api.users.inviteStaff);
  const updateStaffPermissions = useMutation(api.users.updateStaffPermissions);
  const removeStaff = useMutation(api.users.removeStaff);
  const removeInvitation = useMutation(api.users.removeInvitation);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>([
    "appointments.create",
    "appointments.reschedule",
    "appointments.cancel",
    "patients.manage",
  ]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <IOSSpinner />
      </div>
    );
  }

  const { staff, invitations } = data;

  const toggleInvitePerm = (p: Permission) =>
    setInvitePermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const toggleEditPerm = (p: Permission) =>
    setEditPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError(isRtl ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0648\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" : "Email & Name are required");
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    try {
      await inviteStaff({
        clerkId,
        email: inviteEmail.trim().toLowerCase(),
        name: inviteName.trim(),
        roleName: inviteRole.trim() || "Assistant",
        permissions: invitePermissions,
      });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("");
      setInvitePermissions(["appointments.create", "appointments.reschedule", "appointments.cancel", "patients.manage"]);
    } catch (e: any) {
      setInviteError(e.message || "Error");
    } finally {
      setInviteLoading(false);
    }
  };

  const startEdit = (member: any) => {
    setEditingId(member._id);
    setEditPerms(member.permissions ?? []);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      await updateStaffPermissions({ clerkId, staffId: editingId, permissions: editPerms });
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={isRtl ? "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646 \u0648\u0627\u0644\u0645\u0633\u0627\u0639\u062f\u0648\u0646" : "Staff & Assistants"}
        description={isRtl ? "\u0625\u062f\u0627\u0631\u0629 \u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0645\u0648\u0638\u0641\u064a \u0627\u0644\u0639\u064a\u0627\u062f\u0629" : "Manage permissions for your clinic staff."}
        action={
          <button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-semibold shadow-sm hover:bg-[#0066d6] transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            {isRtl ? "\u062f\u0639\u0648\u0629 \u0645\u0648\u0638\u0641" : "Invite Staff"}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">

        {/* Active Staff */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {isRtl ? "\u0627\u0644\u0645\u0648\u0638\u0641\u0648\u0646 \u0627\u0644\u0646\u0634\u0637\u0648\u0646" : "Active Staff"}
            <span className="w-5 h-5 rounded-full bg-muted text-xs font-bold flex items-center justify-center">{staff.length}</span>
          </h2>

          {staff.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{isRtl ? "\u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0648\u0638\u0641\u0648\u0646 \u0628\u0639\u062f." : "No staff added yet."}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-sm">
              {staff.map((member) => {
                const isEditing = editingId === member._id;
                return (
                  <div key={member._id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF]/20 to-[#5AC8FA]/20 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] font-bold text-sm shrink-0">
                          {member.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(member)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {isRtl ? "\u0635\u0644\u0627\u062d\u064a\u0627\u062a" : "Permissions"}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm(isRtl ? "\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0648\u0638\u0641\u061f" : "Remove this staff member?")) {
                              await removeStaff({ clerkId, staffId: member._id });
                            }
                          }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          {isRtl ? "\u0627\u062e\u062a\u0631 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a" : "Select Permissions"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 mb-4 bg-muted/30 rounded-xl p-2">
                          {ALL_PERMISSIONS.map((p) => (
                            <PermissionCheckbox
                              key={p}
                              perm={p}
                              checked={editPerms.includes(p)}
                              onChange={() => toggleEditPerm(p)}
                              lang={lang}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={editLoading}
                            className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0066d6] transition-colors disabled:opacity-50"
                          >
                            {editLoading ? "..." : isRtl ? "\u062d\u0641\u0638" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                          >
                            {isRtl ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(member.permissions ?? []).length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">{isRtl ? "\u0644\u0627 \u0635\u0644\u0627\u062d\u064a\u0627\u062a" : "No permissions"}</span>
                        ) : (
                          (member.permissions ?? []).map((p: string) => (
                            <PermBadge key={p} perm={p} lang={lang} />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pending Invitations */}
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {isRtl ? "\u0627\u0644\u062f\u0639\u0648\u0627\u062a \u0627\u0644\u0645\u0639\u0644\u0642\u0629" : "Pending Invitations"}
            <span className="w-5 h-5 rounded-full bg-muted text-xs font-bold flex items-center justify-center">{invitations.length}</span>
          </h2>

          {invitations.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{isRtl ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0639\u0648\u0627\u062a \u0645\u0639\u0644\u0642\u0629." : "No pending invitations."}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-sm">
              {invitations.map((inv) => (
                <div key={inv._id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{inv.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{inv.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(inv.permissions ?? []).map((p: string) => (
                          <PermBadge key={p} perm={p} lang={lang} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(isRtl ? "\u0625\u0644\u063a\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u062f\u0639\u0648\u0629\u061f" : "Revoke this invitation?")) {
                        await removeInvitation({ clerkId, invitationId: inv._id });
                      }
                    }}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Invite Dialog */}
      {showInviteDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
              <div>
                <h2 className="font-bold text-base">{isRtl ? "\u062f\u0639\u0648\u0629 \u0645\u0633\u0627\u0639\u062f" : "Invite Assistant"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isRtl ? "\u0633\u064a\u0646\u0636\u0645 \u0644\u0644\u0639\u064a\u0627\u062f\u0629 \u0639\u0646\u062f \u0627\u0644\u062a\u0633\u062c\u064a\u0644." : "They will join your clinic when they sign up."}
                </p>
              </div>
              <button onClick={() => setShowInviteDialog(false)} className="p-2 rounded-full hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {inviteError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">{inviteError}</p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{isRtl ? "\u0627\u0644\u0627\u0633\u0645" : "Name"}</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder={isRtl ? "\u0645\u062b\u0644\u0627\u064b: \u0623\u062d\u0645\u062f \u0645\u062d\u0645\u062f" : "e.g. Ahmed Mohamed"}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{isRtl ? "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a" : "Email"}</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="assistant@example.com"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{isRtl ? "\u0627\u0644\u062f\u0648\u0631 (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)" : "Role (optional)"}</label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder={isRtl ? "\u0645\u062b\u0644\u0627\u064b: \u0645\u0633\u062a\u0642\u0628\u0644\u0629\u060c \u0633\u0643\u0631\u062a\u064a\u0631\u0629" : "e.g. Receptionist, Nurse"}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  {isRtl ? "\u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a" : "Permissions"}
                </label>
                <div className="bg-muted/30 rounded-xl p-2 grid grid-cols-1 gap-0.5">
                  {ALL_PERMISSIONS.map((p) => (
                    <PermissionCheckbox
                      key={p}
                      perm={p}
                      checked={invitePermissions.includes(p)}
                      onChange={() => toggleInvitePerm(p)}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 pt-0 shrink-0">
              <button
                onClick={() => setShowInviteDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors"
              >
                {isRtl ? "\u0625\u0644\u063a\u0627\u0621" : "Cancel"}
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0066d6] transition-colors disabled:opacity-50"
              >
                {inviteLoading ? "..." : isRtl ? "\u062f\u0639\u0648\u0629" : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
