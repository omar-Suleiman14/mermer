"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import webpush from "web-push";

export const sendPushNotification = action({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || "mailto:support@mermer.com";

    if (!publicKey || !privateKey) {
      console.warn("VAPID keys not configured, skipping push notification.");
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);

    // Run a query to get the subscriptions
    const subscriptions = await ctx.runQuery(
      api.push.getSubscriptionsForUser,
      { userId: args.userId }
    );

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/",
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
      } catch (error: any) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          console.log("Subscription has expired or is no longer valid:", error);
          removePromises.push(
            ctx.runMutation(api.push.removeSubscription, { id: sub._id })
          );
        } else {
          console.error("Error sending push notification:", error);
        }
      }
    }

    await Promise.all(removePromises);
  },
});
