import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

import { requireAuthUser } from "./authHelper";

async function assertStorageOwnership(
  ctx: QueryCtx | MutationCtx,
  clerkId: string,
  storageId: Id<"_storage">
) {
  const user = await requireAuthUser(ctx, clerkId);

  if (
    user.profilePhotoId === storageId ||
    user.logoStorageId === storageId ||
    user.feedbackQrStorageId === storageId
  ) {
    return;
  }

  const visits = await ctx.db
    .query("visits")
    .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
    .take(5000);

  if (
    visits.some(
      (visit) =>
        visit.prescriptionImageId === storageId ||
        visit.prescriptionPdfId === storageId ||
        visit.documentIds?.includes(storageId)
    )
  ) {
    return;
  }

  const installments = await ctx.db
    .query("installments")
    .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
    .take(5000);

  if (installments.some((installment) => installment.installmentFileId === storageId)) {
    return;
  }

  throw new ConvexError("File not found or unauthorized");
}

// Generate a pre-signed upload URL for Convex storage
// SECURITY: Require authentication — only logged-in users can upload files
export const generateUploadUrl = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx, args.clerkId);
    return await ctx.storage.generateUploadUrl();
  },
});

// Get a URL for a stored file
export const getFileUrl = query({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await assertStorageOwnership(ctx, args.clerkId, args.storageId);
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a stored file — requires authentication
export const deleteFile = mutation({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await assertStorageOwnership(ctx, args.clerkId, args.storageId);
    await ctx.storage.delete(args.storageId);
  },
});
