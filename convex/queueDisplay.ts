import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

// Get or create a display token for this doctor
export const getOrCreateDisplayToken = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    if (user.queueDisplayToken) return user.queueDisplayToken;

    const token = generateToken();
    await ctx.db.patch(user._id, { queueDisplayToken: token });
    return token;
  },
});

// Public: fetch today's visits by display token — mirrors the dashboard
export const getTodayQueueByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_queue_token", (q) =>
        q.eq("queueDisplayToken", args.token)
      )
      .unique();
    if (!doctor) return null;

    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const dayStart = todayStart.getTime();
    const dayEnd = dayStart + 86400000 - 1;

    // Query the visits table — same as the dashboard
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q
          .eq("doctorId", doctor._id)
          .gte("date", dayStart)
          .lte("date", dayEnd)
      )
      .collect();

    // Filter out cancelled, sort by date (position order)
    const activeVisits = visits
      .filter((v) => v.status !== "cancelled")
      .sort((a, b) => a.date - b.date);

    // Resolve patient names
    const queue = await Promise.all(
      activeVisits.map(async (visit, idx) => {
        const patient = visit.patientId
          ? await ctx.db.get(visit.patientId)
          : null;
        return {
          position: idx + 1,
          patientName:
            visit.patientName ?? patient?.name ?? "Unknown",
          time: visit.date,
          status: visit.status, // pending | confirmed | completed
        };
      })
    );

    return {
      clinicName: doctor.clinicName,
      doctorName: doctor.name,
      queue,
    };
  },
});
