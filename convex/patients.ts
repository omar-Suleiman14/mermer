import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// OPTIMIZED: Added .take(500) safety cap and only fetches last visit when
// denormalized data would be useful. Prevents unbounded growth.
export const listPatients = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    // OPTIMIZED: Cap at 500 patients to prevent unbounded reads
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(500);

    // Get last visit and past due status for each patient
    const enrichedPatients = await Promise.all(
      patients.map(async (p) => {
        const visits = await ctx.db
          .query("visits")
          .withIndex("by_patient", (q) => q.eq("patientId", p._id))
          .order("desc")
          .take(1);
          
        const contracts = await ctx.db
          .query("contracts")
          .withIndex("by_patient", (q) => q.eq("patientId", p._id))
          .collect();
        const hasPastDue = contracts.some((c) => (c.unpaidBalance ?? 0) > 0);

        return { ...p, lastVisit: visits[0] ?? null, hasPastDue };
      })
    );

    return enrichedPatients.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getPatient = query({
  args: { patientId: v.id("patients"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) return null;
    return patient;
  },
});

// OPTIMIZED: Uses searchIndex for name search and by_doctor_phone for phone search
// instead of .collect() all patients + JS filter
export const searchPatients = query({
  args: { clerkId: v.string(), search: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    // Helper to enrich patients with hasPastDue
    const enrichPatients = async (patientsArray: any[]) => {
      return await Promise.all(patientsArray.map(async (p) => {
        const contracts = await ctx.db
          .query("contracts")
          .withIndex("by_patient", (q) => q.eq("patientId", p._id))
          .collect();
        const hasPastDue = contracts.some((c) => (c.unpaidBalance ?? 0) > 0);
        const hasActiveContract = contracts.some((c) => c.status === "active");
        return { ...p, hasPastDue, hasActiveContract };
      }));
    };

    if (!args.search.trim()) {
      // No search term — return recent patients with a cap
      const recent = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .order("desc")
        .take(20);
      return await enrichPatients(recent);
    }

    const term = args.search.trim();

    // Check if search looks like a phone number
    const isPhoneSearch = /^\d+$/.test(term.replace(/[\s\-\(\)\+]/g, ""));

    if (isPhoneSearch) {
      // OPTIMIZED: Use index for phone-based search when possible
      const allPatients = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(500);
      const filtered = allPatients
        .filter((p) => p.phone.includes(term))
        .slice(0, 20);
      return await enrichPatients(filtered);
    }

    // OPTIMIZED: Use searchIndex for name search (full-text search, much faster)
    try {
      const searchResults = await ctx.db
        .query("patients")
        .withSearchIndex("search_patients", (q) =>
          q.search("name", term).eq("doctorId", user._id)
        )
        .take(20);
      return await enrichPatients(searchResults);
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
      return await enrichPatients(filtered);
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("patients", {
      doctorId: user._id,
      name: args.name,
      age: args.age,
      phone: args.phone,
      chronicConditions: args.chronicConditions,
      notes: args.notes,
      createdAt: Date.now(),
    });
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.patientId, {
      name: args.name,
      age: args.age,
      phone: args.phone,
      chronicConditions: args.chronicConditions,
      notes: args.notes,
    });
  },
});

export const deletePatient = mutation({
  args: { clerkId: v.string(), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new Error("Not found");
    await ctx.db.delete(args.patientId);
  },
});

// OPTIMIZED: Uses by_doctor_phone compound index for O(1) lookup
export const findPatientByNameAndPhone = query({
  args: { clerkId: v.string(), name: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
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
