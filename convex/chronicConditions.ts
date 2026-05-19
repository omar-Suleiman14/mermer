import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, requireAuthUser } from "./authHelper";

// Default conditions that are always available
const DEFAULTS = [
  "Diabetes Type 1", "Diabetes Type 2", "Hypertension",
  "Asthma", "COPD", "Coronary Artery Disease", "Heart Failure",
  "Chronic Kidney Disease", "Hypothyroidism", "Hyperthyroidism",
  "Rheumatoid Arthritis", "Osteoarthritis", "Epilepsy",
  "Depression", "Anxiety", "Hepatitis B", "Hepatitis C",
  "Anemia", "Gout", "Osteoporosis", "Psoriasis", "Eczema",
  "Migraine", "Irritable Bowel Syndrome", "Celiac Disease",
  "Crohn's Disease", "Ulcerative Colitis", "Lupus",
  "Multiple Sclerosis", "Parkinson's Disease",
];

export const listOptions = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx, args.clerkId);
    if (!user) return DEFAULTS;

    const custom = await ctx.db
      .query("chronicConditionOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    const customNames = custom.map((c) => c.name);
    // Merge defaults + custom, deduplicate
    const merged = [...new Set([...DEFAULTS, ...customNames])];
    return merged.sort();
  },
});

export const addOption = mutation({
  args: { clerkId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);

    const trimmed = args.name.trim();
    if (!trimmed) return;

    // Check if already exists
    const existing = await ctx.db
      .query("chronicConditionOptions")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .collect();

    if (
      existing.some((e) => e.name.toLowerCase() === trimmed.toLowerCase()) ||
      DEFAULTS.some((d) => d.toLowerCase() === trimmed.toLowerCase())
    ) {
      return; // Already exists
    }

    await ctx.db.insert("chronicConditionOptions", {
      doctorId: user._id,
      name: trimmed,
    });
  },
});
