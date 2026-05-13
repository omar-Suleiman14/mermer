import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    const slug = generateSlug(args.name);

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      phone: "",
      clinicName: "My Clinic",
      whatsappTemplate:
        "مرحباً {{name}}، دورك التالي في العيادة. يرجى التوجه للعيادة الآن. شكراً لك.",
      createdAt: Date.now(),
      isAdmin: false,
      qrSlug: slug,
      publicProfile: false,
    });
    return id;
  },
});

export const getCurrentUser = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const { clerkId, ...fields } = args;
    await ctx.db.patch(user._id, fields);
  },
});

// Admin: list all doctors
export const listAllDoctors = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");
    return await ctx.db.query("users").take(20000);
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
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");
    await ctx.db.patch(args.targetUserId, { isAdmin: args.isAdmin });
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
    return { ...doctor, profilePhotoUrl };
  },
});

// Make a user admin by clerkId (utility mutation — call once from admin panel or seed)
export const makeAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { isAdmin: true });
  },
});

// One-time admin claim — only succeeds when no admin account exists yet
// OPTIMIZED: Uses by_isAdmin index for O(1) lookup instead of full table scan
export const claimAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user?.logoStorageId) return null;
    return await ctx.storage.getUrl(user.logoStorageId);
  },
});

export const getProfilePhotoUrl = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user?.profilePhotoId) return null;
    return await ctx.storage.getUrl(user.profilePhotoId);
  },
});

export const saveProfilePhoto = mutation({
  args: { clerkId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { profilePhotoId: args.storageId });
  },
});
