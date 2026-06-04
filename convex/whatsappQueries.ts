import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

function startOfDay(ts: number): number {
  // Fix for Cairo timezone (UTC+3)
  const CAIRO_OFFSET = 3 * 60 * 60 * 1000;
  const cairoTime = ts + CAIRO_OFFSET;
  const daysSinceEpoch = Math.floor(cairoTime / (24 * 60 * 60 * 1000));
  return daysSinceEpoch * 24 * 60 * 60 * 1000 - CAIRO_OFFSET;
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
      clinicName: user.clinicName || "العيادة",
      name: user.name,
      workingHoursStart: user.workingHoursStart ?? 9,
      slotDurationMinutes: user.slotDurationMinutes ?? 30,
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
    const todayStart = startOfDay(Date.now());
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) => 
        q.eq("doctorId", args.clinicId)
         .gte("date", todayStart)
         .lt("date", tomorrowStart)
      )
      .collect();
      
    // Only get confirmed/pending ones with a phone number
    return visits.filter(v => (v.status === "confirmed" || v.status === "pending") && v.patientPhone);
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
