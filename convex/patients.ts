import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireAuthUser, logAction } from "./authHelper";
import { Doc } from "./_generated/dataModel";

// FIX #5: Batch-fetch installments for all patients in one query instead of N+1
export const listPatients = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // Cap at 50 patients to prevent unbounded reads on dashboard load
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(50);

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
    const enrichPatients = (patientsArray: Doc<"patients">[]) => {
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
        .order("desc")
        .take(100);
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
        .order("desc")
        .take(100);
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
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    chronicConditions: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patientId = await ctx.db.insert("patients", {
      doctorId: user._id,
      name: args.name,
      age: args.age,
      gender: args.gender,
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
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    chronicConditions: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new ConvexError("Not found");

    await ctx.db.patch(args.patientId, {
      name: args.name,
      age: args.age,
      gender: args.gender,
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
    if (!patient || patient.doctorId !== user._id) throw new ConvexError("Not found");

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

export const exportAllPatients = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(5000); // Capped to prevent timeouts
  },
});

export const batchCreatePatients = mutation({
  args: {
    clerkId: v.string(),
    patients: v.array(v.object({
      name: v.string(),
      age: v.number(),
      gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
      phone: v.string(),
      chronicConditions: v.array(v.string()),
      notes: v.optional(v.string()),
    }))
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    
    if (args.patients.length > 500) {
      throw new ConvexError("Maximum 500 patients can be imported at once");
    }

    const addedIds = [];
    for (const p of args.patients) {
      const patientId = await ctx.db.insert("patients", {
        doctorId: user._id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        phone: p.phone,
        chronicConditions: p.chronicConditions,
        notes: p.notes,
        createdAt: Date.now(),
      });
      addedIds.push(patientId);
    }
    await logAction(ctx, user, "Batch Added Patients", `Registered ${addedIds.length} new patients via import`);
    return addedIds;
  },
});

export const getPatientAnalytics = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const newPatients = patients.filter(p => p.createdAt >= thirtyDaysAgo).length;

    const patientVisits: Record<string, number> = {};
    const patientLastVisit: Record<string, number> = {};
    
    for (const v of visits) {
      if (v.status === "cancelled") continue;
      const pid = v.patientId.toString();
      patientVisits[pid] = (patientVisits[pid] || 0) + 1;
      if (!patientLastVisit[pid] || v.date > patientLastVisit[pid]) {
        patientLastVisit[pid] = v.date;
      }
    }

    let returningPatients = 0;
    let activePatients = 0;
    const topReturning: { name: string; visits: number; phone: string }[] = [];

    for (const p of patients) {
      const pid = p._id.toString();
      const count = patientVisits[pid] || 0;
      if (count > 1) returningPatients++;
      
      const lastVisit = patientLastVisit[pid] || 0;
      if (lastVisit >= ninetyDaysAgo) {
        activePatients++;
      }
      
      if (count > 0) {
        topReturning.push({ name: p.name, visits: count, phone: p.phone });
      }
    }

    topReturning.sort((a, b) => b.visits - a.visits);

    let totalVisits = 0;
    Object.values(patientVisits).forEach(v => totalVisits += v);
    const avgVisits = patients.length > 0 ? (totalVisits / patients.length).toFixed(1) : "0";

    // Gender Distribution
    const genderDist = { male: 0, female: 0, other: 0 };
    // Age Distribution
    const ageDist = { "0-18": 0, "19-35": 0, "36-50": 0, "51-65": 0, "65+": 0 };

    for (const p of patients) {
      const g = p.gender || "other";
      if (g in genderDist) genderDist[g as keyof typeof genderDist]++;
      else genderDist.other++;

      const a = p.age || 0;
      if (a <= 18) ageDist["0-18"]++;
      else if (a <= 35) ageDist["19-35"]++;
      else if (a <= 50) ageDist["36-50"]++;
      else if (a <= 65) ageDist["51-65"]++;
      else ageDist["65+"]++;
    }

    return {
      totalPatients: patients.length,
      newPatients,
      returningPatients,
      activePatients,
      inactivePatients: patients.length - activePatients,
      avgVisits: parseFloat(avgVisits),
      topReturning: topReturning.slice(0, 5),
      genderDistribution: genderDist,
      ageDistribution: ageDist,
    };
  },
});
