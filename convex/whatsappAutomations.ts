import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

// Internal Action: Send WhatsApp Message via Evolution API
export const sendMessage = internalAction({
  args: {
    instanceName: v.string(),
    evolutionApiKey: v.string(),
    phoneNumber: v.string(),
    messageText: v.string(),
  },
  handler: async (ctx, args) => {
    const cleanNumber = args.phoneNumber.replace(/[^0-9]/g, "");

    const payload = {
      number: cleanNumber,
      options: {
        delay: 1200,
        presence: "composing",
      },
      textMessage: {
        text: args.messageText,
      },
    };

    try {
      const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${args.instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: args.evolutionApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("Evolution API Send Error:", err);
        return { success: false, error: err };
      }

      return { success: true };
    } catch (e) {
      console.error("Failed to send WhatsApp message:", e);
      return { success: false, error: String(e) };
    }
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

    const messageText = `مرحباً ${args.patientName}، دورك القادم الآن. يرجى التوجه إلى العيادة في أقرب وقت.`;

    await ctx.runAction(internal.whatsappAutomations.sendMessage, {
      instanceName: clinic.evolutionInstanceName,
      evolutionApiKey: clinic.evolutionApiKey,
      phoneNumber: args.patientPhone,
      messageText,
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
        if (!appt.patientPhone || appt.reminderSent) continue;
        
        let timeStr = "اليوم";
        if (appt.scheduledTime) {
          const date = new Date(appt.scheduledTime);
          timeStr = `اليوم الساعة ${date.toLocaleTimeString("ar-EG", { hour: "numeric", minute: "numeric", hour12: true })}`;
        }

        const messageText = `مرحباً ${appt.patientName}، نذكّرك بموعدك/استشارتك ${timeStr}. عنوان العيادة: ${clinic.clinicAddress || 'العنوان غير متوفر'}. نراك قريباً.`;
        
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

        const dateStr = new Date(appt.queueDate!).toLocaleDateString("ar-EG", { month: "long", day: "numeric" });
        const messageText = `مرحباً ${appt.patientName}، يبدو أنك لم تحضر موعدك بتاريخ ${dateStr}. يسعدنا إعادة الحجز عند اتصالك بنا.`;
        
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
