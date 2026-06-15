import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendMessageToAdmin = mutation({
  args: {
    message: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Get the sender
    const sender = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const senderName = sender?.name || "A user";
    const senderPhone = sender?.phone || "";

    // 2. Save the message to the DB
    await ctx.db.insert("supportMessages", {
      userId: sender?._id || ("" as any),
      userName: senderName,
      userPhone: senderPhone,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
    });

    // 3. Get all admins
    const admins = await ctx.db
      .query("users")
      .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
      .collect();

    if (admins.length === 0) {
      console.warn("No admins found to send support message to.");
      return;
    }

    // 4. Send push notifications to all admins
    const bodyText = args.message + (senderPhone ? `\nSender Phone: ${senderPhone}` : "");

    for (const admin of admins) {
      await ctx.scheduler.runAfter(0, internal.pushActions.sendPushNotification, {
        userId: admin._id,
        title: `Support Msg: ${senderName}`,
        body: bodyText,
        url: `/admin?userId=${sender?._id ?? ""}`,
      });
    }
  },
});

export const listSupportMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("supportMessages").order("asc").collect();
  },
});

export const listMessagesForAdminByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("supportMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

export const listUserSupportMessages = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    if (!args.clerkId) return [];
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    if (!user) return [];
    
    return await ctx.db
      .query("supportMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("asc")
      .collect();
  },
});

export const replyToSupportMessage = mutation({
  args: {
    userId: v.id("users"),
    reply: v.string(),
  },
  handler: async (ctx, args) => {
    // Insert a new chat bubble
    await ctx.db.insert("supportMessages", {
      userId: args.userId,
      userName: "Admin",
      message: args.reply,
      fromAdmin: true,
      isRead: true, // admin messages are auto-read for admin
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.pushActions.sendPushNotification, {
      userId: args.userId,
      title: `Support Reply`,
      body: args.reply,
      url: `/dashboard/support`,
    });
  },
});

export const deleteSupportMessage = mutation({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

export const markAsRead = mutation({
  args: { messageId: v.id("supportMessages") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { isRead: true });
  },
});
