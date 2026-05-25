import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

export const getVisitsByPatient = query({
  args: { patientId: v.id("patients"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(500);

    // Resolve storage URLs
    return await Promise.all(
      visits.map(async (v) => {
        const prescriptionImageUrl = v.prescriptionImageId
          ? await ctx.storage.getUrl(v.prescriptionImageId)
          : null;
        const prescriptionPdfUrl = v.prescriptionPdfId
          ? await ctx.storage.getUrl(v.prescriptionPdfId)
          : null;
        const documentUrls = v.documentIds
          ? await Promise.all(
              v.documentIds.map((id) => ctx.storage.getUrl(id))
            )
          : [];
        return { ...v, prescriptionImageUrl, prescriptionPdfUrl, documentUrls };
      })
    );
  },
});

export const getRecentVisits = query({
  args: { clerkId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(args.limit ?? 5);

    // OPTIMIZED: Only fetch patient when denormalized name is missing
    return await Promise.all(
      visits.map(async (v) => {
        const needsPatient = !v.patientName && v.patientId;
        const patient = needsPatient ? await ctx.db.get(v.patientId) : null;
        return { ...v, patient };
      })
    );
  },
});

// OPTIMIZED: Uses by_doctor_date range query with client-passed timestamps
// instead of .collect() ALL visits + Date.now() inside query (which defeats cache).
export const getVisitStats = query({
  args: {
    clerkId: v.string(),
    todayStart: v.optional(v.number()),
    weekStart: v.optional(v.number()),
    monthStart: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return { today: 0, week: 0, month: 0 };

    // Use client-provided timestamps (fallback for backwards compat)
    const now = Date.now();
    const todayMs = now - (now % 86400000);
    const todayStart = args.todayStart ?? todayMs;
    const monthStart = args.monthStart ?? (todayMs - 29 * 86400000);
    const weekStart = args.weekStart ?? (todayMs - 6 * 86400000);

    // OPTIMIZED: Only read this month's visits using date range index
    const monthVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", monthStart)
      )
      .take(5000);

    return {
      today: monthVisits.filter((v) => v.date >= todayStart).length,
      week: monthVisits.filter((v) => v.date >= weekStart).length,
      month: monthVisits.length,
    };
  },
});

export const createVisit = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.optional(v.number()),
    source: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("online"),
        v.literal("installment"),
        v.literal("follow-up")
      )
    ),
    reasonForVisit: v.optional(v.string()),
    prescribedMedications: v.optional(v.array(v.string())),
    analysisRequested: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    // Denormalize patient info for display
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id) throw new Error("Patient not found");

    if (args.date) {
      const doctorOffsetMinutes = user.timezoneOffset ?? -180;
      const localTimeMs = args.date - (doctorOffsetMinutes * 60 * 1000);
      const localDate = new Date(localTimeMs);
      const bookingHour = localDate.getUTCHours();
      const startHour = user.workingHoursStart ?? 9;
      const endHour = user.workingHoursEnd ?? 17;
      if (bookingHour < startHour || bookingHour >= endHour) {
        throw new Error(`Appointment must be within working hours: ${startHour}:00 - ${endHour}:00`);
      }
    }

    return await ctx.db.insert("visits", {
      patientId: args.patientId,
      doctorId: user._id,
      date: args.date ?? Date.now(),
      source: args.source ?? "manual",
      status: "confirmed",
      patientName: patient.name,
      patientPhone: patient.phone,
      patientAge: patient.age,
      reasonForVisit: args.reasonForVisit,
      prescribedMedications: args.prescribedMedications,
      analysisRequested: args.analysisRequested,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const addVisitFiles = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
    prescriptionImageId: v.optional(v.id("_storage")),
    prescriptionPdfId: v.optional(v.id("_storage")),
    documentIds: v.optional(v.array(v.id("_storage"))),
    notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("confirmed"), v.literal("completed"), v.literal("cancelled"))),
    prescribedMedications: v.optional(
      v.array(
        v.union(
          v.string(),
          v.object({
            name: v.string(),
            frequency: v.optional(v.string()),
            notes: v.optional(v.string()),
          })
        )
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not found");

    const existingDocIds = visit.documentIds ?? [];
    const newDocIds = args.documentIds ?? [];

    await ctx.db.patch(args.visitId, {
      ...(args.prescriptionImageId ? { prescriptionImageId: args.prescriptionImageId } : {}),
      ...(args.prescriptionPdfId ? { prescriptionPdfId: args.prescriptionPdfId } : {}),
      documentIds: [...existingDocIds, ...newDocIds],
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      ...(args.status !== undefined ? { status: args.status } : {}),
      ...(args.prescribedMedications !== undefined ? { prescribedMedications: args.prescribedMedications } : {}),
    });
  },
});

// FIX #25: Add .take(200) safety cap + server-side date range clamp (max 1 day)
export const getVisitsByDateRange = query({
  args: {
    clerkId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // Server-side clamp: max 1 day range to prevent unbounded reads
    const clampedEnd = Math.min(args.endDate, args.startDate + 86400000);

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", args.startDate).lte("date", clampedEnd)
      )
      .take(200);

    return visits.map((v) => ({
      _id: v._id,
      date: v.date,
      patientId: v.patientId,
      reasonForVisit: v.reasonForVisit,
      status: v.status,
    }));
  },
});

export const deleteVisit = mutation({
  args: { clerkId: v.string(), visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not found");
    
    if (visit.installmentId) {
      const installment = await ctx.db.get(visit.installmentId);
      if (installment && visit.status === "completed") {
        const costPerVisit = installment.costPerVisit ?? 0;
        await ctx.db.patch(installment._id, {
          completedVisits: Math.max(0, (installment.completedVisits ?? 0) - 1),
          paidVisits: visit.isPaid ? Math.max(0, (installment.paidVisits ?? 0) - 1) : installment.paidVisits,
          unpaidBalance: !visit.isPaid ? Math.max(0, (installment.unpaidBalance ?? 0) - costPerVisit) : installment.unpaidBalance,
        });
      }
    }
    
    await ctx.db.delete(args.visitId);
  },
});

export const updateVisit = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
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
      date: v.optional(v.number()),
      isPaid: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Not authorized");

    const patch: Record<string, any> = {};
    if (args.updates.status) patch.status = args.updates.status;
    if (args.updates.notes) patch.notes = args.updates.notes;
    if (args.updates.prescriptionImageId) patch.prescriptionImageId = args.updates.prescriptionImageId;
    if (args.updates.date) {
      const doctorOffsetMinutes = user.timezoneOffset ?? -180;
      const localTimeMs = args.updates.date - (doctorOffsetMinutes * 60 * 1000);
      const localDate = new Date(localTimeMs);
      const bookingHour = localDate.getUTCHours();
      const startHour = user.workingHoursStart ?? 9;
      const endHour = user.workingHoursEnd ?? 17;
      if (bookingHour < startHour || bookingHour >= endHour) {
        throw new Error(`Appointment must be within working hours`);
      }
      patch.date = args.updates.date;
    }

    if (args.updates.isPaid !== undefined) {
      patch.isPaid = args.updates.isPaid;
    }

    // Handle installment balance updates if isPaid changed
    if (visit.installmentId && visit.status === "completed" && args.updates.isPaid !== undefined && args.updates.isPaid !== visit.isPaid) {
      const installment = await ctx.db.get(visit.installmentId);
      if (installment) {
        const costPerVisit = installment.costPerVisit ?? 0;
        const paidVisitsDelta = args.updates.isPaid ? 1 : -1;
        const unpaidBalanceDelta = args.updates.isPaid ? -costPerVisit : costPerVisit;
        
        await ctx.db.patch(installment._id, {
          paidVisits: Math.max(0, (installment.paidVisits ?? 0) + paidVisitsDelta),
          unpaidBalance: Math.max(0, (installment.unpaidBalance ?? 0) + unpaidBalanceDelta),
        });
      }
    }

    await ctx.db.patch(args.visitId, patch);
  },
});

// FIX #20: bulkRescheduleVisits — add conflict detection + use Promise.all
export const getActivityLog = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(args.limit ?? 500);

    return visits.map((v) => ({
      _id: v._id,
      date: v.date,
      createdAt: v.createdAt,
      patientId: v.patientId,
      patientName: v.patientName ?? "Unknown",
      source: v.source ?? "manual",
      status: v.status ?? "confirmed",
      reasonForVisit: v.reasonForVisit,
    }));
  },
});

export const bulkRescheduleVisits = mutation({
  args: {
    clerkId: v.string(),
    updates: v.array(
      v.object({
        visitId: v.id("visits"),
        newDate: v.number(),
      })
    ),
    skipHoursValidation: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    // Parallel reschedule with conflict checks
    await Promise.all(
      args.updates.map(async (update) => {
        const visit = await ctx.db.get(update.visitId);
        if (!visit || visit.doctorId !== user._id) return;

        // Working hours validation (skip when called from settings change)
        if (!args.skipHoursValidation) {
          const doctorOffsetMinutes = user.timezoneOffset ?? -180;
          const localTimeMs = update.newDate - (doctorOffsetMinutes * 60 * 1000);
          const localDate = new Date(localTimeMs);
          const bookingHour = localDate.getUTCHours();
          const startHour = user.workingHoursStart ?? 9;
          const endHour = user.workingHoursEnd ?? 17;
          if (bookingHour < startHour || bookingHour >= endHour) {
            throw new Error(`Rescheduled time must be within working hours: ${startHour}:00 - ${endHour}:00`);
          }
        }

        // Conflict check — same pattern as updateAppointment
        const conflict = await ctx.db
          .query("visits")
          .withIndex("by_doctor_date", (q) =>
            q.eq("doctorId", user._id).eq("date", update.newDate)
          )
          .first();

        if (conflict && conflict._id !== visit._id && conflict.status !== "cancelled") {
          throw new Error(`Slot conflict at ${new Date(update.newDate).toISOString()}`);
        }

        await ctx.db.patch(update.visitId, { date: update.newDate });
      })
    );
  },
});

export const getVisit = query({
  args: { clerkId: v.string(), visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) return null;

    const doctor = await ctx.db.get(user._id);
    const patient = await ctx.db.get(visit.patientId);

    // Get follow-up if exists
    const followUps = await ctx.db
      .query("followUps")
      .withIndex("by_visit", (q) => q.eq("visitId", visit._id))
      .collect();

    return {
      visit,
      doctor: {
        name: doctor?.name,
        specialty: doctor?.specialty,
        clinicName: doctor?.clinicName,
        phone: doctor?.phone,
        clinicAddress: doctor?.clinicAddress,
      },
      patient: {
        name: patient?.name,
        age: patient?.age,
      },
      followUp: followUps.length > 0 ? followUps[0] : null,
    };
  },
});
