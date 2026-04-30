import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getTodayQueue = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const queueItems = await ctx.db
      .query("queue")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    // Filter to today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayItems = queueItems
      .filter((q) => q.addedAt >= startOfDay.getTime() && q.status !== "done")
      .sort((a, b) => a.position - b.position);

    // Join with patient
    return await Promise.all(
      todayItems.map(async (item) => {
        const patient = await ctx.db.get(item.patientId);
        return { ...item, patient };
      })
    );
  },
});

export const addToQueue = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    // Get existing active queue
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const existing = await ctx.db
      .query("queue")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const active = existing.filter(
      (q) => q.addedAt >= startOfDay.getTime() && q.status !== "done"
    );

    // Check already in queue
    const alreadyIn = active.find((q) => q.patientId === args.patientId);
    if (alreadyIn) return alreadyIn._id;

    const maxPos = active.reduce((m, q) => Math.max(m, q.position), 0);

    return await ctx.db.insert("queue", {
      doctorId: user._id,
      patientId: args.patientId,
      position: maxPos + 1,
      status: active.length === 0 ? "in-progress" : "waiting",
      addedAt: Date.now(),
      reminderSent: false,
    });
  },
});

export const markDone = mutation({
  args: { clerkId: v.string(), queueId: v.id("queue") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.queueId);
    if (!item || item.doctorId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.queueId, { status: "done" });

    // Promote next waiting patient to in-progress
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const remaining = await ctx.db
      .query("queue")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const waiting = remaining
      .filter(
        (q) =>
          q.addedAt >= startOfDay.getTime() &&
          q.status === "waiting" &&
          q._id !== args.queueId
      )
      .sort((a, b) => a.position - b.position);

    if (waiting.length > 0) {
      await ctx.db.patch(waiting[0]._id, { status: "in-progress" });
    }
  },
});

export const reorderQueue = mutation({
  args: {
    clerkId: v.string(),
    orderedIds: v.array(v.id("queue")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    await Promise.all(
      args.orderedIds.map(async (id, idx) => {
        const item = await ctx.db.get(id);
        if (item && item.doctorId === user._id) {
          // First item is in-progress, rest are waiting
          await ctx.db.patch(id, {
            position: idx + 1,
            status: idx === 0 ? "in-progress" : "waiting",
          });
        }
      })
    );
  },
});

export const markReminderSent = mutation({
  args: { clerkId: v.string(), queueId: v.id("queue") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.queueId);
    if (!item || item.doctorId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.queueId, { reminderSent: true });
  },
});

export const clearDone = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const done = await ctx.db
      .query("queue")
      .withIndex("by_doctor_status", (q) =>
        q.eq("doctorId", user._id).eq("status", "done")
      )
      .collect();
    await Promise.all(done.map((d) => ctx.db.delete(d._id)));
  },
});
