import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { getAuthUser, requireAuthUser } from "./authHelper";

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
  args: { storageId: v.id("_storage"), clerkId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // If clerkId is provided, enforce auth. (Some files might be public, but usually we resolve those server-side)
    if (args.clerkId) {
      await getAuthUser(ctx, args.clerkId);
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a stored file — requires authentication
export const deleteFile = mutation({
  args: { storageId: v.id("_storage"), clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx, args.clerkId);
    await ctx.storage.delete(args.storageId);
  },
});
