"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import QRCode from "qrcode";

/**
 * generateAndStoreFeedbackQr
 *
 * Generates a QR code image for the doctor's feedback page, uploads it to
 * Convex file storage, and saves the storage ID on the user record. Subsequent
 * calls return the already-stored URL without re-generating the image.
 *
 * Must run in Node.js (uses the `qrcode` npm library).
 */
export const generateAndStoreFeedbackQr = action({
  args: { clerkId: v.string(), baseUrl: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    const info = await ctx.runQuery(internal.feedback._getUserQrInfo, {
      clerkId: args.clerkId,
    });
    if (!info || !info.qrSlug) return null;

    // Already stored — return the signed URL
    if (info.feedbackQrStorageId) {
      return await ctx.storage.getUrl(info.feedbackQrStorageId);
    }

    // Generate QR PNG via the qrcode library
    const feedbackUrl = `${args.baseUrl}/feedback/${info.qrSlug}`;
    const pngBuffer: Buffer = await QRCode.toBuffer(feedbackUrl, {
      width: 400,
      margin: 2,
      color: { dark: "#1a1916", light: "#ffffff" },
    });

    // Upload to Convex storage
    const blob = new Blob([new Uint8Array(pngBuffer)], { type: "image/png" });
    const storageId = await ctx.storage.store(blob);

    // Persist the storageId on the user record
    await ctx.runMutation(internal.feedback._saveFeedbackQrStorageId, {
      clerkId: args.clerkId,
      storageId,
    });

    return await ctx.storage.getUrl(storageId);
  },
});
