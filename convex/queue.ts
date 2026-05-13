import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Returns the start-of-day timestamp (midnight) for a given UTC timestamp. */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── Get queue for a specific date ──────────────────────────────────────────

export const getQueueByDate = query({
  args: { clerkId: v.string(), date: v.number(), includeDone: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const queueDate = startOfDay(args.date);

    const queueItems = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).eq("queueDate", queueDate)
      )
      .collect();

    const items = args.includeDone
      ? queueItems
      : queueItems.filter((q) => q.status !== "done");

    // Sort by scheduledTime (nulls last), then position
    const sorted = [...items].sort((a, b) => {
      if (a.scheduledTime != null && b.scheduledTime != null)
        return a.scheduledTime - b.scheduledTime;
      if (a.scheduledTime != null) return -1;
      if (b.scheduledTime != null) return 1;
      return a.position - b.position;
    });

    return await Promise.all(
      sorted.map(async (item) => {
        const patient = await ctx.db.get(item.patientId);
        return { ...item, patient };
      })
    );
  },
});

// ─── Legacy alias — kept for backwards compat with existing imports ───────────

export const getTodayQueue = query({
  args: { clerkId: v.string(), todayTs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    // OPTIMIZED: Accept date from client instead of Date.now() (preserves query cache)
    const queueDate = startOfDay(args.todayTs ?? Date.now());

    const queueItems = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).eq("queueDate", queueDate)
      )
      .collect();

    const activeItems = queueItems
      .filter((q) => q.status !== "done")
      .sort((a, b) => a.position - b.position);

    return await Promise.all(
      activeItems.map(async (item) => {
        const patient = await ctx.db.get(item.patientId);
        return { ...item, patient };
      })
    );
  },
});

// ─── Add patient to queue for a specific date ────────────────────────────────

export const addToQueue = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    scheduledTime: v.optional(v.number()),
    queueDate: v.optional(v.number()), // defaults to today if not provided
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const queueDate = startOfDay(args.queueDate ?? Date.now());

    const existingForDate = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).eq("queueDate", queueDate)
      )
      .collect();

    const active = existingForDate.filter((q) => q.status !== "done");

    const alreadyIn = active.find((q) => q.patientId === args.patientId);
    if (alreadyIn) return alreadyIn._id;

    // Reject if the requested slot is already taken by another patient
    if (args.scheduledTime != null) {
      const slotConflict = active.find(
        (q) => q.scheduledTime === args.scheduledTime && q.patientId !== args.patientId
      );
      if (slotConflict) throw new Error("This time slot is already booked");
    }

    const maxPos = active.reduce((m, q) => Math.max(m, q.position), 0);

    // Calculate scheduled time based on existing queue + slot duration
    let scheduledTime = args.scheduledTime;
    if (!scheduledTime && active.length > 0 && user.slotDurationMinutes) {
      const lastItem = active.sort((a, b) => b.position - a.position)[0];
      if (lastItem.scheduledTime) {
        scheduledTime = lastItem.scheduledTime + user.slotDurationMinutes * 60 * 1000;
      }
    }

    return await ctx.db.insert("queue", {
      doctorId: user._id,
      patientId: args.patientId,
      queueDate,
      position: maxPos + 1,
      status: active.length === 0 ? "in-progress" : "waiting",
      addedAt: Date.now(),
      scheduledTime,
      reminderSent: false,
    });
  },
});

// ─── Mark patient as done ────────────────────────────────────────────────────

export const markDone = mutation({
  args: {
    clerkId: v.string(),
    queueId: v.id("queue"),
    visitId: v.optional(v.id("visits")), // link the visit created when completing
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const item = await ctx.db.get(args.queueId);
    if (!item || item.doctorId !== user._id) throw new Error("Not found");

    await ctx.db.patch(args.queueId, {
      status: "done",
      ...(args.visitId ? { visitId: args.visitId } : {}),
    });

    // Promote the next waiting patient to in-progress (same date)
    // queueDate may be undefined on legacy documents — skip promotion if so
    if (item.queueDate !== undefined) {
      const remaining = await ctx.db
        .query("queue")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("queueDate", item.queueDate!)
        )
        .collect();

      const waiting = remaining
        .filter((q) => q.status === "waiting" && q._id !== args.queueId)
        .sort((a, b) => a.position - b.position);

      if (waiting.length > 0) {
        await ctx.db.patch(waiting[0]._id, { status: "in-progress" });
      }
    }
  },
});

// ─── Drag-to-reorder ─────────────────────────────────────────────────────────

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
          await ctx.db.patch(id, {
            position: idx + 1,
            status: idx === 0 ? "in-progress" : "waiting",
            // scheduledTime is intentionally NOT touched here.
            // A patient's slot is fixed when they are added to the queue.
            // The only way to change it is to remove and re-add them.
          });
        }
      })
    );
  },
});

// ─── Mark reminder sent ──────────────────────────────────────────────────────

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

// ─── Clear done entries ──────────────────────────────────────────────────────

export const clearDone = mutation({
  args: { clerkId: v.string(), date: v.optional(v.number()) },
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

    // If a date is specified, only clear done for that date
    const toDelete = args.date
      ? done.filter((d) => d.queueDate === startOfDay(args.date!))
      : done;

    await Promise.all(toDelete.map((d) => ctx.db.delete(d._id)));
  },
});

// ─── Update scheduled start time ─────────────────────────────────────────────

export const updateQueueStartTime = mutation({
  args: {
    clerkId: v.string(),
    queueId: v.id("queue"),
    scheduledTime: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const item = await ctx.db.get(args.queueId);
    if (!item || item.doctorId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.queueId, { scheduledTime: args.scheduledTime });
  },
});

// ─── Get dates that have queue entries (for calendar display) ────────────────

export const getQueueDates = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const all = await ctx.db
      .query("queue")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(200);

    const uniqueDates = [...new Set(all.map((q) => q.queueDate).filter((d): d is number => d !== undefined))].sort();
    return uniqueDates;
  },
});
