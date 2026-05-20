import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextVisitDate(
  startDate: number,
  frequency: string,
  customIntervalDays?: number
): number {
  const now = Date.now();
  let interval: number;

  switch (frequency) {
    case "daily":
      interval = 86400000;
      break;
    case "weekly":
      interval = 7 * 86400000;
      break;
    case "bi-weekly":
      interval = 14 * 86400000;
      break;
    case "monthly":
      interval = 30 * 86400000;
      break;
    case "custom":
      interval = (customIntervalDays ?? 7) * 86400000;
      break;
    default:
      interval = 7 * 86400000;
  }

  let next = startDate;
  while (next <= now) {
    next += interval;
  }
  return next;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listContracts = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);

    return await Promise.all(
      contracts.map(async (c) => {
        const fileUrl = c.contractFileId
          ? await ctx.storage.getUrl(c.contractFileId)
          : null;
        const completed = c.completedVisits ?? 0;
        const total = c.numVisits ?? 0;
        const visitsLeft = Math.max(0, total - completed);
        const costPerVisit = c.costPerVisit ?? 0;
        const remainingBalance = (c.totalAmount ?? 0) - ((c.downPayment ?? 0) + (c.paidVisits ?? 0) * costPerVisit);
        return { ...c, fileUrl, visitsLeft, remainingBalance: Math.max(0, remainingBalance) };
      })
    );
  },
});

export const getContract = query({
  args: { clerkId: v.string(), contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id) return null;

    const fileUrl = contract.contractFileId
      ? await ctx.storage.getUrl(contract.contractFileId)
      : null;

    return { ...contract, fileUrl };
  },
});

export const listContractsByPatient = query({
  args: { clerkId: v.string(), patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const contracts = await ctx.db
      .query("contracts")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .take(50);

    return contracts.filter((c) => c.doctorId === user._id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const createContract = mutation({
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
    contractFileId: v.optional(v.id("_storage")),
    contractFileName: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Explicit visit schedule — each entry is a timestamp (date + time combined)
    visitSchedules: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.doctorId !== user._id)
      throw new Error("Patient not found");

    // ── Compute number of visits from financials ───────────────────────────
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

    // Use explicit schedules to determine end date — but don't override computed numVisits
    const schedules = args.visitSchedules ?? [];
    if (schedules.length > 0) {
      endDate = Math.max(...schedules);
      // Only override numVisits if we didn't compute it from financials
      if (numVisits === undefined) {
        numVisits = schedules.length;
      }
    }

    const status: "active" | "expired" = "active";

    const nextVisit = schedules.length > 0
      ? schedules.find((s) => s > Date.now()) ?? schedules[0]
      : undefined;

    const id = await ctx.db.insert("contracts", {
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
      contractFileId: args.contractFileId,
      contractFileName: args.contractFileName,
      notes: args.notes,
      createdAt: Date.now(),
    });

    // ── Create visits from explicit schedules ──────────────────────────────
    const createdAt = Date.now();
    const label = `Contract visit`;

    if (schedules.length > 0) {
      // FIX: Use Promise.all instead of sequential loop for visit creation
      await Promise.all(
        schedules.map((visitDate) =>
          ctx.db.insert("visits", {
            patientId: args.patientId,
            doctorId: user._id,
            patientName: patient.name,
            patientPhone: patient.phone,
            patientAge: patient.age,
            date: visitDate,
            source: "contract",
            status: "confirmed",
            contractId: id,
            reasonForVisit: label,
            createdAt,
          })
        )
      );
    }

    return id;
  },
});

export const updateContract = mutation({
  args: {
    clerkId: v.string(),
    contractId: v.id("contracts"),
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
      contractFileId: v.optional(v.id("_storage")),
      contractFileName: v.optional(v.string()),
      notes: v.optional(v.string()),
      nextVisitDate: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id)
      throw new Error("Not authorized");

    await ctx.db.patch(args.contractId, args.updates);
  },
});

// FIX #4: Use Promise.all() instead of sequential loop for visit deletion
export const deleteContract = mutation({
  args: { clerkId: v.string(), contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id)
      throw new Error("Not authorized");

    // Parallel deletion of all auto-generated visits for this contract
    const contractVisits = await ctx.db
      .query("visits")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .take(1000);

    await Promise.all(contractVisits.map((v) => ctx.db.delete(v._id)));

    await ctx.db.delete(args.contractId);
  },
});

export const updateContractDefaults = mutation({
  args: {
    clerkId: v.string(),
    contractDefaultDownPayment: v.optional(v.number()),
    contractDefaultDownPaymentType: v.optional(
      v.union(v.literal("fixed"), v.literal("percentage"))
    ),
    contractDefaultCostPerVisit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    // Explicitly pick allowed fields to prevent schema bypass
    const patch: any = {};
    if (args.contractDefaultDownPayment !== undefined) patch.contractDefaultDownPayment = args.contractDefaultDownPayment;
    if (args.contractDefaultDownPaymentType !== undefined) patch.contractDefaultDownPaymentType = args.contractDefaultDownPaymentType;
    if (args.contractDefaultCostPerVisit !== undefined) patch.contractDefaultCostPerVisit = args.contractDefaultCostPerVisit;
    await ctx.db.patch(user._id, patch);
  },
});

export const waiveUnpaidBalance = mutation({
  args: {
    clerkId: v.string(),
    contractId: v.id("contracts"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id) throw new Error("Contract not found");

    // Waive: zero out unpaid balance, treat all visits as paid
    const completedVisits = contract.completedVisits ?? 0;
    const wasClosed = completedVisits >= (contract.numVisits ?? 0);
    await ctx.db.patch(args.contractId, {
      unpaidBalance: 0,
      paidVisits: completedVisits,
      status: wasClosed ? "expired" : contract.status,
    });
  },
});

// ─── Complete a contract visit + schedule next one ────────────────────────────

export const completeContractVisit = mutation({
  args: {
    clerkId: v.string(),
    visitId: v.id("visits"),
    contractId: v.id("contracts"),
    isPaid: v.boolean(),
    notes: v.optional(v.string()),
    prescriptionImageId: v.optional(v.id("_storage")),
    documentIds: v.optional(v.array(v.id("_storage"))),
    // Next visit scheduling (client computes full timestamp)
    nextVisitDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.doctorId !== user._id) throw new Error("Visit not found");

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id) throw new Error("Contract not found");

    // Mark current visit completed
    await ctx.db.patch(args.visitId, {
      status: "completed",
      isPaid: args.isPaid,
      notes: args.notes,
      prescriptionImageId: args.prescriptionImageId,
      documentIds: args.documentIds,
    });

    // Update contract payment counters
    const costPerVisit = contract.costPerVisit ?? 0;
    const completedVisits = (contract.completedVisits ?? 0) + 1;
    const paidVisits = (contract.paidVisits ?? 0) + (args.isPaid ? 1 : 0);
    const unpaidBalance = (contract.unpaidBalance ?? 0) + (args.isPaid ? 0 : costPerVisit);
    const numVisits = contract.numVisits ?? 0;

    // Check if contract is done — all visits completed AND no unpaid balance
    const allVisitsDone = numVisits > 0 && completedVisits >= numVisits;
    const isContractDone = allVisitsDone && unpaidBalance === 0;

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
        source: "contract",
        status: "confirmed",
        contractId: args.contractId,
        reasonForVisit: "Contract visit",
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.contractId, {
      completedVisits,
      paidVisits,
      unpaidBalance,
      nextVisitDate: args.nextVisitDate ?? undefined,
      status: isContractDone ? "expired" : contract.status,
    });

    return { nextVisitId, isContractDone, unpaidBalance };
  },
});

// ─── Get contract visit stats ─────────────────────────────────────────────────

export const getContractStats = query({
  args: { clerkId: v.string(), contractId: v.id("contracts") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const contract = await ctx.db.get(args.contractId);
    if (!contract || contract.doctorId !== user._id) return null;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_contract", (q) => q.eq("contractId", args.contractId))
      .take(1000);

    const completed = visits.filter((v) => v.status === "completed").length;
    const paid = visits.filter((v) => v.status === "completed" && v.isPaid).length;
    const unpaid = visits.filter((v) => v.status === "completed" && !v.isPaid).length;
    const total = contract.numVisits ?? visits.length;
    const remaining = Math.max(0, total - completed);
    const costPerVisit = contract.costPerVisit ?? 0;

    return {
      total,
      completed,
      remaining,
      paid,
      unpaid,
      unpaidBalance: contract.unpaidBalance ?? unpaid * costPerVisit,
      costPerVisit,
      totalAmount: contract.totalAmount,
    };
  },
});
