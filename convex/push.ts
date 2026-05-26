import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireAuthUser } from "./authHelper";

// You need to set these in your Convex dashboard environment variables:
// VAPID_PUBLIC_KEY
// VAPID_PRIVATE_KEY
// VAPID_SUBJECT (e.g., mailto:your-email@example.com)

export const saveSubscription = mutation({
  args: {
    clerkId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    if (!args.endpoint.startsWith("https://") || args.endpoint.length > 2048) {
      throw new Error("Invalid push endpoint");
    }
    if (args.p256dh.length > 256 || args.auth.length > 128) {
      throw new Error("Invalid push subscription");
    }

    // Check if subscription already exists
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("endpoint"), args.endpoint))
      .first();

    if (!existing) {
      await ctx.db.insert("pushSubscriptions", {
        userId: user._id,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        createdAt: Date.now(),
      });
    }
  },
});

export const getVapidPublicKey = query({
  args: {},
  handler: async () => {
    return process.env.VAPID_PUBLIC_KEY || null;
  },
});



export const getSubscriptionsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const removeSubscription = internalMutation({
  args: { id: v.id("pushSubscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
