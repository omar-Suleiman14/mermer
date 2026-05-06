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
        "Hello {{name}}, you are next in line at the clinic. Please make your way over now. Thank you!",
      createdAt: Date.now(),
      tier: "free",
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
    workingHours: v.optional(v.string()),
    slotDurationMinutes: v.optional(v.number()),
    bio: v.optional(v.string()),
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
      workingHours: args.workingHours,
      slotDurationMinutes: args.slotDurationMinutes,
      bio: args.bio,
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
    return await ctx.db.query("users").collect();
  },
});

// Admin: set tier
export const setTier = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    tier: v.union(v.literal("free"), v.literal("premium")),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");
    await ctx.db.patch(args.targetUserId, {
      tier: args.tier,
      publicProfile: args.tier === "premium",
    });
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

// Public: search premium doctors
export const searchPremiumDoctors = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("users").collect();
    const premium = all.filter((u) => u.tier === "premium" && u.publicProfile);
    if (!args.search.trim()) return premium;
    const q = args.search.toLowerCase();
    return premium.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.specialty ?? "").toLowerCase().includes(q) ||
        (u.clinicName ?? "").toLowerCase().includes(q)
    );
  },
});

// Public: get doctor by qrSlug
export const getDoctorBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
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
export const claimAdmin = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Check if any admin already exists
    const allUsers = await ctx.db.query("users").collect();
    const existingAdmin = allUsers.find((u) => u.isAdmin === true);
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
export const getAdminExists = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    return all.some((u) => u.isAdmin === true);
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

