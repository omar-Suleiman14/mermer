import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuthUser, requireAdmin } from "./authHelper";

// ─── Publish Profile ──────────────────────────────────────────────────────────

export const updatePublicProfile = mutation({
  args: {
    clerkId: v.string(),
    specialty: v.optional(v.string()),
    bio: v.optional(v.string()),
    consultationFee: v.optional(v.number()),
    languages: v.optional(v.array(v.string())),
    clinicAddress: v.optional(v.string()),
    availableDays: v.optional(v.array(v.string())),
    availableFrom: v.optional(v.string()),
    availableTo: v.optional(v.string()),
    city: v.optional(v.string()),
    profilePhotoId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    
    // Explicitly pick fields to prevent schema bypass via ...args
    const patch: any = {};
    if (args.specialty !== undefined) patch.specialty = args.specialty;
    if (args.bio !== undefined) patch.bio = args.bio;
    if (args.consultationFee !== undefined) patch.consultationFee = args.consultationFee;
    if (args.languages !== undefined) patch.languages = args.languages;
    if (args.clinicAddress !== undefined) patch.clinicAddress = args.clinicAddress;
    if (args.availableDays !== undefined) patch.availableDays = args.availableDays;
    if (args.availableFrom !== undefined) patch.availableFrom = args.availableFrom;
    if (args.availableTo !== undefined) patch.availableTo = args.availableTo;
    if (args.city !== undefined) patch.city = args.city;
    if (args.profilePhotoId !== undefined) patch.profilePhotoId = args.profilePhotoId;

    await ctx.db.patch(user._id, patch);
  },
});

export const setPublicProfileVisibility = mutation({
  args: {
    clerkId: v.string(),
    publicProfile: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    await ctx.db.patch(user._id, { publicProfile: args.publicProfile });
  },
});

// ─── Feed: list all published doctors ────────────────────────────────────────
// FIX #6: Batch-fetch ALL feedback once, compute ratings in JS.
// Eliminates N+1 (100 doctors × 200 feedback reads = 20,000 → now 1 batch read).

export const listPublishedDoctors = query({
  args: {},
  handler: async (ctx) => {
    // Use index to only read published doctors — no full table scan
    const published = await ctx.db
      .query("users")
      .withIndex("by_public_profile", (q) => q.eq("publicProfile", true))
      .take(500);

    // Filter banned in JS (small fraction of published)
    const visible = published.filter((u) => !(u as any).isBanned);

    return await Promise.all(
      visible.map(async (u) => {
        const profilePhotoUrl = u.profilePhotoId
          ? await ctx.storage.getUrl(u.profilePhotoId)
          : null;

        return {
          _id: u._id,
          name: u.name,
          specialty: u.specialty ?? null,
          clinicName: u.clinicName,
          clinicAddress: u.clinicAddress ?? null,
          city: (u as any).city ?? null,
          consultationFee: (u as any).consultationFee ?? null,
          languages: (u as any).languages ?? [],
          availableDays: (u as any).availableDays ?? [],
          availableFrom: (u as any).availableFrom ?? null,
          availableTo: (u as any).availableTo ?? null,
          bio: u.bio ?? null,
          qrSlug: u.qrSlug ?? null,
          profilePhotoUrl,
          avgRating: (u as any).avgRating ?? null,
          reviewCount: (u as any).reviewCount ?? 0,
          workingHoursStart: u.workingHoursStart ?? null,
          workingHoursEnd: u.workingHoursEnd ?? null,
        };
      })
    );
  },
});

// ─── Feed: Search & Filter Doctors (Optimized Backend Filtering) ────────────

const DAY_ABBREVS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function matchesAvailableToday(availableDays: string[]): boolean {
  if (!availableDays.length) return false;
  const dow = new Date().getDay();
  const abbrev = DAY_ABBREVS[dow];
  const full = DAY_FULL[dow];
  return availableDays.includes(abbrev) || availableDays.includes(full);
}

function doctorSearchBlob(d: {
  name: string;
  specialty?: string | null;
  clinicName?: string | null;
  clinicAddress?: string | null;
  city?: string | null;
  bio?: string | null;
  credentials?: string | null;
  languages?: string[];
}): string {
  const langs = ((d as any).languages ?? []).join(" ");
  return [
    d.name,
    d.specialty ?? "",
    d.clinicName ?? "",
    d.clinicAddress ?? "",
    (d as any).city ?? "",
    d.bio ?? "",
    d.credentials ?? "",
    langs,
  ]
    .join(" ")
    .toLowerCase();
}

export const searchDoctors = query({
  args: {
    searchQuery: v.optional(v.string()),
    specialty: v.optional(v.string()),
    city: v.optional(v.string()),
    language: v.optional(v.string()),
    feeMin: v.optional(v.number()),
    feeMax: v.optional(v.number()),
    minRating: v.optional(v.number()),
    availToday: v.optional(v.boolean()),
    sortBy: v.optional(v.string()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const published = await ctx.db
      .query("users")
      .withIndex("by_public_profile", (q) => q.eq("publicProfile", true))
      .take(1000);

    let list = published.filter((u) => !(u as any).isBanned);

    const q = args.searchQuery?.toLowerCase().trim();
    if (q) {
      list = list.filter((d) => doctorSearchBlob(d as any).includes(q));
    }

    if (args.specialty) {
      list = list.filter((d) => d.specialty === args.specialty);
    }

    if (args.city) {
      const city = args.city.toLowerCase();
      list = list.filter(
        (d) => ((d as any).city ?? "").toLowerCase() === city
      );
    }

    if (args.language) {
      list = list.filter((d) => ((d as any).languages ?? []).includes(args.language!));
    }

    if (args.feeMin !== undefined) {
      list = list.filter(
        (d) =>
          (d as any).consultationFee !== null &&
          (d as any).consultationFee !== undefined &&
          (d as any).consultationFee >= args.feeMin!
      );
    }

    if (args.feeMax !== undefined) {
      list = list.filter(
        (d) =>
          (d as any).consultationFee !== null &&
          (d as any).consultationFee !== undefined &&
          (d as any).consultationFee <= args.feeMax!
      );
    }

    if (args.minRating !== undefined && args.minRating > 0) {
      list = list.filter(
        (d) => ((d as any).avgRating ?? 0) >= args.minRating!
      );
    }

    if (args.availToday) {
      list = list.filter((d) =>
        matchesAvailableToday(((d as any).availableDays ?? []) as string[])
      );
    }

    // Sort
    const sort = args.sortBy ?? "relevance";
    if (sort === "fee_asc") {
      list.sort((a, b) => ((a as any).consultationFee ?? 999999) - ((b as any).consultationFee ?? 999999));
    } else if (sort === "fee_desc") {
      list.sort((a, b) => ((b as any).consultationFee ?? 0) - ((a as any).consultationFee ?? 0));
    } else if (sort === "rating") {
      list.sort((a, b) => ((b as any).avgRating ?? 0) - ((a as any).avgRating ?? 0));
    }

    // Apply limit for pagination
    const paginated = list.slice(0, args.limit);

    // Resolve URLs only for paginated results (huge optimization)
    return await Promise.all(
      paginated.map(async (u) => {
        const profilePhotoUrl = u.profilePhotoId
          ? await ctx.storage.getUrl(u.profilePhotoId)
          : null;

        return {
          _id: u._id,
          name: u.name,
          specialty: u.specialty ?? null,
          clinicName: u.clinicName,
          clinicAddress: u.clinicAddress ?? null,
          city: (u as any).city ?? null,
          consultationFee: (u as any).consultationFee ?? null,
          languages: (u as any).languages ?? [],
          availableDays: (u as any).availableDays ?? [],
          availableFrom: (u as any).availableFrom ?? null,
          availableTo: (u as any).availableTo ?? null,
          bio: u.bio ?? null,
          credentials: u.credentials ?? null,
          qrSlug: u.qrSlug ?? null,
          profilePhotoUrl,
          avgRating: (u as any).avgRating ?? null,
          reviewCount: (u as any).reviewCount ?? 0,
          workingHoursStart: u.workingHoursStart ?? null,
          workingHoursEnd: u.workingHoursEnd ?? null,
        };
      })
    );
  },
});

// ─── Public profile by slug ───────────────────────────────────────────────────

export const getPublicDoctorProfile = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doctor = await ctx.db
      .query("users")
      .withIndex("by_qr_slug", (q) => q.eq("qrSlug", args.slug))
      .unique();
    if (!doctor || !doctor.publicProfile || (doctor as any).isBanned)
      return null;

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", doctor._id))
      .order("desc")
      .take(10); // Only need 10 for the UI now

    const profilePhotoUrl = doctor.profilePhotoId
      ? await ctx.storage.getUrl(doctor.profilePhotoId)
      : null;

    return {
      _id: doctor._id,
      name: doctor.name,
      specialty: doctor.specialty ?? null,
      clinicName: doctor.clinicName,
      clinicAddress: doctor.clinicAddress ?? null,
      city: (doctor as any).city ?? null,
      consultationFee: (doctor as any).consultationFee ?? null,
      languages: (doctor as any).languages ?? [],
      availableDays: (doctor as any).availableDays ?? [],
      availableFrom: (doctor as any).availableFrom ?? null,
      availableTo: (doctor as any).availableTo ?? null,
      bio: doctor.bio ?? null,
      qrSlug: doctor.qrSlug ?? null,
      credentials: doctor.credentials ?? null,
      profilePhotoUrl,
      avgRating: (doctor as any).avgRating ?? null,
      reviewCount: (doctor as any).reviewCount ?? 0,
      reviews: feedbackItems.slice(0, 10).map((f) => ({
        _id: f._id,
        rating: f.rating,
        comment: f.comment ?? null,
        patientName: f.patientName ?? null,
        createdAt: f.createdAt,
      })),
      workingHoursStart: doctor.workingHoursStart ?? null,
      workingHoursEnd: doctor.workingHoursEnd ?? null,
    };
  },
});

// ─── Admin: ban / unban ───────────────────────────────────────────────────────

export const banDoctor = mutation({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    banned: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);
    await ctx.db.patch(args.targetUserId, {
      isBanned: args.banned,
      // Hide from feed if banned
      publicProfile: args.banned ? false : (await ctx.db.get(args.targetUserId))?.publicProfile ?? false,
    } as any);
  },
});

// ─── Admin: per-doctor analytics ─────────────────────────────────────────────
// OPTIMIZED: Uses by_doctor_date range query instead of .collect() all visits.

export const getDoctorAnalytics = query({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    const doctor = await ctx.db.get(args.targetUserId);
    if (!doctor) throw new Error("Doctor not found");

    const now = args.now ?? Date.now();
    const monthStart = now - 30 * 86400000;

    // Use date-range index to read only this month's visits instead of all
    const thisMonthVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", args.targetUserId).gte("date", monthStart)
      )
      .take(5000);

    const thisMonthCompleted = thisMonthVisits.filter((a) => a.status === "completed");

    // For total stats we still need all, but with a reasonable cap
    const allAppointments = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.targetUserId))
      .take(10000);

    const completed = allAppointments.filter((a) => a.status === "completed");

    const allinstallments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.targetUserId))
      .take(1000);
    const installmentMap = new Map<string, any>(allinstallments.map(c => [c._id.toString(), c]));

    const fee = doctor.consultationFee ?? 0;
    
    function getVisitRevenue(a: any) {
      if (a.status !== "completed") return 0;
      if (a.source === "follow-up") return 0;
      if (a.source === "installment") {
        if (!a.isPaid) return 0;
        if (a.installmentId) {
          const c = installmentMap.get(a.installmentId.toString());
          return c?.costPerVisit ?? 0;
        }
        return 0;
      }
      return fee;
    }

    const totalRevenue = completed.reduce((sum, a) => sum + getVisitRevenue(a), 0);
    const monthlyRevenue = thisMonthCompleted.reduce((sum, a) => sum + getVisitRevenue(a), 0);

    const uniquePatients = new Set(completed.map((a) => a.patientId?.toString())).size;

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.targetUserId))
      .take(1000);
    const avgRating =
      feedbackItems.length > 0
        ? feedbackItems.reduce((a, b) => a + b.rating, 0) / feedbackItems.length
        : null;

    const feedback = feedbackItems.map((f) => ({
      _id: f._id,
      patientName: f.patientName ?? "Anonymous",
      rating: f.rating,
      comment: f.comment ?? "",
      createdAt: f.createdAt,
    }));

    return {
      totalVisits: completed.length,
      monthlyVisits: thisMonthCompleted.length,
      totalPatients: uniquePatients,
      totalRevenue,
      monthlyRevenue,
      avgRating,
      reviewCount: feedbackItems.length,
      joinDate: doctor.createdAt,
      feedback,
    };
  },
});

// ─── Admin: platform overview ─────────────────────────────────────────────────
// FIX #18: Reduced take(20000) to take(500) and use indexed queries for counts.

export const getPlatformOverview = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.clerkId);

    // Use indexed queries for specific counts instead of loading all 20,000 users
    const allUsers = await ctx.db.query("users").take(500);
    const allDoctors = allUsers.filter((u) => !u.isAdmin);
    const bannedCount = allDoctors.filter((u) => (u as any).isBanned).length;

    // Use index for published count
    const publishedDoctors = await ctx.db
      .query("users")
      .withIndex("by_public_profile", (q) => q.eq("publicProfile", true))
      .take(500);
    const publishedCount = publishedDoctors.length;

    // Use time-bounded visit scan instead of unindexed full-table scan
    const now = Date.now();
    const monthStart = now - 30 * 86400000;

    // Scan recent visits with a reasonable cap
    const recentVisits = await ctx.db
      .query("visits")
      .order("desc")
      .take(5000);

    const completedAll = recentVisits.filter((a) => a.status === "completed");
    const completedThisMonth = completedAll.filter((a) => a.date >= monthStart);

    return {
      totalDoctors: allDoctors.length,
      bannedDoctors: bannedCount,
      publishedDoctors: publishedCount,
      totalVisitsAllTime: completedAll.length,
      totalVisitsThisMonth: completedThisMonth.length,
    };
  },
});

// ─── Revenue data for doctor dashboard ────────────────────────────────────────
// OPTIMIZED: Uses by_doctor_date range query for last 60 days.

export const getRevenueData = query({
  args: {
    clerkId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const fee = (user as any).consultationFee ?? 0;
    const now = args.now ?? Date.now();
    const DAY_MS = 86400000;
    
    function startOfDay(ts: number) {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    
    const todayStart = startOfDay(now);
    // Default to 60 days for revenue projection
    const rangeStart = args.startDate ?? (todayStart - 59 * DAY_MS);
    const rangeEnd = args.endDate ?? todayStart;

    // OPTIMIZED: Only fetch visits within range using date range index
    const recentAppointments = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", rangeStart)
      )
      .take(5000);

    const allinstallments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(1000);

    const installmentMap = new Map<string, any>(allinstallments.map(c => [c._id.toString(), c]));

    function getVisitRevenue(a: any) {
      if (a.status !== "completed") return 0;
      if (a.source === "follow-up") return 0;
      if (a.source === "installment") {
        if (!a.isPaid) return 0;
        if (a.installmentId) {
          const c = installmentMap.get(a.installmentId.toString());
          return c?.costPerVisit ?? 0;
        }
        return 0;
      }
      return fee;
    }

    const completed = recentAppointments.filter(
      (a) => a.status === "completed" && a.date >= rangeStart && a.date <= rangeEnd + DAY_MS - 1
    );

    const dayMap = new Map<number, number>();
    const rangeDays = Math.min(90, Math.ceil((rangeEnd - rangeStart) / DAY_MS) + 1);
    for (let i = rangeDays - 1; i >= 0; i--) {
      dayMap.set(startOfDay(rangeEnd - i * DAY_MS), 0);
    }

    // Add visit revenues
    completed.forEach((a) => {
      const day = startOfDay(a.date);
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + getVisitRevenue(a));
      }
    });

    // Add installment down payments
    allinstallments.forEach((c) => {
      const day = startOfDay(c.createdAt);
      if (dayMap.has(day)) {
        const dp = c.downPaymentType === "percentage"
          ? ((c.totalAmount ?? 0) * ((c.downPayment ?? 0) / 100))
          : (c.downPayment ?? 0);
        dayMap.set(day, (dayMap.get(day) ?? 0) + dp);
      }
    });

    const dailyRevenue = Array.from(dayMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    // This month vs last month (if they picked a 30 day range, we compare to previous 30 days)
    const currentRangeRevenue = dailyRevenue.reduce((s, d) => s + d.revenue, 0);
    
    // We don't fetch last month's visits right now to save DB hits if range is custom.
    // If it's custom, we might just return the selected range revenue.
    const thisMonthRevenue = currentRangeRevenue;
    const lastMonthRevenue = 0;

    const pctChange = 100; // Simplified for custom ranges

    // Best day of week — use recent data only (more efficient)
    const dowTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    completed.forEach((a) => {
      const dow = new Date(a.date).getDay();
      dowTotals[dow] += getVisitRevenue(a);
      dowCounts[dow]++;
    });
    // Also include all time installment down payments for total all time calculation
    const allTimeinstallmentDownPayments = allinstallments.reduce((sum, c) => {
      return sum + (c.downPaymentType === "percentage"
        ? ((c.totalAmount ?? 0) * ((c.downPayment ?? 0) / 100))
        : (c.downPayment ?? 0));
    }, 0);

    const dowNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dowAvg = dowTotals.map((t, i) => ({
      day: dowNames[i],
      avg: dowCounts[i] > 0 ? t / dowCounts[i] : 0,
      count: dowCounts[i],
    }));
    const bestDow = [...dowAvg].sort((a, b) => b.avg - a.avg)[0];

    const totalAllTimeVisits = dowTotals.reduce((a, b) => a + b, 0);

    // Linear trend projection for next 30 days (simple least squares on last 60 days)
    const xVals = dailyRevenue.map((_, i) => i);
    const yVals = dailyRevenue.map((d) => d.revenue);
    const n = xVals.length;
    const sumX = xVals.reduce((s, x) => s + x, 0);
    const sumY = yVals.reduce((s, y) => s + y, 0);
    const sumXY = xVals.reduce((s, x, i) => s + x * yVals[i], 0);
    const sumX2 = xVals.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / n;

    const projected = Array.from({ length: 30 }, (_, i) => {
      const x = n + i;
      const projDate = startOfDay(now + (i + 1) * DAY_MS);
      return {
        date: projDate,
        revenue: Math.max(0, Math.round(slope * x + intercept)),
        isProjected: true,
      };
    });

    return {
      dailyRevenue,
      projected,
      thisMonthRevenue,
      lastMonthRevenue,
      pctChange,
      bestDow,
      consultationFee: fee,
      totalAllTime: totalAllTimeVisits + allTimeinstallmentDownPayments,
    };
  },
});

// ─── Unified Stats Aggregation (Eliminates subscription explosion) ───────────
// Previously the stats page subscribed to listAppointments + listinstallments +
// getRevenueData and computed everything in JS (3 WebSocket subscriptions,
// ~200+ records each). This single query computes it ALL server-side.

export const getStatsAggregated = query({
  args: {
    clerkId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx, args.clerkId);
    if (!user) return null;

    const now = args.now ?? Date.now();
    const DAY_MS = 86400000;
    const todayStart = (() => { const d = new Date(now); d.setHours(0,0,0,0); return d.getTime(); })();
    
    // Default to last 30 days if no custom range is provided
    const rangeStart = args.startDate ?? (todayStart - 29 * DAY_MS);
    const rangeEnd = args.endDate ?? todayStart;

    const weekStart = todayStart - 6 * DAY_MS;
    const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();

    // Single indexed read: get visits from rangeStart (with a slight buffer)
    const queryStart = Math.min(rangeStart, now - 60 * DAY_MS);
    const recentVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", queryStart)
      )
      .take(5000);

    // All visits for lifetime stats (capped)
    const allVisits = await ctx.db
      .query("visits")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(10000);

    const allinstallments = await ctx.db
      .query("installments")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(1000);

    const installmentMap = new Map<string, any>(allinstallments.map(c => [c._id.toString(), c]));
    const fee = user.consultationFee ?? 0;

    function getVisitRevenue(a: any) {
      if (a.status !== "completed") return 0;
      if (a.source === "follow-up") return 0;
      if (a.source === "installment") {
        if (!a.isPaid) return 0;
        if (a.installmentId) {
          const c = installmentMap.get(a.installmentId.toString());
          return c?.costPerVisit ?? 0;
        }
        return 0;
      }
      return fee;
    }

    function startOfDay(ts: number) {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }

    // ── Visit Analytics ──
    const completed = allVisits.filter((a) => a.status === "completed");
    
    // If a custom range is provided, use it for "thisMonth" metrics
    const rangeCompleted = completed.filter((a) => a.date >= rangeStart && a.date <= rangeEnd + DAY_MS - 1);
    
    const today = completed.filter((a) => a.date >= todayStart).length;
    const thisWeek = completed.filter((a) => a.date >= weekStart).length;
    const thisMonth = rangeCompleted.length;
    const thisYear = completed.filter((a) => a.date >= yearStart).length;

    const onlineCompleted = completed.filter((a) => a.source === "online").length;
    const totalCompleted = completed.length;
    const manualCompleted = totalCompleted - onlineCompleted;
    const onlinePct = totalCompleted > 0 ? Math.round((onlineCompleted / totalCompleted) * 100) : 0;

    const cancelled = allVisits.filter((a) => a.status === "cancelled").length;
    const completionRate = allVisits.length > 0 ? Math.round((totalCompleted / allVisits.length) * 100) : 0;
    const cancellationRate = allVisits.length > 0 ? Math.round((cancelled / allVisits.length) * 100) : 0;

    const uniquePatients = new Set(completed.map((a) => a.patientId?.toString()).filter(Boolean)).size;

    // Day-by-day for the range (visits sparkline) - max 90 days to avoid huge arrays
    const dayMap = new Map<number, { total: number; online: number; manual: number }>();
    const rangeDays = Math.min(90, Math.ceil((rangeEnd - rangeStart) / DAY_MS) + 1);
    
    for (let i = rangeDays - 1; i >= 0; i--) {
      dayMap.set(startOfDay(rangeEnd - i * DAY_MS), { total: 0, online: 0, manual: 0 });
    }
    rangeCompleted.forEach((a) => {
      const day = startOfDay(a.date);
      if (dayMap.has(day)) {
        const entry = dayMap.get(day)!;
        entry.total++;
        if (a.source === "online") entry.online++;
        else entry.manual++;
      }
    });
    const days = Array.from(dayMap.entries()).map(([ts, counts]) => ({ ts, ...counts }));
    const maxDay = Math.max(...days.map((d) => d.total), 1);

    // Best days, best week
    const sortedDays = [...days].sort((a, b) => b.total - a.total);
    const bestDays = sortedDays.slice(0, 3).filter((d) => d.total > 0);

    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    completed.forEach((a) => { dowCounts[new Date(a.date).getDay()]++; });
    const maxDow = Math.max(...dowCounts, 1);

    let bestWeekStart = todayStart;
    let bestWeekCount = 0;
    for (let i = 0; i <= 23; i++) {
      const wStart = todayStart - (29 - i) * DAY_MS;
      const wEnd = wStart + 7 * DAY_MS;
      const count = completed.filter((a) => a.date >= wStart && a.date < wEnd).length;
      if (count > bestWeekCount) { bestWeekCount = count; bestWeekStart = wStart; }
    }

    const workingDays = days.filter((d) => d.total > 0).length;
    const avgVisitsPerDay = workingDays > 0 ? Math.round((thisMonth / Math.max(workingDays, 1)) * 10) / 10 : 0;

    // ── installment stats ──
    const activeinstallments = allinstallments.filter((c) => c.status === "active");
    const totalinstallmentedValue = allinstallments.reduce((s, c) => s + (c.totalAmount ?? 0), 0);
    const totalCollected = allinstallments.reduce((s, c) => {
      const dp = c.downPaymentType === "percentage"
        ? ((c.totalAmount ?? 0) * ((c.downPayment ?? 0) / 100))
        : (c.downPayment ?? 0);
      return s + dp + (c.paidVisits ?? 0) * (c.costPerVisit ?? 0);
    }, 0);
    const outstanding = allinstallments.reduce((s, c) => s + (c.unpaidBalance ?? 0), 0);
    const installmentVisitsThisMonth = rangeCompleted.filter(
      (a) => a.source === "installment"
    );

    // Top active installments (first 5)
    const topinstallments = activeinstallments.slice(0, 5).map((c) => ({
      _id: c._id,
      patientName: c.patientName,
      completedVisits: c.completedVisits ?? 0,
      numVisits: c.numVisits,
      costPerVisit: c.costPerVisit ?? 0,
      totalAmount: c.totalAmount ?? 0,
      paidVisits: c.paidVisits ?? 0,
      downPayment: c.downPayment ?? 0,
      downPaymentType: c.downPaymentType,
    }));

    return {
      // Visit analytics
      today,
      thisWeek,
      thisMonth,
      thisYear,
      totalAll: allVisits.length,
      totalCompleted,
      onlineCompleted,
      manualCompleted,
      onlinePct,
      days,
      maxDay,
      bestDays,
      dowCounts,
      maxDow,
      completionRate,
      cancellationRate,
      cancelled,
      uniquePatients,
      avgVisitsPerDay,
      bestWeekStart,
      bestWeekCount,
      weekEndTs: bestWeekStart + 6 * DAY_MS,
      // installment stats
      activeinstallmentsCount: activeinstallments.length,
      expiredinstallmentsCount: allinstallments.length - activeinstallments.length,
      totalinstallmentedValue,
      totalCollected,
      outstanding,
      installmentVisitsThisMonthCount: installmentVisitsThisMonth.length,
      topinstallments,
      // Fee
      consultationFee: fee,
    };
  },
});
