import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listFollowUps = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    return await ctx.db
      .query("followUps")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("asc")
      .take(200);
  },
});

export const listFollowUpsByPatient = query({
  args: { clerkId: v.string(), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const followUps = await ctx.db
      .query("followUps")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(50);
    return followUps.filter((f) => f.doctorId === user._id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createFollowUp = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    followUpDate: v.number(),
    followUpTime: v.string(),
    type: v.union(
      v.literal("in-person"),
      v.literal("call"),
      v.literal("whatsapp")
    ),
    note: v.optional(v.string()),
    parentVisitId: v.optional(v.id("visits")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id)
      throw new Error("Patient not found");

    // followUpDate is now a full timestamp (with correct time) computed by the client
    const followUpTimestamp = args.followUpDate;

    // Create a visit for this follow-up so it shows in the schedule
    const visitId = await ctx.db.insert("visits", {
      patientId: args.patientId,
      doctorId: user._id,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientAge: patient.age,
      date: followUpTimestamp,
      source: "follow-up",
      status: "confirmed",
      reasonForVisit: `Follow-up${args.note ? ` — ${args.note}` : ""}`,
      createdAt: Date.now(),
    });

    const id = await ctx.db.insert("followUps", {
      doctorId: user._id,
      patientId: args.patientId,
      visitId,
      parentVisitId: args.parentVisitId,
      patientName: patient.name,
      followUpDate: args.followUpDate,
      followUpTime: args.followUpTime,
      type: args.type,
      note: args.note,
      status: "scheduled",
      createdAt: Date.now(),
    });

    return id;
  },
});

export const updateFollowUp = mutation({
  args: {
    clerkId: v.string(),
    followUpId: v.id("followUps"),
    updates: v.object({
      followUpDate: v.optional(v.number()),
      followUpTime: v.optional(v.string()),
      type: v.optional(
        v.union(
          v.literal("in-person"),
          v.literal("call"),
          v.literal("whatsapp")
        )
      ),
      note: v.optional(v.string()),
      status: v.optional(
        v.union(
          v.literal("scheduled"),
          v.literal("done"),
          v.literal("cancelled")
        )
      ),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const fu = await ctx.db.get(args.followUpId);
    if (!fu || fu.doctorId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.followUpId, args.updates);
  },
});

export const deleteFollowUp = mutation({
  args: { clerkId: v.string(), followUpId: v.id("followUps") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const fu = await ctx.db.get(args.followUpId);
    if (!fu || fu.doctorId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.followUpId);
  },
});
