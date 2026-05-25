import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// ── MEDICATIONS ──
export const getMedicationOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("medicationOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
  },
});

export const addMedicationOption = mutation({
  args: { clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db
      .query("medicationOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("medicationOptions", {
      doctorId: user._id,
      name: args.name,
    });
  },
});

export const exportAllMedications = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("medicationOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
  },
});

export const batchAddMedicationOptions = mutation({
  args: { clerkId: v.string(), medications: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const addedIds = [];
    
    for (const name of args.medications) {
      const existing = await ctx.db
        .query("medicationOptions")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .filter((q) => q.eq(q.field("name"), name))
        .first();
        
      if (!existing) {
        const id = await ctx.db.insert("medicationOptions", {
          doctorId: user._id,
          name: name,
        });
        addedIds.push(id);
      } else {
        addedIds.push(existing._id);
      }
    }
    return addedIds;
  },
});

// ── FREQUENCIES ──
export const getFrequencyOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("medicationFrequencyOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
  },
});

export const addFrequencyOption = mutation({
  args: { clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db
      .query("medicationFrequencyOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("medicationFrequencyOptions", {
      doctorId: user._id,
      name: args.name,
    });
  },
});

// ── NOTES ──
export const getNoteOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("medicationNoteOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
  },
});

export const addNoteOption = mutation({
  args: { clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db
      .query("medicationNoteOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("medicationNoteOptions", {
      doctorId: user._id,
      name: args.name,
    });
  },
});
