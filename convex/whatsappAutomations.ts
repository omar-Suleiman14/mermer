import { action, internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser } from "./authHelper";
import { internal, api } from "./_generated/api";
import { msgBookingConfirmed, msgDayCancelled, msgReminder, msgMissed, msgYourTurn, calcSlotNumber, msgPastDueInstallment, fmtDateAr, fmtTimeAr } from "./messageHelpers";

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || "http://localhost:8080";

export const sendMessage = internalAction({
  args: {
    instanceName: v.string(),
    evolutionApiKey: v.string(),
    phoneNumber: v.string(),
    messageText: v.string(),
    doctorId: v.optional(v.id("users")),
    templateName: v.optional(v.string()),
    templateVariables: v.optional(v.record(v.string(), v.union(v.string(), v.number()))),
  },
  handler: async (ctx, args) => {
    // Normalize phone number to international format
    let cleanNumber = args.phoneNumber.replace(/[^0-9]/g, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = "20" + cleanNumber.substring(1);
    } else if (cleanNumber.length === 10 && !cleanNumber.startsWith("20")) {
      cleanNumber = "20" + cleanNumber;
    } else if (cleanNumber.length === 11 && cleanNumber.startsWith("1")) {
      // e.g. 10xxxxxxxx (Egyptian, 11 digits starting with 1)
      cleanNumber = "20" + cleanNumber;
    }

    let textToSend = args.messageText;

    if (args.doctorId && args.templateName && args.templateVariables) {
      const customTemplate = await ctx.runQuery(internal.whatsappQueries.getDoctorTemplateByName, {
        clinicId: args.doctorId,
        templateName: args.templateName,
      });

      if (customTemplate && customTemplate.body) {
        let body = customTemplate.body;
        for (const [key, value] of Object.entries(args.templateVariables)) {
          body = body.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, "g"), String(value));
        }
        textToSend = body;
      }
    }

    // Evolution Go /send/text TextStruct: { number, text, delay, formatJid? }
    const payload = {
      number: cleanNumber,
      text: textToSend,
      delay: 1200,
      formatJid: true,
    };

    const MAX_RETRIES = 3;
    let lastError = "WhatsApp send failed";
    let connectionClosed = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Evolution Go: POST /send/text — use instance token (evolutionApiKey) as apikey header to scope to this instance
        const response = await fetch(`${EVOLUTION_API_URL}/send/text`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: args.evolutionApiKey,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          if (args.doctorId) {
            await ctx.runMutation(internal.whatsappAutomations.logMessage, {
              doctorId: args.doctorId,
              patientPhone: args.phoneNumber,
              messageText: args.messageText,
              status: "success",
            });
          }
          return { success: true };
        }

        const errText = await response.text();
        console.error(`Evolution API Send Error (attempt ${attempt}/${MAX_RETRIES}):`, errText);

        let isTransient = false;
        try {
          const parsed = JSON.parse(errText);
          const msg = parsed?.response?.message;
          // "Connection Closed" is a transient Baileys socket drop — reconnect and retry
          if (typeof msg === "string" && msg.toLowerCase().includes("connection closed")) {
            isTransient = true;
            connectionClosed = true;
            lastError = "خطأ مؤقت في اتصال الواتساب";
            // Trigger socket reconnect before the next attempt
            if (attempt < MAX_RETRIES) {
              console.log(`Connection closed detected, triggering reconnect for ${args.instanceName}...`);
              await ctx.runAction(internal.evolution.reconnectInstance, { instanceName: args.instanceName });
            }
          } else if (Array.isArray(msg) && msg.some((m: any) => m.exists === false)) {
            lastError = "هذا الرقم غير مسجل على واتساب";
          } else if (parsed?.error === "Unauthorized" || response.status === 401) {
            lastError = "خطأ في اتصال الواتساب - تحقق من الإعدادات";
          }
        } catch { /* keep default */ }

        if (isTransient && attempt < MAX_RETRIES) {
          // After triggering a reconnect, wait longer for socket to re-establish (8s, 15s)
          await new Promise(r => setTimeout(r, 8000 * attempt));
          continue;
        }

        // Non-transient or final attempt — give up
        break;
      } catch (e) {
        console.error(`Failed to send WhatsApp message (attempt ${attempt}/${MAX_RETRIES}):`, e);
        lastError = "تعذر الاتصال بخدمة الواتساب";
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 3000 * attempt));
        }
      }
    }

    // All retries exhausted — log failure and mark instance as disconnected if connection was lost
    if (connectionClosed && args.doctorId) {
      // Mark the Evolution instance as disconnected so the UI shows the reconnect popup
      await ctx.runMutation(internal.evolution.updateInstanceStatus, {
        clinicId: args.doctorId,
        evolutionStatus: "disconnected",
      });
    }
    if (args.doctorId) {
      await ctx.runMutation(internal.whatsappAutomations.logMessage, {
        doctorId: args.doctorId,
        patientPhone: args.phoneNumber,
        messageText: args.messageText,
        status: "failed",
        error: lastError,
      });
    }
    return { success: false, error: lastError };
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

    const messageText = msgYourTurn(args.patientName, clinic.clinicName, clinic.name);
    console.log(`[sendQueueUpdateMessage] Sending to ${args.patientPhone} for clinic ${clinic.name}`);

    await ctx.runAction(internal.whatsappAutomations.sendMessage, {
      instanceName: clinic.evolutionInstanceName,
      evolutionApiKey: clinic.evolutionApiKey,
      phoneNumber: args.patientPhone,
      messageText,
      doctorId: args.clinicId,
      templateName: "الدور القادم",
      templateVariables: { patient_name: args.patientName },
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
          clinicAddressLink: clinic.clinicAddressLink,
        });

        // Stagger every 5 minutes
        await ctx.scheduler.runAfter(totalDelay, internal.whatsappAutomations.sendMessage, {
          instanceName: clinic.evolutionInstanceName,
          evolutionApiKey: clinic.evolutionApiKey,
          phoneNumber: appt.patientPhone,
          messageText,
          doctorId: clinic._id,
          templateName: "تذكير بالموعد",
          templateVariables: {
            patient_name: appt.patientName || "",
            date: appt.date ? fmtDateAr(appt.date) : "",
            time: appt.date ? fmtTimeAr(appt.date) : "",
            clinic_address: clinic.clinicAddressLink || clinic.clinicAddress || "",
          },
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
          doctorId: clinic._id,
          templateName: "موعد فائت",
          templateVariables: {
            patient_name: appt.patientName || "",
            date: appt.queueDate ? fmtDateAr(appt.queueDate) : "",
          },
        });

        totalDelay += FIVE_MINUTES_MS;
      }
    }
  },
});

export const schedulePastDueInstallments = internalAction({
  args: {},
  handler: async (ctx) => {
    const clinics = await ctx.runQuery(internal.whatsappQueries.getActiveEvolutionClinics, {});
    
    let totalDelay = 0;
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    for (const clinic of clinics) {
      if (clinic.evolutionStatus !== "open" || !clinic.evolutionInstanceName || !clinic.evolutionApiKey) continue;

      // Ensure clinic has a clerkId field or we fetch it.
      // Wait, `getActiveEvolutionClinics` returns the user object, so `clinic.clerkId` exists!
      if (!clinic.clerkId) continue;

      const pastDueInstallments = await ctx.runQuery(api.installments.listPastDueinstallments, {
        clerkId: clinic.clerkId,
      });

      for (const inst of pastDueInstallments) {
        if (!inst.patientPhone) continue;

        const messageText = msgPastDueInstallment({
          patientName: inst.patientName || "",
          clinicName: clinic.clinicName || "العيادة",
          doctorName: clinic.name,
          date: inst.nextVisitDate || Date.now(),
          amount: inst.unpaidBalance || 0,
        });

        await ctx.scheduler.runAfter(totalDelay, internal.whatsappAutomations.sendMessage, {
          instanceName: clinic.evolutionInstanceName,
          evolutionApiKey: clinic.evolutionApiKey,
          phoneNumber: inst.patientPhone,
          messageText,
          doctorId: clinic._id,
          templateName: "قسط متأخر",
          templateVariables: {
            patient_name: inst.patientName || "",
            date: inst.nextVisitDate ? fmtDateAr(inst.nextVisitDate) : "",
            amount: inst.unpaidBalance || 0,
          },
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
          doctorId: args.clinicId,
          templateName: "إلغاء الموعد",
          templateVariables: {
            patient_name: appt.patientName,
            date: fmtDateAr(appt.date),
          },
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

export const getAllMessageLogs = query({
  args: { clerkId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    
    return await ctx.db
      .query("messageLogs")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(args.limit ?? 200);
  },
});

export const getRecentFailedMessages = query({
  args: { clerkId: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    
    const recentLogs = await ctx.db
      .query("messageLogs")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(50);
      
    return recentLogs.filter(log => log.status === "failed" && log.createdAt >= args.since);
  },
});
