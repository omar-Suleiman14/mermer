import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Public booking ──────────────────────────────────────────────────────────

/**
 * Patient-facing online booking.
 * Creates an appointment and immediately marks it confirmed.
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

    // Conflict check
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .collect();
    if (existing.some((a) => a.status !== "cancelled")) {
      throw new Error("This time slot is already booked");
    }

    // Find or create patient
    const allPatients = await ctx.db
      .query("patients")
      .withIndex("by_doctor", (q) => q.eq("doctorId", doctor._id))
      .take(500);

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

    const appointmentId = await ctx.db.insert("appointments", {
      doctorId: doctor._id,
      patientId,
      patientName: args.patientName,
      patientPhone: args.patientPhone,
      patientAge: args.patientAge,
      date: args.date,
      status: "confirmed",
      source: "online",
      createdAt: Date.now(),
    });

    return appointmentId;
  },
});

/**
 * Doctor manually schedules a patient from the dashboard.
 */
export const addManualAppointment = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!doctor) throw new Error("Doctor not found");

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Patient not found");

    // Conflict check (only for exact same timestamp)
    const conflict = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .collect();
    if (conflict.some((c) => c.status !== "cancelled")) {
      throw new Error("This time slot is already booked");
    }

    return await ctx.db.insert("appointments", {
      doctorId: doctor._id,
      patientId: args.patientId,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientAge: patient.age,
      date: args.date,
      status: "confirmed",
      source: "manual",
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const swapAppointments = mutation({
  args: {
    clerkId: v.string(),
    appointmentId1: v.id("appointments"),
    appointmentId2: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("Unauthorized");

    const appt1 = await ctx.db.get(args.appointmentId1);
    const appt2 = await ctx.db.get(args.appointmentId2);

    if (!appt1 || appt1.doctorId !== user._id) throw new Error("Not found 1");
    if (!appt2 || appt2.doctorId !== user._id) throw new Error("Not found 2");

    // Swap the dates
    await ctx.db.patch(appt1._id, { date: appt2.date });
    await ctx.db.patch(appt2._id, { date: appt1.date });
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

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
      .take(200);
  },
});

/**
 * Fetch appointments for a specific day.
 *
 * IMPORTANT: Pass `dayStart` as the client-computed midnight timestamp
 * (i.e. startOfDay(Date.now()) from the browser). This avoids server-side
 * timezone mismatches — the server uses the range [dayStart, dayStart + 24h)
 * directly without any local-time conversion.
 */
export const getAppointmentsByDate = query({
  args: { clerkId: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return [];

    const dayEnd = args.dayStart + 86400000 - 1; // 24 hours later minus 1ms

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q
          .eq("doctorId", user._id)
          .gte("date", args.dayStart)
          .lte("date", dayEnd)
      )
      .collect();

    // Populate patient records
    return await Promise.all(
      appointments.map(async (appt) => {
        const patient = appt.patientId ? await ctx.db.get(appt.patientId) : null;
        return { ...appt, patient };
      })
    );
  },
});

/**
 * Get booked slot timestamps for a day (for the public booking page).
 * Pass `date` as any timestamp within the desired day — the server uses
 * [dayStart, dayEnd] relative to midnight UTC of that timestamp.
 *
 * To avoid timezone issues the client should pass its local midnight.
 */
export const getAvailableSlots = query({
  args: { slug: v.string(), date: v.number() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor || doctor.tier !== "premium") return [];

    // Use the passed timestamp directly as dayStart (client sends local midnight)
    const dayStart = args.date;
    const dayEnd = dayStart + 86400000 - 1;

    const booked = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).gte("date", dayStart).lte("date", dayEnd)
      )
      .collect();

    return booked
      .filter((b) => b.status !== "cancelled")
      .map((b) => b.date);
  },
});

// ─── Update / delete ──────────────────────────────────────────────────────────

export const updateAppointment = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("appointments"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("pending"),
          v.literal("confirmed"),
          v.literal("cancelled"),
          v.literal("completed")
        )
      ),
      notes: v.optional(v.string()),
      prescriptionImageId: v.optional(v.id("_storage")),
      documentIds: v.optional(v.array(v.id("_storage"))),
      reminderSentAt: v.optional(v.number()),
      date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.doctorId !== user._id) throw new Error("Not authorized");

    if (args.updates.date) {
      const conflict = await ctx.db
        .query("appointments")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("date", args.updates.date as number)
        )
        .collect();
      if (conflict.some((c) => c._id !== appt._id && c.status !== "cancelled")) {
        throw new Error("This time slot is already booked");
      }
    }

    await ctx.db.patch(args.appointmentId, args.updates);
  },
});

export const deleteAppointment = mutation({
  args: { clerkId: v.string(), appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.doctorId !== user._id) throw new Error("Not authorized");
    await ctx.db.delete(args.appointmentId);
  },
});

export const cancelAppointmentByPhone = mutation({
  args: {
    appointmentId: v.id("appointments"),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const appt = await ctx.db.get(args.appointmentId);
    if (!appt || appt.patientPhone !== args.patientPhone)
      throw new Error("Not found");
    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      whatsappConfirmed: false,
    });
  },
});

// ─── Visit history (per patient) ─────────────────────────────────────────────
// "Visits" and "appointments" are the same data — appointments table is the
// single source of truth. These helpers surface appointment history in a
// visit-centric view (with linked patient record and resolved storage URLs).

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

    // All appointments for this patient, newest first
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(100);

    const forPatient = appointments.filter(
      (a) => a.patientId === args.patientId
    );

    return await Promise.all(
      forPatient.map(async (appt) => {
        const prescriptionImageUrl = appt.prescriptionImageId
          ? await ctx.storage.getUrl(appt.prescriptionImageId)
          : null;
        // Map appointment fields to visit-shaped response
        return {
          _id: appt._id,
          date: appt.date,
          source: appt.source === "online" ? "appointment" : "manual",
          status: appt.status,
          reasonForVisit: undefined as string | undefined,
          prescribedMedications: undefined as string[] | undefined,
          analysisRequested: undefined as string[] | undefined,
          notes: appt.notes,
          prescriptionImageUrl,
          prescriptionPdfUrl: null as string | null,
          documentUrls: [] as (string | null)[],
        };
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

    const now = Date.now();
    const todayStart = now - (now % 86400000); // rough UTC day start
    const weekStart = todayStart - 6 * 86400000;
    const monthStart = todayStart - 29 * 86400000;

    const all = await ctx.db
      .query("appointments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(500);

    const completed = all.filter((a) => a.status === "completed");
    return {
      today: completed.filter((a) => a.date >= todayStart).length,
      week: completed.filter((a) => a.date >= weekStart).length,
      month: completed.filter((a) => a.date >= monthStart).length,
    };
  },
});
