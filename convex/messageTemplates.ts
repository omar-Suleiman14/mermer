import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listTemplates = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    return await ctx.db
      .query("messageTemplates")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("asc")
      .take(100);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createTemplate = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    return await ctx.db.insert("messageTemplates", {
      doctorId: user._id,
      name: args.name,
      body: args.body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateTemplate = mutation({
  args: {
    clerkId: v.string(),
    templateId: v.id("messageTemplates"),
    name: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const tpl = await ctx.db.get(args.templateId);
    if (!tpl || tpl.doctorId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.templateId, {
      name: args.name,
      body: args.body,
      updatedAt: Date.now(),
    });
  },
});

export const deleteTemplate = mutation({
  args: { clerkId: v.string(), templateId: v.id("messageTemplates") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const tpl = await ctx.db.get(args.templateId);
    if (!tpl || tpl.doctorId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.templateId);
  },
});
