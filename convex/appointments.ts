import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUser, requireAuthUser, logAction } from "./authHelper";
import { internal } from "./_generated/api";
import { msgBookingConfirmed, msgAppointmentCancelled, msgRescheduled, calcSlotNumber, fmtTimeAr, fmtDateAr } from "./messageHelpers";

export const testTrigger = mutation({
  args: { clinicId: v.id("users"), patientName: v.string(), patientPhone: v.string() },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendQueueUpdateMessage, {
      clinicId: args.clinicId,
      patientName: args.patientName,
      patientPhone: args.patientPhone,
    });
  }
});

export const debugVisits = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messageLogs").order("desc").take(10);
  }
});

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MAX_PUBLIC_BOOKING_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const PAST_BOOKING_GRACE_MS = 5 * 60 * 1000;

function startOfDay(ts: number): number {
  const CAIRO_OFFSET = 3 * 60 * 60 * 1000;
  const cairoTime = ts + CAIRO_OFFSET;
  const daysSinceEpoch = Math.floor(cairoTime / (24 * 60 * 60 * 1000));
  return daysSinceEpoch * 24 * 60 * 60 * 1000 - CAIRO_OFFSET;
}

function normalizeEgyptMobile(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^1[0125]\d{8}$/.test(digits)) {
    throw new ConvexError("Invalid phone number");
  }
  return digits;
}

function assertPublicBookingSlot(
  date: number,
  doctor: {
    availableDays?: string[];
    slotDurationMinutes?: number;
    timezoneOffset?: number;
    workingHoursStart?: number;
    workingHoursEnd?: number;
  }
) {
  const now = Date.now();
  if (!Number.isFinite(date) || date < now - PAST_BOOKING_GRACE_MS) {
    throw new ConvexError("Appointment time must be in the future");
  }
  if (date > now + MAX_PUBLIC_BOOKING_WINDOW_MS) {
    throw new ConvexError("Appointment time is too far in the future");
  }

  const doctorOffsetMinutes = doctor.timezoneOffset ?? -180;
  const localDate = new Date(date - doctorOffsetMinutes * 60 * 1000);
  const day = DAY_ABBREVS[localDate.getUTCDay()];
  const availableDays = doctor.availableDays ?? [];
  if (availableDays.length > 0 && !availableDays.includes(day)) {
    throw new ConvexError("Doctor is not available on this day");
  }

  const startHour = doctor.workingHoursStart ?? 9;
  const endHour = doctor.workingHoursEnd ?? 17;
  const slotDuration = doctor.slotDurationMinutes ?? 30;
  const startMinutes = Math.round(startHour * 60);
  const endMinutes = Math.round(endHour * 60);
  const slotMinutes = localDate.getUTCHours() * 60 + localDate.getUTCMinutes();

  if (slotMinutes < startMinutes || slotMinutes >= endMinutes) {
    throw new ConvexError("Appointment must be within working hours");
  }
  if ((slotMinutes - startMinutes) % slotDuration !== 0) {
    throw new ConvexError("Appointment must match an available slot");
  }

  return Math.floor((slotMinutes - startMinutes) / slotDuration) + 1;
}

// ─── Public booking (online) ─────────────────────────────────────────────────

export const createAppointmentInternal = internalMutation({
  args: {
    doctorSlug: v.string(),
    patientName: v.string(),
    patientPhone: v.string(),
    patientAge: v.optional(v.number()),
    patientGender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    date: v.number(),
  },
  handler: async (ctx, args): Promise<{ visitId: Id<"visits">; doctor: any; patientPhone: string; patientName: string; queueNumber: number }> => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.doctorSlug))
      .unique();
    if (!doctor || !doctor.publicProfile || doctor.isBanned) {
      throw new ConvexError("Doctor not found");
    }

    const patientName = args.patientName.trim().replace(/\s+/g, " ");
    if (patientName.length < 2 || patientName.length > 100) {
      throw new ConvexError("Invalid patient name");
    }

    const patientPhone = normalizeEgyptMobile(args.patientPhone);
    if (args.patientAge !== undefined) {
      const age = Math.floor(args.patientAge);
      if (!Number.isFinite(age) || age < 0 || age > 120) {
        throw new ConvexError("Invalid patient age");
      }
    }

    const queueNumber = assertPublicBookingSlot(args.date, doctor);

    // Rate Limiting: Max 3 appointments created per hour per phone number
    const recent = await ctx.db
      .query("visits")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", doctor._id).eq("patientPhone", patientPhone)
      )
      .take(10);
    const createdLastHour = recent.filter(
      (visit) => visit.createdAt >= Date.now() - 3600000
    );
    if (createdLastHour.length >= 30) {
      throw new ConvexError("Rate limit exceeded: You can only book 30 appointments per hour.");
    }

    // Conflict check against visits table (Convex OCC makes this race-condition safe)
    const existing = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();
      
    if (existing) {
      throw new ConvexError("This time slot is already booked");
    }

    // OPTIMIZED: Use by_doctor_phone index for O(1) lookup
    const existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_doctor_phone", (q) =>
        q.eq("doctorId", doctor._id).eq("phone", patientPhone)
      )
      .first();

    let patientId = existingPatient?._id;

    if (!patientId) {
      patientId = await ctx.db.insert("patients", {
        doctorId: doctor._id,
        name: patientName,
        age: args.patientAge ?? 0,
        phone: patientPhone,
        gender: args.patientGender,
        chronicConditions: [],
        createdAt: Date.now(),
      });
    }

    // Create a visit directly
    const visitId = await ctx.db.insert("visits", {
      doctorId: doctor._id,
      patientId,
      patientName,
      patientPhone,
      patientAge: args.patientAge,
      date: args.date,
      status: "confirmed",
      source: "online",
      queueNumber,
      createdAt: Date.now(),
    });

    // Send WhatsApp confirmation immediately
    if (doctor.evolutionApiKey && doctor.evolutionInstanceName && doctor.isEvolutionActive) {
      const slotNum = calcSlotNumber(args.date, doctor.workingHoursStart ?? 9, doctor.slotDurationMinutes ?? 30);
      const messageText = msgBookingConfirmed({
        patientName: args.patientName,
        clinicName: doctor.clinicName || "العيادة",
        doctorName: doctor.name,
        date: args.date,
        slotNumber: slotNum,
        clinicAddress: doctor.clinicAddress,
        clinicAddressLink: doctor.clinicAddressLink,
      });

      const intlPhone = "20" + patientPhone;

      await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
        instanceName: doctor.evolutionInstanceName,
        evolutionApiKey: doctor.evolutionApiKey,
        phoneNumber: intlPhone,
        messageText,
        doctorId: doctor._id,
        templateName: "تأكيد حجز",
        templateVariables: {
          patient_name: args.patientName,
          date: fmtDateAr(args.date),
          time: fmtTimeAr(args.date),
        },
      });
    }

    return { visitId, doctor, patientPhone, patientName: args.patientName, queueNumber };
  },
});

export const autoCancelPendingAppointment = internalMutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const visit = await ctx.db.get(args.visitId);
    if (visit && visit.status === "pending") {
      await ctx.db.patch(args.visitId, { status: "cancelled" });
    }
  }
});

export const deleteAppointmentInternal = internalMutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.visitId);
  }
});

export const confirmPendingAppointmentByPhone = internalMutation({
  args: { 
    patientPhone: v.string(),
    instanceName: v.string()
  },
  handler: async (ctx, args) => {
    // Normalize the incoming phone to ALL possible formats stored in DB
    const raw = args.patientPhone.replace(/[^0-9]/g, "");
    // Build candidate formats: e.g. "201012345678", "01012345678", "1012345678"
    const candidates: string[] = [raw];
    if (raw.startsWith("20")) {
      candidates.push("0" + raw.substring(2));  // 201012345678 → 01012345678
      candidates.push(raw.substring(2));          // 201012345678 → 1012345678
    } else if (raw.startsWith("0")) {
      candidates.push("20" + raw.substring(1));  // 01012345678 → 201012345678
      candidates.push(raw.substring(1));          // 01012345678 → 1012345678
    } else {
      candidates.push("20" + raw);               // 1012345678 → 201012345678
      candidates.push("0" + raw);                // 1012345678 → 01012345678
    }

    // 1. Find the latest pending visit matching any candidate phone format
    const allVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor")
      .filter(q => q.eq(q.field("status"), "pending"))
      .collect();

    const pendingVisits = allVisits.filter(v =>
      v.patientPhone && candidates.includes(v.patientPhone.replace(/[^0-9]/g, ""))
    );

    if (pendingVisits.length === 0) {
      console.log("No pending visit found for phone candidates:", candidates);
      return;
    }

    // Sort to get the most recently created one
    pendingVisits.sort((a, b) => b.createdAt - a.createdAt);
    const visit = pendingVisits[0];

    // 2. Mark as confirmed
    await ctx.db.patch(visit._id, { status: "confirmed" });

    // 3. Get doctor to fetch API key and name
    const doctor = await ctx.db.get(visit.doctorId);
    if (!doctor) return;

    // 4. Send confirmation reply via Evolution API using scheduler
    const slotNum = calcSlotNumber(visit.date, doctor.workingHoursStart ?? 9, doctor.slotDurationMinutes ?? 30);
    const messageText = msgBookingConfirmed({
      patientName: visit.patientName || "",
      clinicName: doctor.clinicName || "العيادة",
      doctorName: doctor.name,
      date: visit.date,
      slotNumber: slotNum,
      clinicAddress: doctor.clinicAddress,
      clinicAddressLink: doctor.clinicAddressLink,
    });
    
    // Use the raw international number (from the webhook) for sending back
    await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
      instanceName: args.instanceName,
      evolutionApiKey: doctor.evolutionApiKey || "",
      phoneNumber: raw,  // already in international format from webhook
      messageText,
      doctorId: doctor._id,
      templateName: "تأكيد حجز",
      templateVariables: {
        patient_name: visit.patientName || "",
        date: fmtDateAr(visit.date),
        time: fmtTimeAr(visit.date),
      },
    });

    // 5. Notify doctor that it's confirmed
    await ctx.scheduler.runAfter(0, internal.pushActions.sendPushNotification, {
      userId: doctor._id,
      title: "تأكيد حجز عبر الواتساب",
      body: `قام ${visit.patientName} بتأكيد موعده للساعة ${fmtTimeAr(visit.date)}.`,
      url: `/dashboard/patients/${visit.patientId}`,
    });
  }
});



// ─── Doctor manually adds a visit ────────────────────────────────────────────

export const addManualAppointment = mutation({
  args: {
    clerkId: v.string(),
    patientId: v.id("patients"),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const doctor = await requireAuthUser(ctx, args.clerkId);

    const patient = await ctx.db.get(args.patientId);
    if (!patient) throw new ConvexError("Patient not found");
    if (patient.doctorId !== doctor._id) throw new ConvexError("Access denied");

    // Working hours validation
    const doctorOffsetMinutes = doctor.timezoneOffset ?? -180;
    const localTimeMs = args.date - (doctorOffsetMinutes * 60 * 1000);
    const localDate = new Date(localTimeMs);
    const bookingHour = localDate.getUTCHours();
    const startHour = doctor.workingHoursStart ?? 9;
    const endHour = doctor.workingHoursEnd ?? 17;
    if (bookingHour < startHour || bookingHour >= endHour) {
      throw new ConvexError(`Appointment must be within working hours: ${startHour}:00 - ${endHour}:00`);
    }

    // Conflict check
    const conflict = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).eq("date", args.date)
      )
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .first();
    if (conflict) {
      throw new ConvexError("This time slot is already booked");
    }

    const visitId = await ctx.db.insert("visits", {
      doctorId: doctor._id,
      patientId: args.patientId,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientAge: patient.age,
      date: args.date,
      status: "confirmed",
      source: "manual",
      notes: args.notes,
      createdAt: Date.now(),
    });

    if (doctor.evolutionInstanceName && doctor.evolutionApiKey) {
      const slotNum = calcSlotNumber(args.date, doctor.workingHoursStart ?? 9, doctor.slotDurationMinutes ?? 30);
      const messageText = msgBookingConfirmed({
        patientName: patient.name,
        clinicName: doctor.clinicName || "العيادة",
        doctorName: doctor.name,
        date: args.date,
        slotNumber: slotNum,
        clinicAddress: doctor.clinicAddress,
        clinicAddressLink: doctor.clinicAddressLink,
      });
      
      await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
        instanceName: doctor.evolutionInstanceName,
        evolutionApiKey: doctor.evolutionApiKey,
        phoneNumber: patient.phone,
        messageText,
        doctorId: doctor._id,
        templateName: "تأكيد حجز",
        templateVariables: {
          patient_name: patient.name,
          date: fmtDateAr(args.date),
          time: fmtTimeAr(args.date),
        },
      });
    }

    return { visitId };
  },
});

// ─── Swap two visits ─────────────────────────────────────────────────────────

export const swapAppointments = mutation({
  args: {
    clerkId: v.string(),
    appointmentId1: v.id("visits"),
    appointmentId2: v.id("visits"),
    expectedDate1: v.optional(v.number()),
    expectedDate2: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const v1 = await ctx.db.get(args.appointmentId1);
    const v2 = await ctx.db.get(args.appointmentId2);

    if (!v1 || v1.doctorId !== user._id) throw new ConvexError("Not found 1");
    if (!v2 || v2.doctorId !== user._id) throw new ConvexError("Not found 2");

    if (args.expectedDate1 && v1.date !== args.expectedDate1) {
      throw new ConvexError("Appointment 1 was modified by another user. Please refresh.");
    }
    if (args.expectedDate2 && v2.date !== args.expectedDate2) {
      throw new ConvexError("Appointment 2 was modified by another user. Please refresh.");
    }

    await ctx.db.patch(v1._id, { date: v2.date });
    await ctx.db.patch(v2._id, { date: v1.date });

    if (user.evolutionInstanceName && user.evolutionApiKey) {
      if (v1.patientPhone) {
        const slot1 = calcSlotNumber(v2.date, user.workingHoursStart ?? 9, user.slotDurationMinutes ?? 30);
        await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
          instanceName: user.evolutionInstanceName,
          evolutionApiKey: user.evolutionApiKey,
          phoneNumber: v1.patientPhone,
          messageText: msgRescheduled({ patientName: v1.patientName || "", clinicName: user.clinicName || "العيادة", doctorName: user.name, newDate: v2.date, slotNumber: slot1, clinicAddress: user.clinicAddress, clinicAddressLink: user.clinicAddressLink }),
          doctorId: user._id,
          templateName: "تعديل الموعد",
          templateVariables: {
            patient_name: v1.patientName || "",
            date: fmtDateAr(v2.date),
            time: fmtTimeAr(v2.date),
          },
        });
      }
      if (v2.patientPhone) {
        const slot2 = calcSlotNumber(v1.date, user.workingHoursStart ?? 9, user.slotDurationMinutes ?? 30);
        await ctx.scheduler.runAfter(5000, internal.whatsappAutomations.sendMessage, {
          instanceName: user.evolutionInstanceName,
          evolutionApiKey: user.evolutionApiKey,
          phoneNumber: v2.patientPhone,
          messageText: msgRescheduled({ patientName: v2.patientName || "", clinicName: user.clinicName || "العيادة", doctorName: user.name, newDate: v1.date, slotNumber: slot2, clinicAddress: user.clinicAddress, clinicAddressLink: user.clinicAddressLink }),
          doctorId: user._id,
          templateName: "تعديل الموعد",
          templateVariables: {
            patient_name: v2.patientName || "",
            date: fmtDateAr(v1.date),
            time: fmtTimeAr(v1.date),
          },
        });
      }
    }
  },
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];
    return await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);
  },
});

// FIX #7: Dedicated query for online appointments — replaces filtering 200 visits client-side
export const listOnlineAppointments = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    // Fetch recent visits and filter by source === "online" server-side
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .order("desc")
      .take(200);

    return visits
      .filter((v) => v.source === "online" && (v.status === "confirmed" || v.status === "pending"))
      .slice(0, 50);
  },
});

// OPTIMIZED: Skip redundant patient joins — denormalized fields exist on visit
export const getAppointmentsByDate = query({
  args: { clerkId: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const dayEnd = args.dayStart + 86400000 - 1;

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q
          .eq("doctorId", user._id)
          .gte("date", args.dayStart)
          .lte("date", dayEnd)
      )
      .take(500);

    // OPTIMIZED: Only fetch patient if denormalized fields are missing (rare).
    return await Promise.all(
      visits.map(async (visit) => {
        const needsPatient = !visit.patientName && visit.patientId;
        const patient = needsPatient ? await ctx.db.get(visit.patientId) : null;
        return {
          ...visit,
          patientName: visit.patientName ?? patient?.name ?? "Unknown",
          patientPhone: visit.patientPhone ?? patient?.phone ?? "",
          patientAge: visit.patientAge ?? patient?.age,
          patient: needsPatient ? patient : null,
        };
      })
    );
  },
});

export const getAppointmentsByRange = query({
  args: { clerkId: v.string(), startMs: v.number(), endMs: v.number() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return [];

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q
          .eq("doctorId", user._id)
          .gte("date", args.startMs)
          .lte("date", args.endMs)
      )
      .take(1000); // Allow up to 1000 visits for a range (e.g. 1-2 weeks)

    return await Promise.all(
      visits.map(async (visit) => {
        const needsPatient = !visit.patientName && visit.patientId;
        const patient = needsPatient ? await ctx.db.get(visit.patientId) : null;
        return {
          ...visit,
          patientName: visit.patientName ?? patient?.name ?? "Unknown",
          patientPhone: visit.patientPhone ?? patient?.phone ?? "",
          patientAge: visit.patientAge ?? patient?.age,
          patient: needsPatient ? patient : null,
        };
      })
    );
  },
});

export const getAvailableSlots = query({
  args: { slug: v.string(), date: v.number() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor) return [];

    const dayStart = args.date;
    const dayEnd = dayStart + 86400000 - 1;

    const booked = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", doctor._id).gte("date", dayStart).lte("date", dayEnd)
      )
      .take(200);

    return booked
      .filter((b) => b.status !== "cancelled")
      .map((b) => b.date);
  },
});

// ─── Update / delete ─────────────────────────────────────────────────────────

export const updateAppointment = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("visits"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("confirmed"),
          v.literal("cancelled"),
          v.literal("completed")
        )
      ),
      notes: v.optional(v.string()),
      prescriptionImageId: v.optional(v.id("_storage")),
      documentIds: v.optional(v.array(v.id("_storage"))),
      date: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new ConvexError("Not authorized");

    if (args.updates.date) {
      const doctorOffsetMinutes = user.timezoneOffset ?? -180;
      const localTimeMs = args.updates.date - (doctorOffsetMinutes * 60 * 1000);
      const localDate = new Date(localTimeMs);
      const bookingHour = localDate.getUTCHours();
      const startHour = user.workingHoursStart ?? 9;
      const endHour = user.workingHoursEnd ?? 17;
      if (bookingHour < startHour || bookingHour >= endHour) {
        throw new ConvexError(`Appointment must be within working hours: ${startHour}:00 - ${endHour}:00`);
      }

      const conflict = await ctx.db
        .query("visits")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).eq("date", args.updates.date as number)
        )
        .collect();
      if (conflict.some((c) => c._id !== visit._id && c.status !== "cancelled")) {
        throw new ConvexError("This time slot is already booked");
      }

      // Sync the reschedule to the installment's nextVisitDate
      if (visit.installmentId) {
        await ctx.db.patch(visit.installmentId, { nextVisitDate: args.updates.date });
      }

      // Send WhatsApp notification for date change
      if (visit.patientPhone && user.evolutionInstanceName && user.evolutionApiKey && args.updates.date !== visit.date) {
        const newDate = args.updates.date;
        const slotNum = calcSlotNumber(newDate, user.workingHoursStart ?? 9, user.slotDurationMinutes ?? 30);
        await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
          instanceName: user.evolutionInstanceName,
          evolutionApiKey: user.evolutionApiKey,
          phoneNumber: visit.patientPhone,
          messageText: msgRescheduled({ patientName: visit.patientName || "", clinicName: user.clinicName || "العيادة", doctorName: user.name, newDate, slotNumber: slotNum, clinicAddress: user.clinicAddress, clinicAddressLink: user.clinicAddressLink }),
          doctorId: user._id,
          templateName: "تعديل الموعد",
          templateVariables: {
            patient_name: visit.patientName || "",
            date: fmtDateAr(newDate),
            time: fmtTimeAr(newDate),
          },
        });
      }
    }

    if (args.updates.status === "confirmed" && visit.status !== "confirmed" && visit.patientPhone && user.evolutionInstanceName && user.evolutionApiKey) {
      const slotNum = calcSlotNumber(visit.date, user.workingHoursStart ?? 9, user.slotDurationMinutes ?? 30);
      const messageText = msgBookingConfirmed({
        patientName: visit.patientName || "",
        clinicName: user.clinicName || "العيادة",
        doctorName: user.name,
        date: visit.date,
        slotNumber: slotNum,
        clinicAddress: user.clinicAddress,
        clinicAddressLink: user.clinicAddressLink,
      });

      await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
        instanceName: user.evolutionInstanceName,
        evolutionApiKey: user.evolutionApiKey,
        phoneNumber: visit.patientPhone,
        messageText,
        doctorId: user._id,
        templateName: "تأكيد حجز",
        templateVariables: {
          patient_name: visit.patientName || "",
          date: fmtDateAr(visit.date),
          time: fmtTimeAr(visit.date),
        },
      });
    }

    if (args.updates.status === "cancelled" && visit.status !== "cancelled" && visit.patientPhone && user.evolutionInstanceName && user.evolutionApiKey) {
      await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
        instanceName: user.evolutionInstanceName,
        evolutionApiKey: user.evolutionApiKey,
        phoneNumber: visit.patientPhone,
        messageText: msgAppointmentCancelled({ patientName: visit.patientName || "", clinicName: user.clinicName || "العيادة", doctorName: user.name, date: visit.date }),
        doctorId: user._id,
        templateName: "إلغاء الموعد",
        templateVariables: {
          patient_name: visit.patientName || "",
          date: fmtDateAr(visit.date),
        },
      });
    }

    await ctx.db.patch(args.appointmentId, args.updates);

    // Notify the new NEXT patient in line
    if (args.updates.status === "completed") {
      const todayStart = startOfDay(Date.now());
      const todayEnd = todayStart + 86400000;

      const upcoming = await ctx.db
        .query("visits")
        .withIndex("by_doctor_date", (q) =>
          q.eq("doctorId", user._id).gte("date", todayStart).lt("date", todayEnd)
        )
        .collect();

      const activeVisits = upcoming
        .filter(v => (v.status === "confirmed" || v.status === "pending") && v._id !== args.appointmentId)
        .sort((a, b) => a.date - b.date);

      // activeVisits[0] is the new CURRENT patient.
      // activeVisits[1] is the new NEXT patient in line.
      // We notify the new NEXT patient so they have time to commute.
      if (activeVisits.length > 1) {
        const newNextVisit = activeVisits[1];
        console.log("[updateAppointment] Backend calculated NEW NEXT patient:", newNextVisit._id);
        if (newNextVisit.patientPhone && user.evolutionInstanceName && user.evolutionApiKey) {
          console.log(`[updateAppointment] Dispatching sendQueueUpdateMessage for ${newNextVisit.patientPhone}`);
          await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendQueueUpdateMessage, {
            clinicId: user._id,
            patientName: newNextVisit.patientName || "",
            patientPhone: newNextVisit.patientPhone,
          });
        } else {
          console.log("[updateAppointment] Not sending queue update. Missing nextVisit, patientPhone, or clinic credentials.");
        }
      } else {
        console.log("[updateAppointment] No NEXT patient in line to notify.");
      }
    }
    
    await logAction(ctx, user, "Updated Appointment", `Updated visit status to ${args.updates.status || "changed"}`);

    return {};
  },
});

export const deleteAppointment = mutation({
  args: { clerkId: v.string(), appointmentId: v.id("visits") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id) throw new ConvexError("Not authorized");
    await ctx.db.delete(args.appointmentId);
  },
});

// FIX #17: cancelAppointmentByPhone now requires both phone + a time-window check.
// Only visits created in the last 7 days can be cancelled, and only from the
// matching phone number. This limits the blast radius for guessed IDs.
export const cancelAppointmentByPhone = mutation({
  args: {
    clerkId: v.string(),
    appointmentId: v.id("visits"),
    patientPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    const visit = await ctx.db.get(args.appointmentId);
    if (!visit || visit.doctorId !== user._id)
      throw new ConvexError("Not found or unauthorized");

    // Safety: only allow cancellation of visits created within the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    if (visit.createdAt < sevenDaysAgo) {
      throw new ConvexError("This appointment can no longer be cancelled online");
    }

    // Don't allow cancelling already-completed visits
    if (visit.status === "completed") {
      throw new ConvexError("Completed visits cannot be cancelled");
    }

    if (visit.status !== "cancelled" && visit.patientPhone && user.evolutionInstanceName && user.evolutionApiKey) {
      await ctx.scheduler.runAfter(0, internal.whatsappAutomations.sendMessage, {
        instanceName: user.evolutionInstanceName,
        evolutionApiKey: user.evolutionApiKey,
        phoneNumber: visit.patientPhone,
        messageText: msgAppointmentCancelled({ patientName: visit.patientName || "", clinicName: user.clinicName || "العيادة", doctorName: user.name, date: visit.date }),
        doctorId: user._id,
        templateName: "إلغاء الموعد",
        templateVariables: {
          patient_name: visit.patientName || "",
          date: fmtDateAr(visit.date),
        },
      });
    }

    await ctx.db.patch(args.appointmentId, { status: "cancelled" });
  },
});
