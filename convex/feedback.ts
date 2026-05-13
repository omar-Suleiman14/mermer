import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ─── Submit feedback (public, no auth) ──────────────────────────────────────

export const submitFeedback = mutation({
  args: {
    slug: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    patientName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor) throw new Error("Doctor not found");

    if (args.rating < 1 || args.rating > 5) throw new Error("Invalid rating");

    return await ctx.db.insert("feedback", {
      doctorId: doctor._id,
      rating: args.rating,
      comment: args.comment,
      patientName: args.patientName,
      createdAt: Date.now(),
    });
  },
});

// ─── List feedback for a doctor ──────────────────────────────────────────────

export const listFeedback = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(100);
  },
});

// ─── Feedback stats ──────────────────────────────────────────────────────────

export const getFeedbackStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return { average: 0, count: 0 };

    const items = await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(1000);

    if (items.length === 0) return { average: 0, count: 0 };
    const sum = items.reduce((a, b) => a + b.rating, 0);
    return { average: sum / items.length, count: items.length };
  },
});

// ─── Public: get doctor info by slug ─────────────────────────────────────────

export const getDoctorInfoBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor) return null;
    return {
      name: doctor.name,
      clinicName: doctor.clinicName,
      specialty: doctor.specialty,
    };
  },
});

// ─── Get stored QR URL (or null if not yet generated) ────────────────────────

export const getFeedbackQrUrl = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;
    if (!user.feedbackQrStorageId) return null;
    return await ctx.storage.getUrl(user.feedbackQrStorageId);
  },
});

// ─── Internal helpers used by the generate action ─────────────────────────────

export const _getUserQrInfo = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;
    return {
      qrSlug: user.qrSlug ?? null,
      feedbackQrStorageId: user.feedbackQrStorageId ?? null,
    };
  },
});

export const _saveFeedbackQrStorageId = internalMutation({
  args: { clerkId: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { feedbackQrStorageId: args.storageId });
  },
});
