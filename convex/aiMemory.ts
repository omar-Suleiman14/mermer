import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────────────────────────
// GET LAST 50 MESSAGES
// ─────────────────────────────────────────────────────────────────────────────

export const getConversationHistory = query({
  args: {
    telegramId: v.string(),
  },

  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("aiConversations")
      .withIndex("by_telegram", (q) =>
        q.eq("telegramId", args.telegramId)
      )
      .order("desc")
      .take(50);

    return messages.reverse();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAVE MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

export const saveMessage = mutation({
  args: {
    doctorId: v.id("users"),
    telegramId: v.string(),

    role: v.union(
      v.literal("system"),
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool")
    ),

    content: v.string(),

    toolName: v.optional(v.string()),
    toolResult: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("aiConversations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// GET SESSION MEMORY
// ─────────────────────────────────────────────────────────────────────────────

export const getMemory = query({
  args: {
    telegramId: v.string(),
  },

  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiMemory")
      .withIndex("by_telegram", (q) =>
        q.eq("telegramId", args.telegramId)
      )
      .unique();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MEMORY
// ─────────────────────────────────────────────────────────────────────────────

export const updateMemory = mutation({
  args: {
    doctorId: v.id("users"),
    telegramId: v.string(),

    lastPatientId: v.optional(v.id("patients")),
    lastQueueId: v.optional(v.id("queue")),
    lastVisitId: v.optional(v.id("visits")),
    lastAppointmentId: v.optional(v.id("visits")),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiMemory")
      .withIndex("by_telegram", (q) =>
        q.eq("telegramId", args.telegramId)
      )
      .unique();

    const patch = {
      doctorId: args.doctorId,
      telegramId: args.telegramId,
      ...(args.lastPatientId !== undefined && { lastPatientId: args.lastPatientId }),
      ...(args.lastQueueId !== undefined && { lastQueueId: args.lastQueueId }),
      ...(args.lastVisitId !== undefined && { lastVisitId: args.lastVisitId }),
      ...(args.lastAppointmentId !== undefined && { lastAppointmentId: args.lastAppointmentId }),
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("aiMemory", patch);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SAVE FAILURE
// ─────────────────────────────────────────────────────────────────────────────

export const saveFailure = mutation({
  args: {
    doctorId: v.optional(v.id("users")),
    telegramId: v.optional(v.string()),

    userMessage: v.string(),
    aiResponse: v.string(),

    intendedAction: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    return await ctx.db.insert("aiFailures", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
