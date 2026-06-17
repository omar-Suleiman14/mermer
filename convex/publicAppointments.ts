import { action, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getPublicScreenVisits = query({
  args: { slug: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor) return [];

    const start = args.dayStart;
    const end = start + 86400000;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).gte("date", start).lt("date", end)
      )
      .collect();

    const clinicScreenShowNames = (doctor as any).clinicScreenShowNames ?? false;

    return visits
      .filter(v => v.status !== "cancelled")
      .map(v => ({
        date: v.date,
        status: v.status,
        queueNumber: v.queueNumber,
        patientName: clinicScreenShowNames ? v.patientName : undefined,
      }));
  }
});

export const createAppointment = action({
  args: {
    doctorSlug: v.string(),
    patientName: v.string(),
    patientPhone: v.string(),
    patientAge: v.optional(v.number()),
    patientGender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    date: v.number(),
  },
  handler: async (ctx, args): Promise<{ visitId: Id<"visits">; queueNumber: number }> => {
    // 1. Create the appointment as pending in the DB
    const { visitId, doctor, patientName, queueNumber } = await ctx.runMutation(internal.appointments.createAppointmentInternal, args) as any;

    // 2. Fire push notification to doctor
    const apptTime = new Date(args.date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    
    // Fire and forget
    await ctx.runAction(internal.pushActions.sendPushNotification, {
      userId: doctor._id,
      title: "حجز إلكتروني جديد (قيد الانتظار)",
      body: `${patientName} حجز موعداً الساعة ${apptTime} (رقم ${queueNumber}) بانتظار رسالة التأكيد عبر الواتساب.`,
      url: `/dashboard/queue?date=${args.date}`,
    }).catch(console.error);

    return { visitId, queueNumber };
  }
});
