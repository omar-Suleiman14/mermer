import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listPatients = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    // Get last visit for each patient
    const patientsWithLastVisit = await Promise.all(
      patients.map(async (p) => {
        const visits = await ctx.db
          .query("visits")
          .withIndex("by_patient", (q) => q.eq("patientId", p._id))
          .order("desc")
          .take(1);
        return { ...p, lastVisit: visits[0] ?? null };
      })
    );

    return patientsWithLastVisit.sort((a, b) => b.createdAt - a.createdAt);
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

export const searchPatients = query({
  args: { clerkId: v.string(), search: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    if (!args.search.trim()) {
      return await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(20);
    }

    const byName = await ctx.db
      .query("patients")
      .withSearchIndex("search_patients", (q) =>
        q.search("name", args.search).eq("doctorId", user._id)
      )
      .take(10);

    // Also search by phone (manual filter)
    const allPatients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const byPhone = allPatients.filter((p) =>
      p.phone.includes(args.search)
    );

    // Merge and deduplicate
    const seen = new Set(byName.map((p) => p._id));
    const results = [...byName];
    for (const p of byPhone) {
      if (!seen.has(p._id)) {
        results.push(p);
        seen.add(p._id);
      }
    }
    return results.slice(0, 20);
  },
});

export const createPatient = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
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
    });
  },
});

export const findPatientByNameAndPhone = query({
  args: { clerkId: v.string(), name: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;

    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    return (
      patients.find(
        (p) =>
          p.name.toLowerCase() === args.name.toLowerCase() &&
          p.phone === args.phone
      ) ?? null
    );
  },
});
