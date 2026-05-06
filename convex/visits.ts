import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getVisitsByPatient = query({
  args: { patientId: v.id("patients"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();

    // Resolve storage URLs
    return await Promise.all(
      visits.map(async (v) => {
        const prescriptionImageUrl = v.prescriptionImageId
          ? await ctx.storage.getUrl(v.prescriptionImageId)
          : null;
        const prescriptionPdfUrl = v.prescriptionPdfId
          ? await ctx.storage.getUrl(v.prescriptionPdfId)
          : null;
        const documentUrls = v.documentIds
          ? await Promise.all(
              v.documentIds.map((id) => ctx.storage.getUrl(id))
            )
          : [];
        return { ...v, prescriptionImageUrl, prescriptionPdfUrl, documentUrls };
      })
    );
  },
});

export const getRecentVisits = query({
  args: { clerkId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(args.limit ?? 5);

    return await Promise.all(
      visits.map(async (v) => {
        const patient = await ctx.db.get(v.patientId);
        return { ...v, patient };
      })
    );
  },
});

export const getVisitStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return { today: 0, week: 0, month: 0 };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const allVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    return {
      today: allVisits.filter((v) => v.date >= startOfDay.getTime()).length,
      week: allVisits.filter((v) => v.date >= startOfWeek.getTime()).length,
      month: allVisits.filter((v) => v.date >= startOfMonth.getTime()).length,
    };
  },
});

export const createVisit = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.optional(v.number()),
    reasonForVisit: v.optional(v.string()),
    prescribedMedications: v.optional(v.array(v.string())),
    analysisRequested: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("visits", {
      patientId: args.patientId,
      doctorId: user._id,
      date: args.date ?? Date.now(),
      reasonForVisit: args.reasonForVisit,
      prescribedMedications: args.prescribedMedications,
      analysisRequested: args.analysisRequested,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const addVisitFiles = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
    prescriptionImageId: v.optional(v.id("_storage")),
    prescriptionPdfId: v.optional(v.id("_storage")),
    documentIds: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not found");

    const existingDocIds = visit.documentIds ?? [];
    const newDocIds = args.documentIds ?? [];

    await ctx.db.patch(args.visitId, {
      ...(args.prescriptionImageId ? { prescriptionImageId: args.prescriptionImageId } : {}),
      ...(args.prescriptionPdfId ? { prescriptionPdfId: args.prescriptionPdfId } : {}),
      documentIds: [...existingDocIds, ...newDocIds],
    });
  },
});

export const deleteVisit = mutation({
  args: { clerkId: v.string(), visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.visitId);
  },
});
