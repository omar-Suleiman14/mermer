import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    if (!doctor) throw new Error("Doctor not found");

    // Conflict check against visits table
    const existing = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .collect();
    if (existing.some((v) => v.status !== "cancelled")) {
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

    // Create a visit directly
    const visitId = await ctx.db.insert("visits", {
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
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!doctor) throw new Error("Doctor not found");

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new Error("Patient not found");

    // Conflict check
    const conflict = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .collect();
    if (conflict.some((c) => c.status !== "cancelled")) {
      throw new Error("This time slot is already booked");
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
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("Unauthorized");

    const v1 = await ctx.db.get(args.appointmentId1);
    const v2 = await ctx.db.get(args.appointmentId2);

    if (!v1 || v1.doctorId !== user._id) throw new Error("Not found 1");
    if (!v2 || v2.doctorId !== user._id) throw new Error("Not found 2");

    await ctx.db.patch(v1._id, { date: v2.date });
    await ctx.db.patch(v2._id, { date: v1.date });
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
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);
  },
});

export const getAppointmentsByDate = query({
  args: { clerkId: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
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
      .collect();

    // Populate patient records
    return await Promise.all(
      visits.map(async (visit) => {
        const patient = visit.patientId ? await ctx.db.get(visit.patientId) : null;
        return {
          ...visit,
          patientName: visit.patientName ?? patient?.name ?? "Unknown",
          patientPhone: visit.patientPhone ?? patient?.phone ?? "",
          patientAge: visit.patientAge ?? patient?.age,
          patient,
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
      .collect();

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

    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not authorized");

    if (args.updates.date) {
      const conflict = await ctx.db
        .query("visits")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("date", args.updates.date as number)
        )
        .collect();
      if (conflict.some((c) => c._id !== visit._id && c.status !== "cancelled")) {
        throw new Error("This time slot is already booked");
      }
    }

    await ctx.db.patch(args.appointmentId, args.updates);
  },
});

export const deleteAppointment = mutation({
  args: { clerkId: v.string(), appointmentId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not authorized");
    await ctx.db.delete(args.appointmentId);
  },
});

export const cancelAppointmentByPhone = mutation({
  args: {
    appointmentId: v.id("visits"),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.patientPhone !== args.patientPhone)
      throw new Error("Not found");
    await ctx.db.patch(args.appointmentId, { status: "cancelled" });
  },
});

// ─── Visit history (per patient) ─────────────────────────────────────────────

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

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(500);

    return await Promise.all(
      visits.map(async (v) => {
        const prescriptionImageUrl = v.prescriptionImageId
          ? await ctx.storage.getUrl(v.prescriptionImageId)
          : null;
        const prescriptionPdfUrl = v.prescriptionPdfId
          ? await ctx.storage.getUrl(v.prescriptionPdfId)
          : null;
        const documentUrls = v.documentIds
          ? await Promise.all(v.documentIds.map((id) => ctx.storage.getUrl(id)))
          : [];
        return {
          _id: v._id as string,
          date: v.date,
          source: v.source ?? "manual",
          status: v.status ?? "confirmed",
          reasonForVisit: v.reasonForVisit,
          prescribedMedications: v.prescribedMedications,
          analysisRequested: v.analysisRequested,
          notes: v.notes,
          prescriptionImageUrl,
          prescriptionPdfUrl,
          documentUrls,
          contractId: v.contractId as string | undefined,
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
    const todayStart = now - (now % 86400000);
    const weekStart = todayStart - 6 * 86400000;
    const monthStart = todayStart - 29 * 86400000;

    const all = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(500);

    const completed = all.filter((v) => v.status === "completed");
    return {
      today: completed.filter((v) => v.date >= todayStart).length,
      week: completed.filter((v) => v.date >= weekStart).length,
      month: completed.filter((v) => v.date >= monthStart).length,
    };
  },
});
