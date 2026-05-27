"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import webpush from "web-push";

function safeNotificationUrl(url: string | undefined) {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/";
  return url.slice(0, 512);
}

function truncate(value: string, maxLength: number) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

function getStatusCode(error: unknown) {
  return typeof error === "object" && error !== null && "statusCode" in error
    ? (error as { statusCode?: unknown }).statusCode
    : undefined;
}

export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:support@mermereg.com";

    if (!publicKey || !privateKey) {
      console.warn("VAPID keys not configured, skipping push notification.");
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Run a query to get the subscriptions
    const subscriptions = await ctx.runQuery(
      internal.push.getSubscriptionsForUser,
      { userId: args.userId }
    );

    const payload = JSON.stringify({
      title: truncate(args.title, 80) || "mermer",
      body: truncate(args.body, 240),
      url: safeNotificationUrl(args.url),
    });

    const removePromises = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: unknown) {
        const statusCode = getStatusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          console.log(`Subscription ${sub._id} has expired (410/404). Removing.`);
          removePromises.push(
            ctx.runMutation(internal.push.removeSubscription, { id: sub._id })
          );
        } else {
          console.error("Error sending push notification:", error);
        }
      }
    }

    await Promise.all(removePromises);
  },
});
