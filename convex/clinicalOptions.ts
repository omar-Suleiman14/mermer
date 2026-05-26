import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";
import { TOP_EGYPTIAN_MEDS } from "./topEgyptianMeds";

// ── MEDICATIONS ──
export const getMedicationOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    const dbMeds = await ctx.db
      .query("medicationOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
      
    const customNames = new Set(dbMeds.map(m => m.name.toLowerCase()));
    const defaults = TOP_EGYPTIAN_MEDS.filter(n => !customNames.has(n.toLowerCase())).map(name => ({
      _id: `default_${name}` as any,
      _creationTime: 0,
      doctorId: user._id,
      name
    }));
    return [...defaults, ...dbMeds];
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

export const deleteMedicationOption = mutation({
  args: { clerkId: v.string(), id: v.string() },
  handler: async (ctx, args) => {
    if (args.id.startsWith("default_")) return;
    const normId = ctx.db.normalizeId("medicationOptions", args.id);
    if (!normId) return;
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db.get(normId);
    if (!existing || existing.doctorId !== user._id) return;
    await ctx.db.delete(normId);
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

export const deleteFrequencyOption = mutation({
  args: { clerkId: v.string(), id: v.id("medicationFrequencyOptions") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.doctorId !== user._id) return;
    await ctx.db.delete(args.id);
  },
});

export const exportAllFrequencies = query({
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

export const batchAddFrequencyOptions = mutation({
  args: { clerkId: v.string(), frequencies: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const addedIds = [];
    
    for (const name of args.frequencies) {
      const existing = await ctx.db
        .query("medicationFrequencyOptions")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .filter((q) => q.eq(q.field("name"), name))
        .first();
        
      if (!existing) {
        const id = await ctx.db.insert("medicationFrequencyOptions", {
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

export const deleteNoteOption = mutation({
  args: { clerkId: v.string(), id: v.id("medicationNoteOptions") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.doctorId !== user._id) return;
    await ctx.db.delete(args.id);
  },
});

export const exportAllNotes = query({
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

export const batchAddNoteOptions = mutation({
  args: { clerkId: v.string(), notes: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const addedIds = [];
    
    for (const name of args.notes) {
      const existing = await ctx.db
        .query("medicationNoteOptions")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .filter((q) => q.eq(q.field("name"), name))
        .first();
        
      if (!existing) {
        const id = await ctx.db.insert("medicationNoteOptions", {
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

export const getAllClinicalOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return { medications: [], frequencies: [], notes: [] };

    const dbMeds = await ctx.db
      .query("medicationOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
      
    const customNames = new Set(dbMeds.map(m => m.name.toLowerCase()));
    const defaultMeds = TOP_EGYPTIAN_MEDS.filter(n => !customNames.has(n.toLowerCase())).map(name => ({
      _id: `default_${name}` as any,
      _creationTime: 0,
      doctorId: user._id,
      name
    }));

    const frequencies = await ctx.db
      .query("medicationFrequencyOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const notes = await ctx.db
      .query("medicationNoteOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    return { medications: [...defaultMeds, ...dbMeds], frequencies, notes };
  },
});
