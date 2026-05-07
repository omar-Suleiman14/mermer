import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    clinicName: v.string(),
    whatsappTemplate: v.string(),
    createdAt: v.number(),

    // Tier & admin
    tier: v.optional(v.union(v.literal("free"), v.literal("premium"))),
    isAdmin: v.optional(v.boolean()),

    // Doctor public profile
    qrSlug: v.optional(v.string()),           // unique slug for QR code + feedback URL
    specialty: v.optional(v.string()),
    credentials: v.optional(v.string()),       // e.g. "MD, FRCS"
    clinicAddress: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    workingHoursStart: v.optional(v.number()), // hour integer 0-23 (e.g. 9 = 9am)
    workingHoursEnd: v.optional(v.number()),   // hour integer 0-23 (e.g. 17 = 5pm)
    publicProfile: v.optional(v.boolean()),    // whether profile is indexable
    bio: v.optional(v.string()),               // short doctor bio

    // Doctor profile photo
    profilePhotoId: v.optional(v.id("_storage")),

    // Stored feedback QR code (generated once, stored in Convex storage)
    feedbackQrStorageId: v.optional(v.id("_storage")),

    // Prescription template fields
    logoStorageId: v.optional(v.id("_storage")),
    prescriptionDoctorName: v.optional(v.string()),
    prescriptionSpecialty: v.optional(v.string()),
    prescriptionCredentials: v.optional(v.string()),
    prescriptionClinicName: v.optional(v.string()),
    prescriptionAddress: v.optional(v.string()),
    prescriptionPhone: v.optional(v.string()),
    prescriptionWorkingHours: v.optional(v.string()),

    // Queue settings
    slotDurationMinutes: v.optional(v.number()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_qr_slug", ["qrSlug"]),

  patients: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .searchIndex("search_patients", {
      searchField: "name",
      filterFields: ["doctorId"],
    }),

  visits: defineTable({
    patientId: v.id("patients"),
    doctorId: v.id("users"),
    date: v.number(),
    // How this visit was created: "manual" (doctor added directly) or "appointment" (patient booked online)
    source: v.optional(v.union(v.literal("manual"), v.literal("appointment"))),
    appointmentId: v.optional(v.id("appointments")), // linked appointment if source="appointment"
    reasonForVisit: v.optional(v.string()),
    prescribedMedications: v.optional(v.array(v.string())),
    analysisRequested: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdAt: v.number(),

    // Prescription & documents
    prescriptionImageId: v.optional(v.id("_storage")),   // raw photo
    prescriptionPdfId: v.optional(v.id("_storage")),     // processed PDF
    documentIds: v.optional(v.array(v.id("_storage"))),  // extra docs
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_date", ["doctorId", "date"]),

  queue: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("patients"),
    // The calendar date this queue entry belongs to (start-of-day timestamp in UTC)
    queueDate: v.optional(v.number()),
    position: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("in-progress"),
      v.literal("done")
    ),
    addedAt: v.number(),
    scheduledTime: v.optional(v.number()),      // timestamp for scheduled slot
    reminderSent: v.boolean(),
    appointmentId: v.optional(v.id("appointments")), // linked online booking
    visitId: v.optional(v.id("visits")),             // visit created when marked done
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_status", ["doctorId", "status"])
    .index("by_doctor_date", ["doctorId", "queueDate"]),

  feedback: defineTable({
    doctorId: v.id("users"),
    rating: v.number(),                         // 1–5
    comment: v.optional(v.string()),
    patientName: v.optional(v.string()),        // anonymous if omitted
    createdAt: v.number(),
  }).index("by_doctor", ["doctorId"]),

  appointments: defineTable({
    doctorId: v.id("users"),
    patientId: v.optional(v.id("patients")),    // New: Link to patient profile
    patientName: v.string(),
    patientPhone: v.string(),
    patientAge: v.optional(v.number()),
    date: v.number(),                           // scheduled timestamp
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")                    // New: for done visits
    ),
    source: v.optional(v.union(v.literal("online"), v.literal("manual"))), // New: origin
    notes: v.optional(v.string()),              // New: visit notes
    prescriptionImageId: v.optional(v.id("_storage")), // New: raw photo
    documentIds: v.optional(v.array(v.id("_storage"))), // New: extra docs
    
    // Set to true once a patient record + queue entry have been created (legacy)
    processedToQueue: v.optional(v.boolean()),
    whatsappConfirmed: v.optional(v.boolean()), // true=YES, false=NO, undefined=no reply
    reminderSentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_date", ["doctorId", "date"]),
});
