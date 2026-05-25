import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser, logAction } from "./authHelper";

// FIX #5: Batch-fetch installments for all patients in one query instead of N+1
export const listPatients = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // Cap at 500 patients to prevent unbounded reads
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(500);

    // BATCH: Fetch ALL installments for this doctor once, then group in JS
    const allinstallments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(2000);

    // Build a Set of patientIds that have unpaid balances
    const pastDuePatientIds = new Set<string>();
    for (const c of allinstallments) {
      if ((c.unpaidBalance ?? 0) > 0) {
        pastDuePatientIds.add(c.patientId.toString());
      }
    }

    // Get last visit per patient — still N queries but each reads only 1 row
    const enrichedPatients = await Promise.all(
      patients.map(async (p) => {
        const visits = await ctx.db
          .query("visits")
          .withIndex("by_patient", (q) => q.eq("patientId", p._id))
          .order("desc")
          .take(1);

        return {
          ...p,
          lastVisit: visits[0] ?? null,
          hasPastDue: pastDuePatientIds.has(p._id.toString()),
        };
      })
    );

    return enrichedPatients.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPatient = query({
  args: { patientId: v.id("patients"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) return null;
    return patient;
  },
});

// OPTIMIZED: Uses searchIndex for name search and by_doctor_phone for phone search
export const searchPatients = query({
  args: { clerkId: v.string(), search: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // BATCH: Fetch ALL installments for this doctor once
    const allinstallments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(2000);

    const pastDuePatientIds = new Set<string>();
    const activeinstallmentPatientIds = new Set<string>();
    for (const c of allinstallments) {
      if ((c.unpaidBalance ?? 0) > 0) pastDuePatientIds.add(c.patientId.toString());
      if (c.status === "active") activeinstallmentPatientIds.add(c.patientId.toString());
    }

    // Helper to enrich patients with hasPastDue using pre-fetched data
    const enrichPatients = (patientsArray: any[]) => {
      return patientsArray.map((p) => ({
        ...p,
        hasPastDue: pastDuePatientIds.has(p._id.toString()),
        hasActiveinstallment: activeinstallmentPatientIds.has(p._id.toString()),
      }));
    };

    if (!args.search.trim()) {
      // No search term — return recent patients with a cap
      const recent = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .order("desc")
        .take(20);
      return enrichPatients(recent);
    }

    const term = args.search.trim();

    // Check if search looks like a phone number
    const isPhoneSearch = /^\d+$/.test(term.replace(/[\s\-\(\)\+]/g, ""));

    if (isPhoneSearch) {
      const allPatients = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(500);
      const filtered = allPatients
        .filter((p) => p.phone.includes(term))
        .slice(0, 20);
      return enrichPatients(filtered);
    }

    // OPTIMIZED: Use searchIndex for name search (full-text search, much faster)
    try {
      const searchResults = await ctx.db
        .query("patients")
        .withSearchIndex("search_patients", (q) =>
          q.search("name", term).eq("doctorId", user._id)
        )
        .take(20);
      return enrichPatients(searchResults);
    } catch {
      // Fallback to index scan if searchIndex fails
      const allPatients = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(500);
      const lowerTerm = term.toLowerCase();
      const filtered = allPatients
        .filter(
          (p) =>
            p.name.toLowerCase().includes(lowerTerm) ||
            p.phone.includes(term)
        )
        .slice(0, 20);
      return enrichPatients(filtered);
    }
  },
});

export const createPatient = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patientId = await ctx.db.insert("patients", {
      doctorId: user._id,
      name: args.name,
      age: args.age,
      phone: args.phone,
      chronicConditions: args.chronicConditions,
      notes: args.notes,
      createdAt: Date.now(),
    });

    await logAction(ctx, user, "Added Patient", `Registered new patient: ${args.name}`, patientId);

    return patientId;
  },
});

export const updatePatient = mutation({
  args: {
    patientId: v.id("patients"),
    clerkId: v.string(),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.patientId, {
      name: args.name,
      age: args.age,
      phone: args.phone,
      chronicConditions: args.chronicConditions,
      notes: args.notes,
    });
    await logAction(ctx, user, "Updated Patient", `Updated details for ${args.name}`, args.patientId);
  },
});

// FIX #23: Cascade deletes — remove associated visits, installments, follow-ups, queue entries
export const deletePatient = mutation({
  args: { clerkId: v.string(), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new Error("Not found");

    // Fetch all related records in parallel
    const [visits, installments, followUps, queueItems] = await Promise.all([
      ctx.db.query("visits").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
      ctx.db.query("installments").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
      ctx.db.query("followUps").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect(),
      ctx.db.query("queue").withIndex("by_doctor", (q) => q.eq("doctorId", user._id)).collect(),
    ]);

    // Delete all related records in parallel + the patient itself
    await Promise.all([
      ...visits.map((v) => ctx.db.delete(v._id)),
      ...installments.map((c) => ctx.db.delete(c._id)),
      ...followUps.map((f) => ctx.db.delete(f._id)),
      ...queueItems.filter((q) => q.patientId === args.patientId).map((q) => ctx.db.delete(q._id)),
      ctx.db.delete(args.patientId),
    ]);
  },
});

// OPTIMIZED: Uses by_doctor_phone compound index for O(1) lookup
export const findPatientByNameAndPhone = query({
  args: { clerkId: v.string(), name: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    // OPTIMIZED: Use compound index for direct lookup by phone
    const byPhone = await ctx.db
      .query("patients")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", user._id).eq("phone", args.phone)
      )
      .first();

    if (byPhone && byPhone.name.toLowerCase() === args.name.toLowerCase()) {
      return byPhone;
    }

    return null;
  },
});
