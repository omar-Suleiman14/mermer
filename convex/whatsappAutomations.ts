import { action, internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./authHelper";
import { internal, api } from "./_generated/api";
import { msgBookingConfirmed, msgDayCancelled, msgReminder, msgMissed, msgYourTurn, calcSlotNumber } from "./messageHelpers";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

export const sendMessage = internalAction({
  args: {
    instanceName: v.string(),
    evolutionApiKey: v.string(),
    phoneNumber: v.string(),
    messageText: v.string(),
    doctorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let cleanNumber = args.phoneNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.length === 10 && cleanNumber.startsWith("1")) {
      cleanNumber = "20" + cleanNumber;
    }

    const payload = {
      number: cleanNumber,
      options: {
        delay: 1200,
        presence: "composing",
      },
      text: args.messageText,
    };

    try {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${args.instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EVOLUTION_API_KEY || "B6D711FCDE4D4FD5936544120E7139D5",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Evolution API Send Error:", errText);
        
        // Parse common errors into friendly messages
        let friendlyError = "WhatsApp send failed";
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.response?.message) {
            const msgs = parsed.response.message;
            if (Array.isArray(msgs) && msgs.some((m: any) => m.exists === false)) {
              friendlyError = "هذا الرقم غير مسجل على واتساب";
            }
          }
          if (parsed?.error === "Unauthorized" || response.status === 401) {
            friendlyError = "خطأ في اتصال الواتساب - تحقق من الإعدادات";
          }
        } catch { /* keep default */ }
        if (args.doctorId) {
          await ctx.runMutation(internal.whatsappAutomations.logMessage, {
            doctorId: args.doctorId,
            patientPhone: args.phoneNumber,
            messageText: args.messageText,
            status: "failed",
            error: friendlyError,
          });
        }
        
        return { success: false, error: friendlyError };
      }

      if (args.doctorId) {
        await ctx.runMutation(internal.whatsappAutomations.logMessage, {
          doctorId: args.doctorId,
          patientPhone: args.phoneNumber,
          messageText: args.messageText,
          status: "success",
        });
      }

      return { success: true };
    } catch (e) {
      console.error("Failed to send WhatsApp message:", e);
      if (args.doctorId) {
        await ctx.runMutation(internal.whatsappAutomations.logMessage, {
          doctorId: args.doctorId,
          patientPhone: args.phoneNumber,
          messageText: args.messageText,
          status: "failed",
          error: "تعذر الاتصال بخدمة الواتساب",
        });
      }
      return { success: false, error: "تعذر الاتصال بخدمة الواتساب" };
    }
  },
});

export const logMessage = internalMutation({
  args: {
    doctorId: v.id("users"),
    patientPhone: v.string(),
    messageText: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messageLogs", {
      doctorId: args.doctorId,
      patientPhone: args.patientPhone,
      messageText: args.messageText,
      status: args.status,
      error: args.error,
      createdAt: Date.now(),
    });
  },
});

export const sendQueueUpdateMessage = internalAction({
  args: {
    clinicId: v.id("users"),
    patientName: v.string(),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch clinic's Evolution API credentials
    const clinic = await ctx.runQuery(api.whatsappQueries.getClinicEvolutionCreds, {
      clinicId: args.clinicId,
    });

    if (!clinic || !clinic.isEvolutionActive || clinic.evolutionStatus !== "open" || !clinic.evolutionInstanceName || !clinic.evolutionApiKey) {
      console.log("Evolution API not active for this clinic.");
      return;
    }

    if (!args.patientPhone) return;

    const messageText = msgYourTurn(args.patientName);

    await ctx.runAction(internal.whatsappAutomations.sendMessage, {
      instanceName: clinic.evolutionInstanceName,
      evolutionApiKey: clinic.evolutionApiKey,
      phoneNumber: args.patientPhone,
      messageText,
      doctorId: args.clinicId,
    });
  },
});

export const scheduleDailyReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all active clinics
    const clinics = await ctx.runQuery(internal.whatsappQueries.getActiveEvolutionClinics, {});
    
    let totalDelay = 0;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    for (const clinic of clinics) {
      if (clinic.evolutionStatus !== "open" || !clinic.evolutionInstanceName || !clinic.evolutionApiKey) continue;

      const appointments = await ctx.runQuery(internal.whatsappQueries.getTodayAppointmentsForReminders, {
        clinicId: clinic._id,
      });

      for (const appt of appointments) {
        if (!appt.patientPhone) continue;

        const slotNum = appt.queueNumber ?? (appt.date
          ? calcSlotNumber(appt.date, clinic.workingHoursStart ?? 9, clinic.slotDurationMinutes ?? 30)
          : undefined);

        const messageText = msgReminder({
          patientName: appt.patientName || "",
          clinicName: clinic.clinicName || "العيادة",
          doctorName: clinic.name,
          date: appt.date,
          slotNumber: slotNum,
          clinicAddress: clinic.clinicAddress,
        });

        // Stagger every 5 minutes
        await ctx.scheduler.runAfter(totalDelay, internal.whatsappAutomations.sendMessage, {
          instanceName: clinic.evolutionInstanceName,
          evolutionApiKey: clinic.evolutionApiKey,
          phoneNumber: appt.patientPhone,
          messageText,
        });

        totalDelay += FIVE_MINUTES_MS;
      }
    }
  },
});

export const scheduleMissedAppointments = internalAction({
  args: {},
  handler: async (ctx) => {
    const clinics = await ctx.runQuery(internal.whatsappQueries.getActiveEvolutionClinics, {});
    
    let totalDelay = 0;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    for (const clinic of clinics) {
      if (clinic.evolutionStatus !== "open" || !clinic.evolutionInstanceName || !clinic.evolutionApiKey) continue;

      const missedAppts = await ctx.runQuery(internal.whatsappQueries.getYesterdayMissedAppointments, {
        clinicId: clinic._id,
      });

      for (const appt of missedAppts) {
        if (!appt.patientPhone) continue;

        const messageText = msgMissed({
          patientName: appt.patientName || "",
          clinicName: clinic.clinicName || "العيادة",
          doctorName: clinic.name,
          date: appt.queueDate!,
        });

        await ctx.scheduler.runAfter(totalDelay, internal.whatsappAutomations.sendMessage, {
          instanceName: clinic.evolutionInstanceName,
          evolutionApiKey: clinic.evolutionApiKey,
          phoneNumber: appt.patientPhone,
          messageText,
        });

        totalDelay += FIVE_MINUTES_MS;
      }
    }
  },
});

export const cancelDayAction = action({
  args: { clinicId: v.id("users"), dateMs: v.number() },
  handler: async (ctx, args): Promise<{ success: boolean; cancelledCount: number; warning?: string }> => {
    // 1. Fetch clinic info
    const clinic = await ctx.runQuery(api.whatsappQueries.getClinicEvolutionCreds, {
      clinicId: args.clinicId,
    });

    let warning: string | undefined = undefined;
    if (!clinic || !clinic.isEvolutionActive || clinic.evolutionStatus !== "open" || !clinic.evolutionInstanceName || !clinic.evolutionApiKey) {
      warning = "Evolution API not active";
    }

    // 2. Run internal mutation to mark all visits on this day as cancelled and return them
    const cancelledVisits = await ctx.runMutation(internal.whatsappAutomations.cancelDayInternal, {
      clinicId: args.clinicId,
      dateMs: args.dateMs,
    }) as any[];

    // 3. Schedule the WhatsApp messages staggered
    if (!warning) {
      let totalDelay = 0;
      const FIVE_MINUTES_MS = 5 * 60 * 1000;

      for (const appt of cancelledVisits) {
        if (!appt.patientPhone) continue;

        const messageText = msgDayCancelled({
          patientName: appt.patientName,
          clinicName: clinic?.clinicName || "العيادة",
          doctorName: clinic?.name || "الطبيب",
          date: appt.date,
        });

        await ctx.scheduler.runAfter(totalDelay, internal.whatsappAutomations.sendMessage, {
          instanceName: clinic!.evolutionInstanceName!,
          evolutionApiKey: clinic!.evolutionApiKey!,
          phoneNumber: appt.patientPhone,
          messageText,
        });

        totalDelay += FIVE_MINUTES_MS;
      }
    }

    return { success: true, cancelledCount: cancelledVisits.length, warning };
  }
});

export const cancelDayInternal = internalMutation({
  args: { clinicId: v.id("users"), dateMs: v.number() },
  handler: async (ctx, args) => {
    const startMs = args.dateMs;
    const endMs = startMs + 24 * 60 * 60 * 1000;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) => 
        q.eq("doctorId", args.clinicId)
         .gte("date", startMs)
         .lt("date", endMs)
      )
      .collect();

    const toCancel = visits.filter(v => v.status === "confirmed" || v.status === "pending");

    for (const v of toCancel) {
      await ctx.db.patch(v._id, { status: "cancelled" });
    }

    const clinic = await ctx.db.get(args.clinicId);
    if (clinic) {
      const blockedDates = clinic.blockedDates || [];
      if (!blockedDates.includes(args.dateMs)) {
        await ctx.db.patch(args.clinicId, { blockedDates: [...blockedDates, args.dateMs] });
      }
    }

    return toCancel;
  }
});

export const getMessageLogs = query({
  args: {
    clerkId: v.string(),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    
    return await ctx.db
      .query("messageLogs")
      .withIndex("by_patient_phone", (q) => q.eq("patientPhone", args.patientPhone))
      .filter((q) => q.eq(q.field("doctorId"), user._id))
      .order("desc")
      .take(50);
  },
});
