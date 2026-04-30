import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    phone: v.string(),
    clinicName: v.string(),
    whatsappTemplate: v.string(),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  patients: defineTable({
    doctorId: v.id("users"),
    name: v.string(),
    age: v.number(),
    phone: v.string(),
    chronicConditions: v.array(v.string()),
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
    reasonForVisit: v.optional(v.string()),
    prescribedMedications: v.optional(v.array(v.string())),
    analysisRequested: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_patient", ["patientId"])
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_date", ["doctorId", "date"]),

  queue: defineTable({
    doctorId: v.id("users"),
    patientId: v.id("patients"),
    position: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("in-progress"),
      v.literal("done")
    ),
    addedAt: v.number(),
    reminderSent: v.boolean(),
  })
    .index("by_doctor", ["doctorId"])
    .index("by_doctor_status", ["doctorId", "status"]),
});
