import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Link Telegram ID to a doctor (called from mini-app after sign-in) ────────

export const linkTelegram = mutation({
  args: {
    clerkId: v.string(),
    telegramId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    // Make sure this Telegram ID is not already linked to a different account
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .unique();

    if (existing && existing._id !== user._id) {
      // Revoke the previous link silently so the new one wins
      await ctx.db.patch(existing._id, { telegramId: undefined });
    }

    await ctx.db.patch(user._id, { telegramId: args.telegramId });
    return { success: true, doctorName: user.name, clinicName: user.clinicName };
  },
});

// ─── Unlink (revoke) Telegram from a doctor ───────────────────────────────────

export const unlinkTelegram = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { telegramId: undefined });
    return { success: true };
  },
});

// ─── Get current Telegram link status (for dashboard banner) ──────────────────

export const getTelegramStatus = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;
    return {
      linked: !!user.telegramId,
      telegramId: user.telegramId ?? null,
    };
  },
});

// ─── Public: look up a doctor by Telegram ID (used by webhook route) ────────────
// Safe: returns the full user record; the webhook only proceeds if a record exists.

export const getDoctorByTelegramId = query({
  args: { telegramId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramId", args.telegramId))
      .unique();
  },
});

// ─── Public: get all patients for a doctor (bot function-calling tool) ──────────

export const getPatientsForBot = query({
  args: { doctorId: v.id("users") },
  handler: async (ctx, args) => {
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .take(200);

    return patients.map((p) => ({
      id: p._id,
      name: p.name,
      age: p.age,
      phone: p.phone,
      chronicConditions: p.chronicConditions,
      notes: p.notes ?? null,
      createdAt: p.createdAt,
    }));
  },
});

// ─── Public: get today's queue for a doctor (bot tool) ──────────────────────────

export const getTodayQueueForBot = query({
  args: { doctorId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const queueDate = d.getTime();

    const queueItems = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", args.doctorId).eq("queueDate", queueDate)
      )
      .collect();

    const sorted = [...queueItems]
      .sort((a, b) => a.position - b.position);

    return await Promise.all(
      sorted.map(async (item) => {
        const patient = await ctx.db.get(item.patientId);
        return {
          queueId: item._id,
          position: item.position,
          status: item.status,
          scheduledTime: item.scheduledTime ?? null,
          patientName: patient?.name ?? "Unknown",
          patientPhone: patient?.phone ?? null,
          patientAge: patient?.age ?? null,
        };
      })
    );
  },
});

// ─── Public: search patients by name/phone (bot tool) ─────────────────────────

export const searchPatientsForBot = query({
  args: { doctorId: v.id("users"), query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase();
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();

    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
      .slice(0, 5)
      .map((p) => ({
        patientId: p._id,
        name: p.name,
        phone: p.phone,
        age: p.age,
      }));
  },
});

// ─── Public: add a patient to today's queue (bot tool) ────────────────────────

export const addPatientToQueueBot = mutation({
  args: { doctorId: v.id("users"), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const queueDate = d.getTime();

    // Verify patient belongs to doctor
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== args.doctorId) throw new Error("Patient not found");

    const existingQueue = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", args.doctorId).eq("queueDate", queueDate)
      )
      .collect();

    // Check if already in queue
    if (existingQueue.some((q) => q.patientId === args.patientId)) {
      return { success: false, message: "Patient is already in today's queue." };
    }

    const maxPos = existingQueue.reduce((max, q) => Math.max(max, q.position), 0);
    await ctx.db.insert("queue", {
      doctorId: args.doctorId,
      patientId: args.patientId,
      queueDate,
      position: maxPos + 1,
      status: "waiting",
      scheduledTime: now,
      addedAt: now,
      reminderSent: false,
    });

    return { success: true, message: `Added ${patient.name} to the queue at position ${maxPos + 1}.` };
  },
});

// ─── Public: mark a queue item as done (bot tool) ─────────────────────────────

export const markQueueDoneBot = mutation({
  args: { doctorId: v.id("users"), queueId: v.id("queue") },
  handler: async (ctx, args) => {
    const qItem = await ctx.db.get(args.queueId);
    if (!qItem || qItem.doctorId !== args.doctorId) throw new Error("Queue item not found");

    await ctx.db.patch(args.queueId, { status: "done" });
    return { success: true, message: "Patient marked as completed." };
  },
});

// ─── Public: get basic analytics (bot tool) ───────────────────────────────────

export const getAnalyticsBot = query({
  args: { doctorId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.doctorId);
    const patients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.doctorId))
      .collect();
      
    // Count today's patients
    const now = Date.now();
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    const queueDate = d.getTime();
    const queue = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", args.doctorId).eq("queueDate", queueDate)
      )
      .collect();

    const doneCount = queue.filter(q => q.status === "done").length;
    const fee = user?.consultationFee || 0;
    const expectedRevenue = doneCount * fee;

    return {
      totalPatientsRegistered: patients.length,
      patientsSeenToday: doneCount,
      totalQueueToday: queue.length,
      estimatedRevenueTodayEGP: expectedRevenue,
    };
  },
});
