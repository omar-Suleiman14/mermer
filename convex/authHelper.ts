import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

/**
 * Resolve the authenticated user from server-side JWT (via ctx.auth)
 * and verify it matches the client-provided clerkId.
 *
 * This provides defense-in-depth: even if an attacker sends a
 * forged clerkId from the client, the server-side identity check
 * will reject the mismatch.
 *
 * For public endpoints that don't require auth, don't use this helper.
 */
export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<Doc<"users"> | null> {
  // Server-side JWT identity check
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  if (identity.subject !== clerkId) {
    throw new Error("Unauthorized: identity mismatch");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  return user;
}

/**
 * Same as getAuthUser but throws if user is not found.
 */
export async function requireAuthUser(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<Doc<"users">> {
  const user = await getAuthUser(ctx, clerkId);
  if (!user) throw new Error("User not found");
  if (user.isBlocked) throw new Error("Account is blocked");
  if (user.isBanned) throw new Error("Account is under contract");
  return user;
}

/**
 * Require the authenticated user to be an admin.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<Doc<"users">> {
  const user = await requireAuthUser(ctx, clerkId);
  if (!user.isAdmin) throw new Error("Unauthorized");
  return user;
}
