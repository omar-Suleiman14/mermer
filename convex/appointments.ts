import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns the start-of-day timestamp (midnight) for a given UTC timestamp. */
function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── Public booking ──────────────────────────────────────────────────────────

/**
 * Patient-facing booking mutation.
 *
 * When a patient books online it:
 *   1. Creates an `appointments` record (status = "pending")
 *   2. Finds an existing patient record by phone, or creates a new one
 *   3. Creates a `visits` record (source = "appointment") for that day
 *   4. Adds the patient to the queue for the correct date
 *
 * This means the doctor sees the booking immediately in their queue and visit
 * history — no separate "convert appointment" step required.
 */
export const createAppointment = mutation({
  args: {
    doctorSlug: v.string(),
    patientName: v.string(),
    patientPhone: v.string(),
    patientAge: v.optional(v.number()),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.doctorSlug))
      .unique();
    if (!doctor || doctor.tier !== "premium")
      throw new Error("Doctor not found or not premium");

    // 1. Create appointment record
    const appointmentId = await ctx.db.insert("appointments", {
      doctorId: doctor._id,
      patientName: args.patientName,
      patientPhone: args.patientPhone,
      patientAge: args.patientAge,
      date: args.date,
      status: "pending",
      processedToQueue: false,
      createdAt: Date.now(),
    });

    // 2. Find existing patient by phone (for this doctor), or create new
    const allPatients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", doctor._id))
      .collect();

    let patientId = allPatients.find((p) => p.phone === args.patientPhone)?._id;

    if (!patientId) {
      patientId = await ctx.db.insert("patients", {
        doctorId: doctor._id,
        name: args.patientName,
        age: args.patientAge ?? 0,
        phone: args.patientPhone,
        chronicConditions: [],
        createdAt: Date.now(),
      });
    }

    // 3. Create the visit for the appointment date
    const visitId = await ctx.db.insert("visits", {
      patientId,
      doctorId: doctor._id,
      date: args.date,
      source: "appointment",
      appointmentId,
      createdAt: Date.now(),
    });

    // 4. Add to queue for the correct date (not necessarily today)
    const queueDate = startOfDay(args.date);

    // Get all queue entries for this doctor on that day
    const existingQueueForDate = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("queueDate", queueDate)
      )
      .collect();

    const active = existingQueueForDate.filter((q) => q.status !== "done");

    // Only add if patient isn't already in the queue for this date
    const alreadyQueued = active.find((q) => q.patientId === patientId);
    if (!alreadyQueued) {
      const maxPos = active.reduce((m, q) => Math.max(m, q.position), 0);

      // Cascade scheduled time
      let scheduledTime = args.date; // use the booked slot as default scheduled time
      const slotMin = doctor.slotDurationMinutes ?? 30;
      if (active.length > 0) {
        const lastItem = active.sort((a, b) => b.position - a.position)[0];
        if (lastItem.scheduledTime) {
          scheduledTime = lastItem.scheduledTime + slotMin * 60 * 1000;
        }
      }

      await ctx.db.insert("queue", {
        doctorId: doctor._id,
        patientId,
        queueDate,
        position: maxPos + 1,
        status: active.length === 0 ? "in-progress" : "waiting",
        addedAt: Date.now(),
        scheduledTime,
        reminderSent: false,
        appointmentId,
        visitId,
      });
    }

    // Mark appointment as processed
    await ctx.db.patch(appointmentId, { processedToQueue: true });

    return appointmentId;
  },
});

// ─── Doctor: list all their appointments ────────────────────────────────────

export const listAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];
    return await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(100);
  },
});

// ─── List upcoming appointments (today+) ────────────────────────────────────

export const listUpcomingAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];
    const now = Date.now();
    const all = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();
    return all
      .filter((a) => a.date >= now && a.status !== "cancelled")
      .sort((a, b) => a.date - b.date);
  },
});

// ─── Get available slots for a doctor on a given day (public) ───────────────

export const getAvailableSlots = query({
  args: { slug: v.string(), date: v.number() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor || doctor.tier !== "premium") return [];

    const dayStart = new Date(args.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(args.date);
    dayEnd.setHours(23, 59, 59, 999);

    const booked = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).gte("date", dayStart.getTime()).lte("date", dayEnd.getTime())
      )
      .collect();

    // Generate slots: 9am-5pm, every slotDurationMinutes (default 30)
    const slotMin = doctor.slotDurationMinutes ?? 30;
    const slots: number[] = [];
    const start = new Date(args.date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(args.date);
    end.setHours(17, 0, 0, 0);

    while (start < end) {
      if (!booked.find((b) => b.date === start.getTime() && b.status !== "cancelled")) {
        slots.push(start.getTime());
      }
      start.setMinutes(start.getMinutes() + slotMin);
    }
    return slots;
  },
});

// ─── Update appointment status ───────────────────────────────────────────────

export const updateAppointmentStatus = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("appointments"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.doctorId !== user._id) throw new Error("Not found");
    await ctx.db.patch(args.appointmentId, { status: args.status });
  },
});

// ─── Patient cancels by phone ────────────────────────────────────────────────

export const cancelAppointmentByPhone = mutation({
  args: {
    appointmentId: v.id("appointments"),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.patientPhone !== args.patientPhone)
      throw new Error("Not found");
    await ctx.db.patch(args.appointmentId, { status: "cancelled", whatsappConfirmed: false });
  },
});
