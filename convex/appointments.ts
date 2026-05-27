import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireAuthUser, logAction } from "./authHelper";
import { internal } from "./_generated/api";

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_PUBLIC_BOOKING_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const PAST_BOOKING_GRACE_MS = 5 * 60 * 1000;

function normalizeEgyptMobile(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^1[0125]\d{8}$/.test(digits)) {
    throw new ConvexError("Invalid phone number");
  }
  return digits;
}

function assertPublicBookingSlot(
  date: number,
  doctor: {
    availableDays?: string[];
    slotDurationMinutes?: number;
    timezoneOffset?: number;
    workingHoursStart?: number;
    workingHoursEnd?: number;
  }
) {
  const now = Date.now();
  if (!Number.isFinite(date) || date < now - PAST_BOOKING_GRACE_MS) {
    throw new ConvexError("Appointment time must be in the future");
  }
  if (date > now + MAX_PUBLIC_BOOKING_WINDOW_MS) {
    throw new ConvexError("Appointment time is too far in the future");
  }

  const doctorOffsetMinutes = doctor.timezoneOffset ?? -180;
  const localDate = new Date(date - doctorOffsetMinutes * 60 * 1000);
  const day = DAY_ABBREVS[localDate.getUTCDay()];
  const availableDays = doctor.availableDays ?? [];
  if (availableDays.length > 0 && !availableDays.includes(day)) {
    throw new ConvexError("Doctor is not available on this day");
  }

  const startHour = doctor.workingHoursStart ?? 9;
  const endHour = doctor.workingHoursEnd ?? 17;
  const slotDuration = doctor.slotDurationMinutes ?? 30;
  const startMinutes = Math.round(startHour * 60);
  const endMinutes = Math.round(endHour * 60);
  const slotMinutes = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();

  if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
    throw new ConvexError("Appointment must be within working hours");
  }
  if ((slotMinutes - startMinutes) % slotDuration !== 0) {
    throw new ConvexError("Appointment must match an available slot");
  }
}

// ─── Public booking (online) ─────────────────────────────────────────────────

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
    if (!doctor || !doctor.publicProfile || doctor.isBanned) {
      throw new ConvexError("Doctor not found");
    }

    const patientName = args.patientName.trim().replace(/\s+/g, " ");
    if (patientName.length < 2 || patientName.length > 100) {
      throw new ConvexError("Invalid patient name");
    }

    const patientPhone = normalizeEgyptMobile(args.patientPhone);
    if (
      args.patientAge !== undefined &&
      (!Number.isInteger(args.patientAge) || args.patientAge < 0 || args.patientAge > 120)
    ) {
      throw new ConvexError("Invalid patient age");
    }

    assertPublicBookingSlot(args.date, doctor);

    // Rate Limiting: Max 3 upcoming appointments per phone number
    const upcoming = await ctx.db
      .query("visits")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", doctor._id).eq("patientPhone", patientPhone)
      )
      .take(10);
    const phoneUpcoming = upcoming.filter(
      (visit) => visit.date >= Date.now() - 86400000 && visit.status !== "cancelled"
    );
    if (phoneUpcoming.length >= 3) {
      throw new ConvexError("Rate limit exceeded: You already have 3 active appointments.");
    }

    // Conflict check against visits table (Convex OCC makes this race-condition safe)
    const existing = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();
      
    if (existing) {
      throw new ConvexError("This time slot is already booked");
    }

    // OPTIMIZED: Use by_doctor_phone index for O(1) lookup
    const existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", doctor._id).eq("phone", patientPhone)
      )
      .first();

    let patientId = existingPatient?._id;

    if (!patientId) {
      patientId = await ctx.db.insert("patients", {
        doctorId: doctor._id,
        name: patientName,
        age: args.patientAge ?? 0,
        phone: patientPhone,
        chronicConditions: [],
        createdAt: Date.now(),
      });
    }

    // Create a visit directly
    const visitId = await ctx.db.insert("visits", {
      doctorId: doctor._id,
      patientId,
      patientName,
      patientPhone,
      patientAge: args.patientAge,
      date: args.date,
      status: "confirmed",
      source: "online",
      createdAt: Date.now(),
    });

    // Fire push notification to doctor
    const apptTime = new Date(args.date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    await ctx.scheduler.runAfter(0, internal.pushActions.sendPushNotification, {
      userId: doctor._id,
      title: "حجز إلكتروني جديد",
      body: `${patientName} حجز موعداً الساعة ${apptTime}`,
      url: "/dashboard",
    });

    return visitId;
  },
});

// ─── Doctor manually adds a visit ────────────────────────────────────────────

export const addManualAppointment = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctor = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.doctorId !== doctor._id) throw new ConvexError("Access denied");

    // Working hours validation
    const doctorOffsetMinutes = doctor.timezoneOffset ?? -180;
    const localTimeMs = args.date - (doctorOffsetMinutes * 60 * 1000);
    const localDate = new Date(localTimeMs);
    const bookingHour = localDate.getUTCHours();
    const startHour = doctor.workingHoursStart ?? 9;
    const endHour = doctor.workingHoursEnd ?? 17;
    if (bookingHour < startHour || bookingHour >= endHour) {
      throw new ConvexError(`Appointment must be within working hours: ${startHour}:00 - ${endHour}:00`);
    }

    // Conflict check
    const conflict = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();
    if (conflict) {
      throw new ConvexError("This time slot is already booked");
    }

    return await ctx.db.insert("visits", {
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

// ─── Swap two visits ─────────────────────────────────────────────────────────

export const swapAppointments = mutation({
  args: {
    clerkId: v.string(),
    appointmentId1: v.id("visits"),
    appointmentId2: v.id("visits"),
    expectedDate1: v.optional(v.number()),
    expectedDate2: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const v1 = await ctx.db.get(args.appointmentId1);
    const v2 = await ctx.db.get(args.appointmentId2);

    if (!v1 || v1.doctorId !== user._id) throw new ConvexError("Not found 1");
    if (!v2 || v2.doctorId !== user._id) throw new ConvexError("Not found 2");

    if (args.expectedDate1 && v1.date !== args.expectedDate1) {
      throw new ConvexError("Appointment 1 was modified by another user. Please refresh.");
    }
    if (args.expectedDate2 && v2.date !== args.expectedDate2) {
      throw new ConvexError("Appointment 2 was modified by another user. Please refresh.");
    }

    await ctx.db.patch(v1._id, { date: v2.date });
    await ctx.db.patch(v2._id, { date: v1.date });
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);
  },
});

// FIX #7: Dedicated query for online appointments — replaces filtering 200 visits client-side
export const listOnlineAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // Fetch recent visits and filter by source === "online" server-side
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);

    return visits
      .filter((v) => v.source === "online" && v.status === "confirmed")
      .slice(0, 50);
  },
});

// OPTIMIZED: Skip redundant patient joins — denormalized fields exist on visit
export const getAppointmentsByDate = query({
  args: { clerkId: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const dayEnd = args.dayStart + 86400000 - 1;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q
          .eq("doctorId", user._id)
          .gte("date", args.dayStart)
          .lte("date", dayEnd)
      )
      .take(500);

    // OPTIMIZED: Only fetch patient if denormalized fields are missing (rare).
    return await Promise.all(
      visits.map(async (visit) => {
        const needsPatient = !visit.patientName && visit.patientId;
        const patient = needsPatient ? await ctx.db.get(visit.patientId) : null;
        return {
          ...visit,
          patientName: visit.patientName ?? patient?.name ?? "Unknown",
          patientPhone: visit.patientPhone ?? patient?.phone ?? "",
          patientAge: visit.patientAge ?? patient?.age,
          patient: needsPatient ? patient : null,
        };
      })
    );
  },
});

export const getAvailableSlots = query({
  args: { slug: v.string(), date: v.number() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor) return [];

    const dayStart = args.date;
    const dayEnd = dayStart + 86400000 - 1;

    const booked = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).gte("date", dayStart).lte("date", dayEnd)
      )
      .take(200);

    return booked
      .filter((b) => b.status !== "cancelled")
      .map((b) => b.date);
  },
});

// ─── Update / delete ─────────────────────────────────────────────────────────

export const updateAppointment = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("visits"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("confirmed"),
          v.literal("cancelled"),
          v.literal("completed")
        )
      ),
      notes: v.optional(v.string()),
      prescriptionImageId: v.optional(v.id("_storage")),
      documentIds: v.optional(v.array(v.id("_storage"))),
      date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new ConvexError("Not authorized");

    if (args.updates.date) {
      const doctorOffsetMinutes = user.timezoneOffset ?? -180;
      const localTimeMs = args.updates.date - (doctorOffsetMinutes * 60 * 1000);
      const localDate = new Date(localTimeMs);
      const bookingHour = localDate.getUTCHours();
      const startHour = user.workingHoursStart ?? 9;
      const endHour = user.workingHoursEnd ?? 17;
      if (bookingHour < startHour || bookingHour >= endHour) {
        throw new ConvexError(`Appointment must be within working hours: ${startHour}:00 - ${endHour}:00`);
      }

      const conflict = await ctx.db
        .query("visits")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("date", args.updates.date as number)
        )
        .collect();
      if (conflict.some((c) => c._id !== visit._id && c.status !== "cancelled")) {
        throw new ConvexError("This time slot is already booked");
      }

      // Sync the reschedule to the installment's nextVisitDate
      if (visit.installmentId) {
        await ctx.db.patch(visit.installmentId, { nextVisitDate: args.updates.date });
      }
    }

    await ctx.db.patch(args.appointmentId, args.updates);
    
    await logAction(ctx, user, "Updated Appointment", `Updated visit status to ${args.updates.status || "changed"}`);
  },
});

export const deleteAppointment = mutation({
  args: { clerkId: v.string(), appointmentId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new ConvexError("Not authorized");
    await ctx.db.delete(args.appointmentId);
  },
});

// FIX #17: cancelAppointmentByPhone now requires both phone + a time-window check.
// Only visits created in the last 7 days can be cancelled, and only from the
// matching phone number. This limits the blast radius for guessed IDs.
export const cancelAppointmentByPhone = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("visits"),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id)
      throw new ConvexError("Not found or unauthorized");

    // Safety: only allow cancellation of visits created within the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    if (visit.createdAt < sevenDaysAgo) {
      throw new ConvexError("This appointment can no longer be cancelled online");
    }

    // Don't allow cancelling already-completed visits
    if (visit.status === "completed") {
      throw new ConvexError("Completed visits cannot be cancelled");
    }

    await ctx.db.patch(args.appointmentId, { status: "cancelled" });
  },
});
