import { mutation, query, action, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";
import { internal } from "./_generated/api";
import { msgInstallmentCreated, calcSlotNumber } from "./messageHelpers";

// ─── Helpers ─────────────────────────────────────────────────────────────────



// ─── Queries ─────────────────────────────────────────────────────────────────

export const listinstallments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const installments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);

    return await Promise.all(
      installments.map(async (c) => {
        const fileUrl = c.installmentFileId
          ? await ctx.storage.getUrl(c.installmentFileId)
          : null;
        const completed = c.completedVisits ?? 0;
        const total = c.numVisits ?? 0;
        const visitsLeft = Math.max(0, total - completed);
        const costPerVisit = c.costPerVisit ?? 0;
        const remainingBalance = (c.totalAmount ?? 0) - ((c.downPayment ?? 0) + (c.paidVisits ?? 0) * costPerVisit);
        
        let nextVisitId: string | undefined;
        if (c.nextVisitDate) {
          const upcomingVisits = await ctx.db
            .query("visits")
            .withIndex("by_installment", (q) => q.eq("installmentId", c._id))
            .collect();
          const nextVisit = upcomingVisits.find(v => v.date === c.nextVisitDate && v.status !== "cancelled" && v.status !== "completed");
          if (nextVisit) nextVisitId = nextVisit._id;
        }

        return { ...c, fileUrl, visitsLeft, remainingBalance: Math.max(0, remainingBalance), nextVisitId };
      })
    );
  },
});

export const getinstallment = query({
  args: { clerkId: v.string(), installmentId: v.id("installments") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id) return null;

    const fileUrl = installment.installmentFileId
      ? await ctx.storage.getUrl(installment.installmentFileId)
      : null;

    return { ...installment, fileUrl };
  },
});

export const listinstallmentsByPatient = query({
  args: { clerkId: v.string(), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const installments = await ctx.db
      .query("installments")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(50);

    return installments.filter((c) => c.doctorId === user._id);
  },
});

export const listPastDueinstallments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const installments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(500);

    return installments.filter((c) => (c.unpaidBalance ?? 0) > 0 && c.status === "active");
  },
});


// ─── Mutations ────────────────────────────────────────────────────────────────

export const createinstallment = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    totalAmount: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    downPaymentType: v.optional(v.union(v.literal("fixed"), v.literal("percentage"))),
    costPerVisit: v.optional(v.number()),
    visitFrequency: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("bi-weekly"),
      v.literal("monthly"),
      v.literal("custom"),
      v.literal("manual")
    )),
    customIntervalDays: v.optional(v.number()),
    startDate: v.number(),
    installmentFileId: v.optional(v.id("_storage")),
    installmentFileName: v.optional(v.string()),
    notes: v.optional(v.string()),
    visitSchedules: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id)
      throw new ConvexError("Patient not found");

    let numVisits: number | undefined;
    let endDate: number | undefined;

    if (args.totalAmount && args.costPerVisit && args.costPerVisit > 0) {
      const effectiveDown = args.downPayment
        ? args.downPaymentType === "percentage"
          ? args.totalAmount * (args.downPayment / 100)
          : args.downPayment
        : 0;
      const remaining = Math.max(0, args.totalAmount - effectiveDown);
      numVisits = Math.ceil(remaining / args.costPerVisit);
    }

    const schedules = args.visitSchedules ?? [];
    if (schedules.length > 0) {
      endDate = Math.max(...schedules);
      if (numVisits === undefined) {
        numVisits = schedules.length;
      }
    }

    const status: "active" | "expired" = "active";

    const nextVisit = schedules.length > 0
      ? schedules.find((s) => s > Date.now()) ?? schedules[0]
      : undefined;

    const id = await ctx.db.insert("installments", {
      doctorId: user._id,
      patientId: args.patientId,
      patientName: patient.name,
      status,
      totalAmount: args.totalAmount,
      downPayment: args.downPayment,
      downPaymentType: args.downPaymentType,
      costPerVisit: args.costPerVisit,
      numVisits,
      visitFrequency: args.visitFrequency ?? "manual",
      customIntervalDays: args.customIntervalDays,
      startDate: args.startDate,
      endDate,
      nextVisitDate: nextVisit,
      installmentFileId: args.installmentFileId,
      installmentFileName: args.installmentFileName,
      notes: args.notes,
      createdAt: Date.now(),
    });

    const createdAt = Date.now();
    const label = `installment visit`;

    if (schedules.length > 0) {
      await Promise.all(
        schedules.map((visitDate) =>
          ctx.db.insert("visits", {
            patientId: args.patientId,
            doctorId: user._id,
            patientName: patient.name,
            patientPhone: patient.phone,
            patientAge: patient.age,
            date: visitDate,
            source: "installment",
            status: "confirmed",
            installmentId: id,
            reasonForVisit: label,
            createdAt,
          })
        )
      );
    }

    // Build WhatsApp payload if the doctor has Evolution connected
    let whatsappPayload = undefined;
    if (patient.phone && user.evolutionInstanceName && user.evolutionApiKey) {
      const firstVisitDate = schedules.length > 0
        ? Math.min(...schedules)
        : args.startDate;
      const slotNum = calcSlotNumber(firstVisitDate, user.workingHoursStart ?? 9, user.slotDurationMinutes ?? 30);
      const messageText = msgInstallmentCreated({
        patientName: patient.name,
        clinicName: user.clinicName || "العيادة",
        doctorName: user.name,
        firstDate: firstVisitDate,
        totalSessions: numVisits,
        slotNumber: slotNum,
      });
      const payload = {
        instanceName: user.evolutionInstanceName,
        evolutionApiKey: user.evolutionApiKey,
        phoneNumber: patient.phone,
        messageText,
      };
      if (payload) {
        await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, payload);
      }
    }

    return { id };
  },
});


export const updateinstallment = mutation({
  args: {
    clerkId: v.string(),
    installmentId: v.id("installments"),
    updates: v.object({
      status: v.optional(
        v.union(v.literal("active"), v.literal("expired"))
      ),
      totalAmount: v.optional(v.number()),
      downPayment: v.optional(v.number()),
      downPaymentType: v.optional(
        v.union(v.literal("fixed"), v.literal("percentage"))
      ),
      visitFrequency: v.optional(v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly"),
        v.literal("custom"),
        v.literal("manual")
      )),
      customIntervalDays: v.optional(v.number()),
      durationDays: v.optional(v.number()),
      installmentFileId: v.optional(v.id("_storage")),
      installmentFileName: v.optional(v.string()),
      notes: v.optional(v.string()),
      nextVisitDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id)
      throw new ConvexError("Not authorized");

    await ctx.db.patch(args.installmentId, args.updates);
  },
});

// FIX #4: Use Promise.all() instead of sequential loop for visit deletion
export const deleteinstallment = mutation({
  args: { clerkId: v.string(), installmentId: v.id("installments") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id)
      throw new ConvexError("Not authorized");

    // Parallel deletion of all auto-generated visits for this installment
    const installmentVisits = await ctx.db
      .query("visits")
      .withIndex("by_installment", (q) => q.eq("installmentId", args.installmentId))
      .take(1000);

    await Promise.all(installmentVisits.map((v) => ctx.db.delete(v._id)));

    await ctx.db.delete(args.installmentId);
  },
});

export const updateinstallmentDefaults = mutation({
  args: {
    clerkId: v.string(),
    installmentDefaultDownPayment: v.optional(v.number()),
    installmentDefaultDownPaymentType: v.optional(
      v.union(v.literal("fixed"), v.literal("percentage"))
    ),
    installmentDefaultCostPerVisit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    // Explicitly pick allowed fields to prevent schema bypass
    const patch: Record<string, unknown> = {};
    if (args.installmentDefaultDownPayment !== undefined) patch.installmentDefaultDownPayment = args.installmentDefaultDownPayment;
    if (args.installmentDefaultDownPaymentType !== undefined) patch.installmentDefaultDownPaymentType = args.installmentDefaultDownPaymentType;
    if (args.installmentDefaultCostPerVisit !== undefined) patch.installmentDefaultCostPerVisit = args.installmentDefaultCostPerVisit;
    await ctx.db.patch(user._id, patch);
  },
});

export const waiveUnpaidBalance = mutation({
  args: {
    clerkId: v.string(),
    installmentId: v.id("installments"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id) throw new ConvexError("installment not found");

    // Waive: zero out unpaid balance, treat all visits as paid
    const completedVisits = installment.completedVisits ?? 0;
    const wasClosed = completedVisits >= (installment.numVisits ?? 0);
    await ctx.db.patch(args.installmentId, {
      unpaidBalance: 0,
      paidVisits: completedVisits,
      status: wasClosed ? "expired" : installment.status,
    });
  },
});

// ─── Complete a installment visit + schedule next one ────────────────────────────

export const completeinstallmentVisit = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
    installmentId: v.id("installments"),
    isPaid: v.boolean(),
    notes: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    measurements: v.optional(v.string()),
    vitals: v.optional(v.string()),
    prescriptionImageId: v.optional(v.id("_storage")),
    documentIds: v.optional(v.array(v.id("_storage"))),
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
    // Next visit scheduling (client computes full timestamp)
    nextVisitDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new ConvexError("Visit not found");

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id) throw new ConvexError("installment not found");

    // Mark current visit completed
    await ctx.db.patch(args.visitId, {
      status: "completed",
      isPaid: args.isPaid,
      notes: args.notes,
      diagnosis: args.diagnosis,
      measurements: args.measurements,
      vitals: args.vitals,
      prescriptionImageId: args.prescriptionImageId,
      documentIds: args.documentIds,
      prescribedMedications: args.prescribedMedications,
    });

    // Update installment payment counters
    const costPerVisit = installment.costPerVisit ?? 0;
    const completedVisits = (installment.completedVisits ?? 0) + 1;
    const paidVisits = (installment.paidVisits ?? 0) + (args.isPaid ? 1 : 0);
    const unpaidBalance = (installment.unpaidBalance ?? 0) + (args.isPaid ? 0 : costPerVisit);
    const numVisits = installment.numVisits ?? 0;

    // Check if installment is done — all visits completed AND no unpaid balance
    const allVisitsDone = numVisits > 0 && completedVisits >= numVisits;
    const isinstallmentDone = allVisitsDone && unpaidBalance === 0;

    // Schedule next visit if provided and there are remaining visits
    let nextVisitId: string | undefined;
    if (args.nextVisitDate && !allVisitsDone) {
      const patient = await ctx.db.get(visit.patientId);
      nextVisitId = await ctx.db.insert("visits", {
        patientId: visit.patientId,
        doctorId: user._id,
        patientName: visit.patientName ?? patient?.name,
        patientPhone: visit.patientPhone ?? patient?.phone,
        patientAge: visit.patientAge ?? patient?.age,
        date: args.nextVisitDate,
        source: "installment",
        status: "confirmed",
        installmentId: args.installmentId,
        reasonForVisit: "installment visit",
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.installmentId, {
      completedVisits,
      paidVisits,
      unpaidBalance,
      nextVisitDate: args.nextVisitDate ?? undefined,
      status: isinstallmentDone ? "expired" : installment.status,
    });

    return { nextVisitId, isinstallmentDone, unpaidBalance };
  },
});

// ─── Get installment visit stats ─────────────────────────────────────────────────

export const getinstallmentstats = query({
  args: { clerkId: v.string(), installmentId: v.id("installments") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const installment = await ctx.db.get(args.installmentId);
    if (!installment || installment.doctorId !== user._id) return null;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_installment", (q) => q.eq("installmentId", args.installmentId))
      .take(1000);

    const completed = visits.filter((v) => v.status === "completed").length;
    const paid = visits.filter((v) => v.status === "completed" && v.isPaid).length;
    const unpaid = visits.filter((v) => v.status === "completed" && !v.isPaid).length;
    const total = installment.numVisits ?? visits.length;
    const remaining = Math.max(0, total - completed);
    const costPerVisit = installment.costPerVisit ?? 0;

    return {
      total,
      completed,
      remaining,
      paid,
      unpaid,
      unpaidBalance: installment.unpaidBalance ?? unpaid * costPerVisit,
      costPerVisit,
      totalAmount: installment.totalAmount,
    };
  },
});
