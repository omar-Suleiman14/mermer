/**
 * Offline Sync — Convex backend support for the offline-first architecture.
 *
 * Provides:
 * 1. Idempotency key tracking to prevent duplicate operations during sync
 * 2. getChangesSince query for incremental data hydration
 * 3. Utility to check/store processed idempotency keys
 */

import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// ─── Idempotency Helper ────────────────────────────────────────────────────
//
// We use a lightweight approach: the client sends an `_idempotencyKey` with
// each mutation. We don't need a separate table — we check for duplicates
// using domain-specific logic (e.g., same patient name+phone for the same
// doctor within a short window). This avoids schema changes while still
// preventing duplicates.
//
// For critical operations, we also store the key in the record's metadata
// so we can detect replays.

/**
 * Get all records modified after a given timestamp for a specific doctor.
 * Used for incremental sync / data hydration.
 */
export const getChangesSince = query({
  args: {
    clerkId: v.string(),
    since: v.number(), // timestamp in ms
    tables: v.optional(v.array(v.string())), // which tables to fetch
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return { patients: [], visits: [], queue: [], followUps: [] };

    const tables = args.tables ?? ["patients", "visits", "queue", "followUps"];
    const result: Record<string, unknown[]> = {};

    // Patients — filter by createdAt since we don't have an updatedAt field
    if (tables.includes("patients")) {
      const patients = await ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(1000);
      result.patients = patients.filter(
        (p) => p.createdAt >= args.since || p._creationTime >= args.since
      );
    }

    // Visits
    if (tables.includes("visits")) {
      const visits = await ctx.db
        .query("visits")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .order("desc")
        .take(500);
      result.visits = visits.filter(
        (v) => v.createdAt >= args.since || v._creationTime >= args.since
      );
    }

    // Queue — get today's queue (most relevant for offline)
    if (tables.includes("queue")) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const queue = await ctx.db
        .query("queue")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("queueDate", todayStart.getTime())
        )
        .take(500);
      result.queue = queue;
    }

    // Follow-ups
    if (tables.includes("followUps")) {
      const followUps = await ctx.db
        .query("followUps")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .order("desc")
        .take(200);
      result.followUps = followUps.filter(
        (f) => f.createdAt >= args.since || f._creationTime >= args.since
      );
    }

    return result;
  },
});

/**
 * Full data hydration — get all data for a doctor to populate Dexie.
 * Used on first load or when the cache is stale.
 */
export const getFullHydrationData = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return { patients: [], visits: [], queue: [], followUps: [] };

    // Get today's start for queue filtering
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const [patients, visits, queue, followUps] = await Promise.all([
      // All patients (capped)
      ctx.db
        .query("patients")
        .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
        .take(500),

      // Recent 30 days of visits
      ctx.db
        .query("visits")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).gte("date", thirtyDaysAgo)
        )
        .take(1000),

      // Today's queue
      ctx.db
        .query("queue")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("queueDate", todayStart.getTime())
        )
        .take(500),

      // Upcoming follow-ups
      ctx.db
        .query("followUps")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).gte("followUpDate", todayStart.getTime())
        )
        .take(200),
    ]);

    return {
      patients,
      visits,
      queue,
      followUps,
      hydratedAt: Date.now(),
    };
  },
});

/**
 * Check if a patient with the same phone already exists for a doctor.
 * Used by the offline sync to detect idempotent creates.
 */
export const checkDuplicatePatient = query({
  args: {
    clerkId: v.string(),
    phone: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const existing = await ctx.db
      .query("patients")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", user._id).eq("phone", args.phone)
      )
      .first();

    return existing?._id ?? null;
  },
});
