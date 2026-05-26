import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

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
export type WrappedUser = Doc<"users"> & { actualUserId?: Id<"users">, actualUserName?: string, actualRole?: string, permissions?: string[] };

export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<WrappedUser | null> {
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

  if (!user) return null;

  let resultUser: WrappedUser = { ...user };

  if (user.role === "assistant" && user.clinicId) {
    const doctor = await ctx.db.get(user.clinicId);
    if (!doctor) throw new Error("Doctor not found");
    resultUser = { ...doctor };
  }

  // Inject actual user info for auditing/permissions
  resultUser.actualUserId = user._id;
  resultUser.actualUserName = user.name;
  resultUser.role = user.role || "doctor";
  resultUser.permissions = user.permissions || [];

  return resultUser;
}

/**
 * Same as getAuthUser but throws if user is not found.
 * 
 * If the user is an assistant, this function returns their DOCTOR's user object,
 * so that all existing queries (which check `doctorId === user._id`) continue to work flawlessly.
 * We inject `actualUserId`, `actualUserName`, `actualRole`, and `permissions` into the returned object 
 * to allow checking permissions and logging audit trails.
 */
export async function requireAuthUser(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<WrappedUser> {
  const user = await getAuthUser(ctx, clerkId);
  if (!user) throw new Error("User not found");
  if (user.isBlocked) throw new Error("Account is blocked");
  if (user.isBanned) throw new Error("Your account access has been restricted. Please contact support.");

  return user;
}

/**
 * Validates if the user has a specific permission.
 */
export function hasPermission(user: WrappedUser, permission: string): boolean {
  if (user.role !== "assistant") return true;
  return user.permissions?.includes(permission) ?? false;
}

export function requirePermission(user: WrappedUser, permission: string) {
  if (!hasPermission(user, permission)) {
    throw new Error(`Permission denied: requires ${permission}`);
  }
}

/**
 * Helper to log actions to the audit table.
 */
export async function logAction(
  ctx: MutationCtx,
  user: WrappedUser, // The wrapped user from requireAuthUser
  action: string,
  details: string,
  entityId?: string
) {
  await ctx.db.insert("auditLogs", {
    clinicId: user._id, // Since it's the wrapped doctor object, _id is the clinicId
    userId: user.actualUserId ?? user._id,
    userName: user.actualUserName ?? user.name,
    action,
    details,
    entityId,
    timestamp: Date.now(),
  });
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
