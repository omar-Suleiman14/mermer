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
  ChevronRight,
  X,
  ClipboardList,
} from "lucide-react";

const ALL_PERMISSIONS = [
  "manage_queue",
  "manage_patients",
  "manage_installments",
  "manage_inventory",
  "manage_settings",
  "manage_history",
] as const;

type Permission = (typeof ALL_PERMISSIONS)[number];

function PermissionBadge({
  perm,
  active,
  onClick,
  t,
}: {
  perm: Permission;
  active: boolean;
  onClick?: () => void;
  t: (k: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-[#007AFF]/10 border-[#007AFF]/30 text-[#007AFF]"
          : "bg-muted/50 border-border text-muted-foreground"
      } ${onClick ? "cursor-pointer hover:scale-105" : "cursor-default"}`}
    >
      {active && <Check className="w-3 h-3 shrink-0" />}
      {t(`perm.${perm}`) || perm}
    </button>
  );
}

export default function StaffPage() {
  const { user } = useUser();
  const clerkId = user?.id ?? "";
  const { t, lang } = useI18n();
  const isRtl = lang === "ar";

  const data = useQuery(
    api.users.listStaff,
    clerkId ? { clerkId } : "skip"
  );

  const inviteStaff = useMutation(api.users.inviteStaff);
  const updateStaffPermissions = useMutation(api.users.updateStaffPermissions);
  const removeStaff = useMutation(api.users.removeStaff);
  const removeInvitation = useMutation(api.users.removeInvitation);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<Permission[]>([
    "manage_queue",
    "manage_patients",
  ]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Editing state per staff member
  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <IOSSpinner />
      </div>
    );
  }

  const { staff, invitations } = data;

  const toggleInvitePerm = (p: Permission) => {
    setInvitePermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const toggleEditPerm = (p: Permission) => {
    setEditPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError(t("staff.email") + " & " + t("staff.name") + " required");
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
      setInvitePermissions(["manage_queue", "manage_patients"]);
    } catch (e: any) {
      setInviteError(e.message || "Error");
    } finally {
      setInviteLoading(false);
    }
  };

  const startEdit = (staffMember: any) => {
    setEditingId(staffMember._id);
    setEditPerms((staffMember.permissions || []) as Permission[]);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      await updateStaffPermissions({
        clerkId,
        staffId: editingId,
        permissions: editPerms,
      });
      setEditingId(null);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20" dir={isRtl ? "rtl" : "ltr"}>
      <PageHeader
        title={t("staff.title") || "Staff & Assistants"}
        description={t("staff.subtitle") || "Manage permissions for your clinic's staff."}
        action={
          <button
            onClick={() => setShowInviteDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-semibold shadow-sm hover:bg-[#0066d6] transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            {t("staff.addBtn") || "Invite Staff"}
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 max-w-4xl mx-auto w-full">

        {/* Active Staff */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("staff.activeStaff") || "Active Staff"}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold">
              {staff.length}
            </span>
          </h2>

          {staff.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("staff.noStaff") || "No staff added yet."}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-sm">
              {staff.map((member) => {
                const isEditing = editingId === member._id;
                return (
                  <div key={member._id} className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#007AFF]/20 to-[#5AC8FA]/20 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] font-bold text-sm shrink-0">
                          {member.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => startEdit(member)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {t("staff.permissions") || "Permissions"}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm(t("staff.remove") + "?")) {
                              await removeStaff({ clerkId, staffId: member._id });
                            }
                          }}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Permissions Display / Edit */}
                    {isEditing ? (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          {t("staff.permissions") || "Permissions"} — {t("staff.save") || "click to toggle"}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {ALL_PERMISSIONS.map((p) => (
                            <PermissionBadge
                              key={p}
                              perm={p}
                              active={editPerms.includes(p)}
                              onClick={() => toggleEditPerm(p)}
                              t={t}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={editLoading}
                            className="px-4 py-2 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0066d6] transition-colors disabled:opacity-50"
                          >
                            {editLoading ? "..." : t("staff.save") || "Save"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
                          >
                            {t("staff.cancel") || "Cancel"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {(member.permissions as Permission[] || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No permissions</span>
                        ) : (
                          (member.permissions as Permission[] || []).map((p) => (
                            <PermissionBadge key={p} perm={p as Permission} active={true} t={t} />
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t("staff.pendingInvites") || "Pending Invitations"}
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold">
              {invitations.length}
            </span>
          </h2>

          {invitations.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{t("staff.noInvites") || "No pending invitations."}</p>
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
                        {(inv.permissions as Permission[]).map((p) => (
                          <PermissionBadge key={p} perm={p as Permission} active={true} t={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm(t("staff.revoke") + "?")) {
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
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-bold text-base">{t("staff.inviteDialogTitle") || "Invite Assistant"}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("staff.inviteDialogDesc") || "They will join your clinic when they sign up."}
                </p>
              </div>
              <button
                onClick={() => setShowInviteDialog(false)}
                className="p-2 rounded-full hover:bg-muted/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {inviteError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl px-4 py-2">
                  {inviteError}
                </p>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("staff.name") || "Name"}
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ahmed Mohamed"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("staff.email") || "Email"}
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="assistant@example.com"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t("staff.role") || "Role"} ({lang === "ar" ? "اختياري" : "optional"})
                </label>
                <input
                  type="text"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  placeholder={lang === "ar" ? "مستقبلة، سكرتيرة…" : "Receptionist, Nurse…"}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-shadow"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" />
                  {t("staff.permissions") || "Permissions"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PERMISSIONS.map((p) => (
                    <PermissionBadge
                      key={p}
                      perm={p}
                      active={invitePermissions.includes(p)}
                      onClick={() => toggleInvitePerm(p)}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={() => setShowInviteDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted/50 transition-colors"
              >
                {t("staff.cancel") || "Cancel"}
              </button>
              <button
                onClick={handleInvite}
                disabled={inviteLoading}
                className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-semibold hover:bg-[#0066d6] transition-colors disabled:opacity-50"
              >
                {inviteLoading ? "..." : t("staff.addBtn") || "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
