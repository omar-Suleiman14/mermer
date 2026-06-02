import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const getClinicEvolutionCreds = query({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.clinicId);
    if (!user) return null;
    return {
      isEvolutionActive: user.isEvolutionActive,
      evolutionStatus: user.evolutionStatus,
      evolutionInstanceName: user.evolutionInstanceName,
      evolutionApiKey: user.evolutionApiKey,
      clinicAddress: user.clinicAddress || "العنوان غير متوفر",
    };
  },
});

export const getActiveEvolutionClinics = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("by_evolution_active", (q) => q.eq("isEvolutionActive", true))
      .collect();
  },
});

export const getTodayAppointmentsForReminders = internalQuery({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    const today = startOfDay(Date.now());
    
    const queue = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) => q.eq("doctorId", args.clinicId).eq("queueDate", today))
      .collect();
      
    // Only get active ones
    return queue.filter(q => q.status !== "done" && q.patientPhone);
  },
});

export const getYesterdayMissedAppointments = internalQuery({
  args: { clinicId: v.id("users") },
  handler: async (ctx, args) => {
    // Yesterday
    const yesterday = startOfDay(Date.now() - 24 * 60 * 60 * 1000);
    
    const queue = await ctx.db
      .query("queue")
      .withIndex("by_doctor_date", (q) => q.eq("doctorId", args.clinicId).eq("queueDate", yesterday))
      .collect();
      
    // Filter out "done", we only want ones that were left waiting or in-progress
    return queue.filter(q => q.status !== "done" && q.patientPhone);
  },
});
