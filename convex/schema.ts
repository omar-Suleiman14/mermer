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

    isAdmin: v.optional(v.boolean()),
    tier: v.optional(v.string()), // Kept to allow existing records to pass validation

    // Staff / Assistant fields
    role: v.optional(v.union(v.literal("doctor"), v.literal("assistant"))),
    clinicId: v.optional(v.id("users")), // For assistants, this points to their doctor
    permissions: v.optional(v.array(v.string())), // e.g. ["manage_queue", "manage_patients", "manage_settings", "manage_history", "manage_analytics"]

    // Doctor public profile
    qrSlug: v.optional(v.string()),
    specialty: v.optional(v.string()),
    credentials: v.optional(v.string()),
    clinicAddress: v.optional(v.string()),
    clinicAddressLink: v.optional(v.string()),
    city: v.optional(v.string()),
    workingHours: v.optional(v.string()),
    workingHoursStart: v.optional(v.number()),
    workingHoursEnd: v.optional(v.number()),
    publicProfile: v.optional(v.boolean()),
    bio: v.optional(v.string()),
    consultationFee: v.optional(v.number()),
    languages: v.optional(v.array(v.string())),
    availableDays: v.optional(v.array(v.string())),
    availableFrom: v.optional(v.string()),
    availableTo: v.optional(v.string()),

    timezoneOffset: v.optional(v.number()),

    // Admin controls
    isBanned: v.optional(v.boolean()),
    isBlocked: v.optional(v.boolean()),
    
    // Legacy fields (kept only to prevent schema validation crashes on old records)
    telegramId: v.optional(v.string()),

    // Doctor profile photo
    profilePhotoId: v.optional(v.id("_storage")),
    profilePhotoUrl: v.optional(v.string()),

    // Denormalized stats for performance (prevents N+1 in feed)
    avgRating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),

    // Stored feedback QR code
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
    showClinicLocationOnRx: v.optional(v.boolean()),
    clinicScreenShowNames: v.optional(v.boolean()), // Clinic screen: show patient names (default: false = show numbers)

    // Clinical Preferences
    enableDiagnosis: v.optional(v.boolean()),
    enableMeasurements: v.optional(v.boolean()),
    enableVitals: v.optional(v.boolean()),
    enableNotes: v.optional(v.boolean()),
    enablePrescription: v.optional(v.boolean()),
    enableDashboardAnalytics: v.optional(v.boolean()), // Legacy field
    slotDurationMinutes: v.optional(v.number()),

    // installment defaults
    installmentDefaultDownPayment: v.optional(v.number()),
    installmentDefaultDownPaymentType: v.optional(v.union(v.literal("fixed"), v.literal("percentage"))),
    installmentDefaultCostPerVisit: v.optional(v.number()),
    installmentDefaultVisitFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly"),
        v.literal("custom"),
        v.literal("manual")
      )
    ),
    installmentDefaultDurationDays: v.optional(v.number()),

    queueDisplayToken: v.optional(v.string()),

    // Evolution API Integration
    evolutionInstanceName: v.optional(v.string()),
    evolutionApiKey: v.optional(v.string()),
    evolutionStatus: v.optional(v.string()), // disconnected, connecting, open
    isEvolutionActive: v.optional(v.boolean()),
    evolutionConnectedPhone: v.optional(v.string()),
    blockedDates: v.optional(v.array(v.number())),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_qr_slug", ["qrSlug"])
    .index("by_public_profile", ["publicProfile"])
    .index("by_isAdmin", ["isAdmin"])
    .index("by_clinic_id", ["clinicId"])
    .index("by_evolution_active", ["isEvolutionActive"]),

  invitations: defineTable({
    doctorId: v.id("users"),
    email: v.string(),
    name: v.string(), // What the doctor calls them
    role: v.string(), // Role name assigned by doctor
    permissions: v.array(v.string()),
    status: v.union(v.literal("pending"), v.literal("accepted")),
    createdAt: v.number(),
  }).index("by_email", ["email"]).index("by_doctor", ["doctorId"]),

  auditLogs: defineTable({
    clinicId: v.id("users"),
    userId: v.id("users"), // the user who performed the action
    userName: v.string(), // store denormalized name so we don't have to join
    action: v.string(),
    entityId: v.optional(v.string()),
    details: v.string(),
    timestamp: v.number(),
  }).index("by_clinic", ["clinicId"]).index("by_clinic_timestamp", ["clinicId", "timestamp"]),

  patients: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
    patientType: v.optional(v.string()),
    notes: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_phone", ["doctorId", "phone"])
    .searchIndex("search_patients", {
      searchField: "name",
      filterFields: ["doctorId"],
    }),

  // ── VISITS — single source of truth for all patient encounters ────────────
  visits: defineTable({
    patientId: v.id("patients"),
    doctorId: v.id("users"),
    date: v.number(),
    queueNumber: v.optional(v.number()),

    // Where the visit came from
    source: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("online"),
        v.literal("installment"),
        v.literal("follow-up")
      )
    ),

    // Status
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("no-show"),
        v.literal("rescheduled")
      )
    ),

    // Denormalized patient info for schedule display (avoids extra lookups)
    patientName: v.optional(v.string()),
    patientPhone: v.optional(v.string()),
    patientAge: v.optional(v.number()),

    // Links
    installmentId: v.optional(v.id("installments")),
    
    // Who created/modified this visit (for history display)
    actionBy: v.optional(v.string()),

    // Payment (for installment visits)
    isPaid: v.optional(v.boolean()),

    // Clinical data
    reasonForVisit: v.optional(v.string()),
    prescribedMedications: v.optional(
      v.array(
        v.union(
          v.string(),
          v.object({
            name: v.string(),
            frequency: v.optional(v.string()),
            notes: v.optional(v.string()),
          })
        )
      )
    ),
    analysisRequested: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    measurements: v.optional(v.string()),
    vitals: v.optional(v.string()),

    // Prescription & documents
    prescriptionImageId: v.optional(v.id("_storage")),
    prescriptionPdfId: v.optional(v.id("_storage")),
    documentIds: v.optional(v.array(v.id("_storage"))),

    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_date", ["doctorId", "date"])
    .index("by_doctor_phone", ["doctorId", "patientPhone"])
    .index("by_installment", ["installmentId"]),

  // ── QUEUE (waiting room) ──────────────────────────────────────────────────
  queue: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("patients"),
    queueDate: v.optional(v.number()),
    position: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("in-progress"),
      v.literal("done")
    ),
    addedAt: v.number(),
    scheduledTime: v.optional(v.number()),
    reminderSent: v.boolean(),
    visitId: v.optional(v.id("visits")),
    // Denormalized patient info (avoids N reads per queue render)
    patientName: v.optional(v.string()),
    patientPhone: v.optional(v.string()),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_status", ["doctorId", "status"])
    .index("by_doctor_date", ["doctorId", "queueDate"]),

  feedback: defineTable({
    doctorId: v.id("users"),
    rating: v.number(),
    comment: v.optional(v.string()),
    patientName: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_doctor", ["doctorId"]),

  // ── installments ─────────────────────────────────────────────────────────────
  installments: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("patients"),
    patientName: v.string(),

    status: v.union(
      v.literal("active"),
      v.literal("expired")
    ),

    // Financial
    totalAmount: v.optional(v.number()),
    downPayment: v.optional(v.number()),
    downPaymentType: v.optional(v.union(v.literal("fixed"), v.literal("percentage"))),
    costPerVisit: v.optional(v.number()),
    numVisits: v.optional(v.number()),

    // Payment tracking (updated as visits are completed)
    completedVisits: v.optional(v.number()),  // how many visits done so far
    paidVisits: v.optional(v.number()),        // how many visits marked as paid
    unpaidBalance: v.optional(v.number()),     // accumulated unpaid amount

    // Visit scheduling
    visitFrequency: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("bi-weekly"),
        v.literal("monthly"),
        v.literal("custom"),
        v.literal("manual")
      )
    ),
    customIntervalDays: v.optional(v.number()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    durationDays: v.optional(v.number()),

    nextVisitDate: v.optional(v.number()),

    // Uploaded installment file
    installmentFileId: v.optional(v.id("_storage")),
    installmentFileName: v.optional(v.string()),

    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_doctor_status", ["doctorId", "status"]),

  // ── FOLLOW-UPS ────────────────────────────────────────────────────────────
  followUps: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("patients"),
    visitId: v.optional(v.id("visits")),
    parentVisitId: v.optional(v.id("visits")),
    patientName: v.string(),

    followUpDate: v.number(),
    followUpTime: v.string(),
    type: v.union(
      v.literal("in-person"),
      v.literal("call"),
      v.literal("whatsapp")
    ),
    note: v.optional(v.string()),

    status: v.union(v.literal("scheduled"), v.literal("done"), v.literal("cancelled")),
    createdAt: v.number(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_patient", ["patientId"])
    .index("by_visit", ["visitId"])
    .index("by_parent_visit", ["parentVisitId"])
    .index("by_doctor_date", ["doctorId", "followUpDate"]),

  // ── PUSH SUBSCRIPTIONS ───────────────────────────────────────────────────
  pushSubscriptions: defineTable({
    userId: v.id("users"), // The doctor's user ID
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ── MESSAGE TEMPLATES ─────────────────────────────────────────────────────
  messageTemplates: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_doctor", ["doctorId"]),

  // ── CHRONIC CONDITION OPTIONS ──────────────────────────────────────────────
  chronicConditionOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  })
    .index("by_doctor", ["doctorId"]),

  // ── PATIENT TYPE OPTIONS ───────────────────────────────────────────────────
  patientTypeOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  })
    .index("by_doctor", ["doctorId"]),

  // ── CLINICAL OPTIONS (MEDICATIONS, FREQUENCIES, NOTES) ───────────────────
  medicationOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  medicationFrequencyOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  medicationNoteOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  diagnosisOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  measurementOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  vitalsOptions: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
  }).index("by_doctor", ["doctorId"]),

  supportMessages: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userPhone: v.optional(v.string()),
    message: v.string(),
    reply: v.optional(v.string()), // Legacy
    fromAdmin: v.optional(v.boolean()), // New chat bubble format
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_isRead", ["isRead"]),

  messageLogs: defineTable({
    doctorId: v.id("users"),
    patientPhone: v.string(),
    messageText: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_doctor", ["doctorId"]).index("by_patient_phone", ["patientPhone"]),

});
