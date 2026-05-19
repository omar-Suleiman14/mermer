import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate a pre-signed upload URL for Convex storage
// SECURITY: Require authentication — only logged-in users can upload files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated: must be logged in to upload files");
    return await ctx.storage.generateUploadUrl();
  },
});

// Get a URL for a stored file
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a stored file — requires authentication
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    await ctx.storage.delete(args.storageId);
  },
});
