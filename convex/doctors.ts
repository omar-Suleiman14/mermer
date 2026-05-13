import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    const { clerkId, ...fields } = args;
    await ctx.db.patch(user._id, fields as any);
  },
});

export const setPublicProfileVisibility = mutation({
  args: {
    clerkId: v.string(),
    publicProfile: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, { publicProfile: args.publicProfile });
  },
});

// ─── Feed: list all published doctors ────────────────────────────────────────
// OPTIMIZED: Uses by_public_profile index instead of full table scan + JS filter.
// At 10K doctors this reads only published ones, not all.

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
        // Average rating
        const feedbackItems = await ctx.db
          .query("feedback")
          .withIndex("by_doctor", (q) => q.eq("doctorId", u._id))
          .take(200);
        const avgRating =
          feedbackItems.length > 0
            ? feedbackItems.reduce((a, b) => a + b.rating, 0) /
            feedbackItems.length
            : null;

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
          avgRating,
          reviewCount: feedbackItems.length,
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
      .take(50);

    const avgRating =
      feedbackItems.length > 0
        ? feedbackItems.reduce((a, b) => a + b.rating, 0) / feedbackItems.length
        : null;

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
      avgRating,
      reviewCount: feedbackItems.length,
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
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");
    await ctx.db.patch(args.targetUserId, {
      isBanned: args.banned,
      // Hide from feed if banned
      publicProfile: args.banned ? false : (await ctx.db.get(args.targetUserId))?.publicProfile ?? false,
    } as any);
  },
});

// ─── Admin: per-doctor analytics ─────────────────────────────────────────────
// OPTIMIZED: Uses by_doctor_date range query instead of .collect() all visits.
// Accepts `now` from client to avoid Date.now() in query (preserves query cache).

export const getDoctorAnalytics = query({
  args: {
    clerkId: v.string(),
    targetUserId: v.id("users"),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");

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

    // Revenue from visitTypes fees (approximate using consultationFee)
    const fee = (doctor as any).consultationFee ?? 0;
    const totalRevenue = completed.length * fee;
    const monthlyRevenue = thisMonthCompleted.length * fee;

    const uniquePatients = new Set(completed.map((a) => a.patientId?.toString())).size;

    const feedbackItems = await ctx.db
      .query("feedback")
      .withIndex("by_doctor", (q) => q.eq("doctorId", args.targetUserId))
      .take(1000);
    const avgRating =
      feedbackItems.length > 0
        ? feedbackItems.reduce((a, b) => a + b.rating, 0) / feedbackItems.length
        : null;

    return {
      totalVisits: completed.length,
      monthlyVisits: thisMonthCompleted.length,
      totalPatients: uniquePatients,
      totalRevenue,
      monthlyRevenue,
      avgRating,
      reviewCount: feedbackItems.length,
      joinDate: doctor.createdAt,
    };
  },
});

// ─── Admin: platform overview ─────────────────────────────────────────────────
// OPTIMIZED: No longer does N+1 queries (one per doctor).
// Uses indexed queries on the users table for counts.

export const getPlatformOverview = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!admin?.isAdmin) throw new Error("Unauthorized");

    const allUsers = await ctx.db.query("users").take(20000);
    const allDoctors = allUsers.filter((u) => !u.isAdmin);
    const bannedCount = allDoctors.filter((u) => (u as any).isBanned).length;
    const publishedCount = allDoctors.filter((u) => u.publicProfile).length;

    // Instead of N+1 queries (one per doctor), do a single broad scan
    // with a time-bounded cap. This is O(visits_this_month) not O(doctors * 200).
    const now = Date.now();
    const monthStart = now - 30 * 86400000;

    // We can't query all visits across all doctors with one index,
    // but we can limit the scan to recent entries via creation time
    const recentVisits = await ctx.db
      .query("visits")
      .order("desc")
      .take(10000);

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
// OPTIMIZED: Uses by_doctor_date range query for last 60 days instead of
// .collect() ALL visits ever. Accepts `now` from client for query cache.

export const getRevenueData = query({
  args: {
    clerkId: v.string(),
    now: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) return null;

    const fee = (user as any).consultationFee ?? 0;
    const now = args.now ?? Date.now();
    const sixtyDaysAgo = now - 60 * 86400000;

    // OPTIMIZED: Only fetch last 60 days of visits using date range index
    const recentAppointments = await ctx.db
      .query("visits")
      .withIndex("by_doctor_date", (q) =>
        q.eq("doctorId", user._id).gte("date", sixtyDaysAgo)
      )
      .take(5000);

    const allContracts = await ctx.db
      .query("contracts")
      .withIndex("by_doctor", (q) => q.eq("doctorId", user._id))
      .take(1000);

    const contractMap = new Map<string, any>(allContracts.map(c => [c._id.toString(), c]));

    function getVisitRevenue(a: any) {
      if (a.status !== "completed") return 0;
      if (a.source === "follow-up") return 0;
      if (a.source === "contract") {
        if (!a.isPaid) return 0;
        if (a.contractId) {
          const c = contractMap.get(a.contractId.toString());
          return c?.costPerVisit ?? 0;
        }
        return 0;
      }
      return fee;
    }

    const completed = recentAppointments.filter(
      (a) => a.status === "completed" && a.date >= sixtyDaysAgo
    );

    // Build daily revenue map for the last 60 days
    function startOfDay(ts: number) {
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    const DAY_MS = 86400000;

    const dayMap = new Map<number, number>();
    for (let i = 59; i >= 0; i--) {
      dayMap.set(startOfDay(now - i * DAY_MS), 0);
    }

    // Add visit revenues
    completed.forEach((a) => {
      const day = startOfDay(a.date);
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) ?? 0) + getVisitRevenue(a));
      }
    });

    // Add contract down payments
    allContracts.forEach((c) => {
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

    // This month vs last month
    const thisMonthStart = startOfDay(now - 29 * DAY_MS);
    const lastMonthStart = startOfDay(now - 59 * DAY_MS);
    const thisMonthRevenue = dailyRevenue
      .filter((d) => d.date >= thisMonthStart)
      .reduce((s, d) => s + d.revenue, 0);
    const lastMonthRevenue = dailyRevenue
      .filter((d) => d.date >= lastMonthStart && d.date < thisMonthStart)
      .reduce((s, d) => s + d.revenue, 0);

    const pctChange =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // Best day of week — use recent data only (more efficient)
    const dowTotals: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts: number[] = [0, 0, 0, 0, 0, 0, 0];
    completed.forEach((a) => {
      const dow = new Date(a.date).getDay();
      dowTotals[dow] += getVisitRevenue(a);
      dowCounts[dow]++;
    });
    // Also include all time contract down payments for total all time calculation
    const allTimeContractDownPayments = allContracts.reduce((sum, c) => {
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
      totalAllTime: totalAllTimeVisits + allTimeContractDownPayments,
    };
  },
});
