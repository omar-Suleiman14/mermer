import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get current user (by clerkId passed from client)
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

    const id = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      phone: "",
      clinicName: "My Clinic",
      whatsappTemplate:
        "Hello {{name}}, this is a reminder that you are next in line at the clinic. Please make your way over now. Thank you!",
      createdAt: Date.now(),
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
