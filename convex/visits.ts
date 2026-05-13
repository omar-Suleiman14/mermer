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
      .take(500);

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

    // OPTIMIZED: Only fetch patient when denormalized name is missing
    return await Promise.all(
      visits.map(async (v) => {
        const needsPatient = !v.patientName && v.patientId;
        const patient = needsPatient ? await ctx.db.get(v.patientId) : null;
        return { ...v, patient };
      })
    );
  },
});

// OPTIMIZED: Uses by_doctor_date range query with client-passed timestamps
// instead of .collect() ALL visits + Date.now() inside query (which defeats cache).
export const getVisitStats = query({
  args: {
    clerkId: v.string(),
    todayStart: v.optional(v.number()),
    weekStart: v.optional(v.number()),
    monthStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return { today: 0, week: 0, month: 0 };

    // Use client-provided timestamps (fallback for backwards compat)
    const now = Date.now();
    const todayMs = now - (now % 86400000);
    const todayStart = args.todayStart ?? todayMs;
    const monthStart = args.monthStart ?? (todayMs - 29 * 86400000);
    const weekStart = args.weekStart ?? (todayMs - 6 * 86400000);

    // OPTIMIZED: Only read this month's visits using date range index
    const monthVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", monthStart)
      )
      .take(5000);

    return {
      today: monthVisits.filter((v) => v.date >= todayStart).length,
      week: monthVisits.filter((v) => v.date >= weekStart).length,
      month: monthVisits.length,
    };
  },
});

export const createVisit = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.optional(v.number()),
    source: v.optional(v.union(v.literal("manual"), v.literal("appointment"))),
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
      source: (args.source ?? "manual") as any,
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

export const getVisitsByDateRange = query({
  args: {
    clerkId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", args.startDate).lte("date", args.endDate)
      )
      .collect();

    return visits.map((v) => ({
      _id: v._id,
      date: v.date,
      patientId: v.patientId,
      reasonForVisit: v.reasonForVisit,
    }));
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

export const updateVisit = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
    updates: v.object({
      status: v.optional(v.string()),
      notes: v.optional(v.string()),
      prescriptionImageId: v.optional(v.id("_storage")),
      date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not authorized");

    const patch: Record<string, any> = {};
    if (args.updates.status) patch.status = args.updates.status;
    if (args.updates.notes) patch.notes = args.updates.notes;
    if (args.updates.prescriptionImageId) patch.prescriptionImageId = args.updates.prescriptionImageId;
    if (args.updates.date) patch.date = args.updates.date;

    await ctx.db.patch(args.visitId, patch);
  },
});
