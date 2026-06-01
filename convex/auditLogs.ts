import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser, requirePermission } from "./authHelper";

export const getAuditLogs = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // requireAuthUser transparently returns the doctor object for assistants
    // so user._id IS the clinicId
    const user = await requireAuthUser(ctx, args.clerkId);

    // If the caller is an assistant, they can only see logs if they have the analytics.access permission
    if (user.role === "assistant") {
      requirePermission(user, "analytics.access");
    }

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_clinic", (q) => q.eq("clinicId", user._id))
      .order("desc")
      .take(args.limit ?? 100);

    return logs;
  },
});
