import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUser, requireAuthUser, requireAdmin } from "./authHelper";

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    timezoneOffset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) {
      throw new Error("Unauthenticated or identity mismatch");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      if (args.timezoneOffset !== undefined && existing.timezoneOffset !== args.timezoneOffset) {
        await ctx.db.patch(existing._id, { timezoneOffset: args.timezoneOffset });
      }
      return existing._id;
    }

    // Check if there is a pending invitation for this email
    let role: "doctor" | "assistant" = "doctor";
    let clinicId: Id<"users"> | undefined = undefined;
    let permissions: string[] | undefined = undefined;
    let name = args.name;

    if (args.email) {
      const invitation = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", args.email!))
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();

      if (invitation) {
        role = "assistant";
        clinicId = invitation.doctorId;
        permissions = invitation.permissions;
        name = invitation.name; // Use the name the doctor gave them
        
        // Mark invitation as accepted
        await ctx.db.patch(invitation._id, { status: "accepted" });
      }
    }

    const slug = generateSlug(name);

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name,
      email: args.email,
      phone: "",
      clinicName: "My Clinic",
      whatsappTemplate:
        "مرحباً {{name}}، دورك التالي في العيادة. يرجى التوجه للعيادة الآن. شكراً لك.",
      createdAt: Date.now(),
      isAdmin: false,
      qrSlug: slug,
      publicProfile: true,
      timezoneOffset: args.timezoneOffset,
      isBlocked: role === "doctor" ? true : false, // Assistants don't need manual unblocking, their doctor is already approved
      role,
      clinicId,
      permissions,
    });
    return id;
  },
});

export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) return null;

    // For assistants: return their own record (role/permissions correct)
    // but overlay the doctor's clinic name so the sidebar shows the right clinic
    if (user.role === "assistant" && user.clinicId) {
      const doctor = await ctx.db.get(user.clinicId);
      return { ...user, clinicName: doctor?.clinicName ?? user.clinicName };
    }

    return user;
  },
});

export const getPendingInvitation = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user?.email) return null;
    // Already an assistant — no pending invite needed
    if (user.role === "assistant") return null;

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", user.email!))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (!invitation) return null;

    const doctor = await ctx.db.get(invitation.doctorId);
    return {
      ...invitation,
      doctorName: doctor?.name ?? "Doctor",
      doctorClinicName: doctor?.clinicName ?? "the clinic",
    };
  },
});

export const acceptInvitation = mutation({
  args: { clerkId: v.string(), invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.email !== user.email) throw new Error("Invitation not found");

    await ctx.db.patch(user._id, {
      role: "assistant",
      clinicId: invitation.doctorId,
      permissions: invitation.permissions,
      name: invitation.name,
    });
    await ctx.db.delete(invitation._id);
  },
});

export const declineInvitation = mutation({
  args: { clerkId: v.string(), invitationId: v.id("invitations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) throw new Error("Unauthenticated");

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) return;
    await ctx.db.delete(invitation._id);
  },
});

export const updateProfile = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    phone: v.string(),
    clinicName: v.string(),
    specialty: v.optional(v.string()),
    credentials: v.optional(v.string()),
    clinicAddress: v.optional(v.string()),
    clinicAddressLink: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    workingHoursStart: v.optional(v.number()),
    workingHoursEnd: v.optional(v.number()),
    slotDurationMinutes: v.optional(v.number()),
    bio: v.optional(v.string()),
    publicProfile: v.optional(v.boolean()),
    // Working days & fee per visit
    workingDays: v.optional(v.array(v.string())),
    feePerVisit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    await ctx.db.patch(user._id, {
      name: args.name,
      phone: args.phone,
      clinicName: args.clinicName,
      specialty: args.specialty,
      credentials: args.credentials,
      clinicAddress: args.clinicAddress,
      clinicAddressLink: args.clinicAddressLink,
      workingHours: args.workingHours,
      workingHoursStart: args.workingHoursStart,
      workingHoursEnd: args.workingHoursEnd,
      slotDurationMinutes: args.slotDurationMinutes,
      bio: args.bio,
      ...(args.publicProfile !== undefined ? { publicProfile: args.publicProfile } : {}),
      ...(args.workingDays !== undefined ? { availableDays: args.workingDays } : {}),
      ...(args.feePerVisit !== undefined ? { consultationFee: args.feePerVisit } : {}),
    });
  },
});

export const updateWhatsappTemplate = mutation({
  args: {
    clerkId: v.string(),
    template: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    await ctx.db.patch(user._id, { whatsappTemplate: args.template });
  },
});

export const updatePrescriptionTemplate = mutation({
  args: {
    clerkId: v.string(),
    logoStorageId: v.optional(v.id("_storage")),
    prescriptionDoctorName: v.optional(v.string()),
    prescriptionSpecialty: v.optional(v.string()),
    prescriptionCredentials: v.optional(v.string()),
    prescriptionClinicName: v.optional(v.string()),
    prescriptionAddress: v.optional(v.string()),
    prescriptionPhone: v.optional(v.string()),
    prescriptionWorkingHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    // Explicitly pick allowed prescription fields to prevent schema bypass
    const patch: any = {};
    if (args.logoStorageId !== undefined) patch.logoStorageId = args.logoStorageId;
    if (args.prescriptionDoctorName !== undefined) patch.prescriptionDoctorName = args.prescriptionDoctorName;
    if (args.prescriptionSpecialty !== undefined) patch.prescriptionSpecialty = args.prescriptionSpecialty;
    if (args.prescriptionCredentials !== undefined) patch.prescriptionCredentials = args.prescriptionCredentials;
    if (args.prescriptionClinicName !== undefined) patch.prescriptionClinicName = args.prescriptionClinicName;
    if (args.prescriptionAddress !== undefined) patch.prescriptionAddress = args.prescriptionAddress;
    if (args.prescriptionPhone !== undefined) patch.prescriptionPhone = args.prescriptionPhone;
    if (args.prescriptionWorkingHours !== undefined) patch.prescriptionWorkingHours = args.prescriptionWorkingHours;
    await ctx.db.patch(user._id, patch);
  },
});

// Admin: list all doctors
// FIX #3: Paginate, project only needed fields, never expose sensitive data
export const listAllDoctors = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(500);

    // Project only fields the admin panel needs — never expose
    // whatsappTemplate, profilePhotoId, or internal IDs
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      clinicName: u.clinicName,
      specialty: u.specialty,
      isAdmin: u.isAdmin,
      publicProfile: u.publicProfile,
      isBanned: (u as any).isBanned,
      isBlocked: (u as any).isBlocked,
      createdAt: u.createdAt,
      qrSlug: u.qrSlug,
    }));
  },
});


// Admin: toggle admin
export const setAdmin = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    await ctx.db.patch(args.targetUserId, { isAdmin: args.isAdmin });
  },
});

// Admin: toggle blocked status
export const toggleBlockUser = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    isBlocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    await ctx.db.patch(args.targetUserId, { isBlocked: args.isBlocked });
  },
});

// Public: search doctors (resolves profile photo URL)
// OPTIMIZED: Uses by_public_profile index instead of full table scan
export const searchDoctors = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    // OPTIMIZED: Use index to only read published doctors
    const published = await ctx.db
      .query("users")
      .withIndex("by_public_profile", (q) => q.eq("publicProfile", true))
      .take(500);

    const visible = published.filter((u) => !(u as any).isBanned);

    const filtered = args.search.trim()
      ? (() => {
          const q = args.search.toLowerCase();
          return visible.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              (u.specialty ?? "").toLowerCase().includes(q) ||
              (u.clinicName ?? "").toLowerCase().includes(q)
          );
        })()
      : visible;

    return await Promise.all(
      filtered.map(async (u) => ({
        _id: u._id,
        name: u.name,
        specialty: u.specialty,
        clinicName: u.clinicName,
        qrSlug: u.qrSlug,
        profilePhotoUrl: u.profilePhotoId
          ? await ctx.storage.getUrl(u.profilePhotoId)
          : null,
      }))
    );
  },
});

// Public: get doctor by qrSlug (includes resolved profile photo URL)
export const getDoctorBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor || !doctor.publicProfile || (doctor as any).isBanned) return null;
    const profilePhotoUrl = doctor.profilePhotoId
      ? await ctx.storage.getUrl(doctor.profilePhotoId)
      : null;
    return {
      _id: doctor._id,
      name: doctor.name,
      specialty: doctor.specialty,
      credentials: doctor.credentials,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress,
      clinicAddressLink: doctor.clinicAddressLink,
      bio: doctor.bio,
      qrSlug: doctor.qrSlug,
      profilePhotoUrl,
    };
  },
});

// FIX #12: DELETED makeAdmin mutation — it was a security footgun.
// setAdmin (requires existing admin) and claimAdmin (one-time) are sufficient.

// One-time admin claim — only succeeds when no admin account exists yet
// OPTIMIZED: Uses by_isAdmin index for O(1) lookup instead of full table scan
export const claimAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Require JWT identity to prevent unauthenticated admin claims
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    if (identity.subject !== args.clerkId) throw new Error("Identity mismatch");

    // OPTIMIZED: Use index to check if any admin exists (O(1) instead of O(N))
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .first();
    if (existingAdmin) {
      throw new Error("Admin already claimed");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found — sign in first");

    await ctx.db.patch(user._id, { isAdmin: true });
    return user._id;
  },
});

// Public query — does any admin exist yet?
// OPTIMIZED: Uses by_isAdmin index for O(1) check instead of full table scan
export const getAdminExists = query({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .first();
    return admin !== null;
  },
});

export const getLogoUrl = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user?.logoStorageId) return null;
    return await ctx.storage.getUrl(user.logoStorageId);
  },
});

export const getProfilePhotoUrl = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user?.profilePhotoId) return null;
    return await ctx.storage.getUrl(user.profilePhotoId);
  },
});

export const saveProfilePhoto = mutation({
  args: { clerkId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const storageUrl = await ctx.storage.getUrl(args.storageId);
    await ctx.db.patch(user._id, { profilePhotoId: args.storageId, profilePhotoUrl: storageUrl ?? undefined });
  },
});

// ── Staff Management ────────────────────────────────────────────────────────

export const listStaff = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    // Only doctors can list staff
    if (user.role === "assistant") return { staff: [], invitations: [] };

    const staff = await ctx.db
      .query("users")
      .withIndex("by_clinic_id", (q) => q.eq("clinicId", user._id))
      .collect();

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return { staff, invitations };
  },
});

export const inviteStaff = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    roleName: v.string(),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (user.role === "assistant") throw new Error("Only doctors can invite staff");

    // Check if there's already a pending invite for this email
    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        role: args.roleName,
        permissions: args.permissions,
      });
    } else {
      await ctx.db.insert("invitations", {
        doctorId: user._id,
        email: args.email,
        name: args.name,
        role: args.roleName,
        permissions: args.permissions,
        status: "pending",
        createdAt: Date.now(),
      });
    }
  },
});

export const updateStaffPermissions = mutation({
  args: {
    clerkId: v.string(),
    staffId: v.id("users"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (user.role === "assistant") throw new Error("Only doctors can update staff");

    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.clinicId !== user._id) throw new Error("Staff not found");

    await ctx.db.patch(args.staffId, { permissions: args.permissions });
  },
});

export const removeStaff = mutation({
  args: {
    clerkId: v.string(),
    staffId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (user.role === "assistant") throw new Error("Only doctors can remove staff");

    const staff = await ctx.db.get(args.staffId);
    if (!staff || staff.clinicId !== user._id) throw new Error("Staff not found");

    // Remove them by unlinking them from the clinic
    await ctx.db.patch(args.staffId, { clinicId: undefined, role: "doctor" });
  },
});

export const removeInvitation = mutation({
  args: {
    clerkId: v.string(),
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (user.role === "assistant") throw new Error("Only doctors can remove invitations");

    const inv = await ctx.db.get(args.invitationId);
    if (!inv || inv.doctorId !== user._id) throw new Error("Invitation not found");

    await ctx.db.delete(args.invitationId);
  },
});

