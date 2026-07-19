import {
  offlineDb,
  type SyncQueueEntry,
  type SyncOperation,
  type SyncEntryStatus,
} from "./offlineDb";

// ─── Enqueue Operations ─────────────────────────────────────────────────────

/**
 * Add an operation to the sync queue.
 * Returns the idempotency key for tracking.
 */
import { isLocalId } from "./idRemap";

export async function enqueueSyncOp(opts: {
  table: SyncQueueEntry["table"];
  operation: SyncOperation;
  localId: string;
  serverId: string | null;
  payload: Record<string, unknown>;
  ownerClerkId: string;
  dependsOnIdempotencyKey?: string;
}): Promise<string> {
  const idempotencyKey = crypto.randomUUID();
  let dependsOnIdempotencyKey = opts.dependsOnIdempotencyKey;

  // Auto-detect dependencies if not explicitly provided
  if (!dependsOnIdempotencyKey) {
    const foreignKeyMap: Record<string, string> = {
      patientId: "patients",
      visitId: "visits",
      appointmentId: "visits",
      appointmentId1: "visits",
      appointmentId2: "visits",
      parentVisitId: "visits",
      installmentId: "installments",
    };

    for (const [field, sourceTable] of Object.entries(foreignKeyMap)) {
      const val = opts.payload[field];
      if (typeof val === "string" && isLocalId(val)) {
        // Find the operation that created this local ID
        const dependency = await offlineDb.syncQueue
          .where("table")
          .equals(sourceTable)
          .filter(
            (e) =>
              e.ownerClerkId === opts.ownerClerkId &&
              e.localId === val &&
              (e.operation === "create" || e.operation === "addManualAppointment"),
          )
          .first();

        if (dependency && dependency.status !== "completed") {
          dependsOnIdempotencyKey = dependency.idempotencyKey;
          break; // Usually one dependency is enough as they form a chain
        }
      }
    }
  }

  await offlineDb.syncQueue.add({
    idempotencyKey,
    table: opts.table,
    operation: opts.operation,
    localId: opts.localId,
    serverId: opts.serverId,
    payload: opts.payload,
    ownerClerkId: opts.ownerClerkId,
    createdAt: Date.now(),
    status: "pending",
    retryCount: 0,
    dependsOnIdempotencyKey,
  });

  return idempotencyKey;
}

// ─── Query Operations ───────────────────────────────────────────────────────

/** Get pending entries in FIFO order (limited batch) */
export async function getPendingEntries(ownerClerkId: string, limit = 10): Promise<SyncQueueEntry[]> {
  const entries = await offlineDb.syncQueue
    .where("status")
    .equals("pending")
    .filter((entry) => entry.ownerClerkId === ownerClerkId)
    .limit(limit)
    .toArray();
    
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

/** Get count of entries still waiting to sync (excludes permanently failed entries) */
export async function getPendingCount(ownerClerkId: string): Promise<number> {
  const pending = await offlineDb.syncQueue
    .where("status")
    .anyOf(["pending", "in-flight"])
    .filter((entry) => entry.ownerClerkId === ownerClerkId)
    .count();
  return pending;
}

/** Returns permanently failed operations for the active user. */
export async function getFailedCount(ownerClerkId: string): Promise<number> {
  return offlineDb.syncQueue
    .where("status")
    .equals("failed")
    .filter((entry) => entry.ownerClerkId === ownerClerkId)
    .count();
}

/** Whether another queued operation still targets this local record. */
export async function hasOutstandingEntriesForRecord(
  ownerClerkId: string,
  table: string,
  localId: string,
  excludingId?: number,
): Promise<boolean> {
  const entries = await offlineDb.syncQueue
    .where("table")
    .equals(table)
    .filter((entry) =>
      entry.ownerClerkId === ownerClerkId &&
      entry.localId === localId &&
      entry.id !== excludingId &&
      (entry.status === "pending" || entry.status === "in-flight")
    )
    .toArray();
  return entries.length > 0;
}

/** Get all entries for a specific local record */
export async function getEntriesForRecord(
  table: string,
  localId: string
): Promise<SyncQueueEntry[]> {
  return offlineDb.syncQueue
    .where("table")
    .equals(table)
    .filter((entry) => entry.localId === localId)
    .sortBy("createdAt");
}

/** Check if a specific idempotency key exists */
export async function hasIdempotencyKey(key: string): Promise<boolean> {
  const entry = await offlineDb.syncQueue
    .where("idempotencyKey")
    .equals(key)
    .first();
  return !!entry;
}

// ─── Status Transitions ─────────────────────────────────────────────────────

/** Mark an entry as in-flight (being synced) */
export async function markInFlight(id: number): Promise<void> {
  await offlineDb.syncQueue.update(id, { status: "in-flight" });
}

/** Mark an entry as completed (synced successfully) */
export async function markCompleted(id: number): Promise<void> {
  await offlineDb.syncQueue.update(id, { status: "completed" });
}

/** Mark an entry as failed with error details */
export async function markFailed(
  id: number,
  error: string
): Promise<void> {
  const existing = await offlineDb.syncQueue.get(id);
  await offlineDb.syncQueue.update(id, {
    status: "failed",
    lastError: error,
    retryCount: existing?.retryCount ? existing.retryCount + 1 : 1,
  });
}

/** Reset a failed entry back to pending for retry */
export async function retryEntry(id: number): Promise<void> {
  await offlineDb.syncQueue.update(id, {
    status: "pending",
    lastError: undefined,
  });
}

/** Reset all in-flight entries to pending (e.g., after crash recovery) */
export async function recoverInFlightEntries(ownerClerkId: string): Promise<number> {
  const inFlight = await offlineDb.syncQueue
    .where("status")
    .equals("in-flight")
    .filter((entry) => entry.ownerClerkId === ownerClerkId)
    .toArray();

  for (const entry of inFlight) {
    if (entry.id !== undefined) {
      await offlineDb.syncQueue.update(entry.id, {
        status: "pending",
        retryCount: entry.retryCount + 1,
      });
    }
  }

  return inFlight.length;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/** Remove all completed entries (call periodically to keep DB clean) */
export async function purgeCompletedEntries(ownerClerkId: string): Promise<number> {
  const completed = await offlineDb.syncQueue
    .where("status")
    .equals("completed")
    .filter((entry) => entry.ownerClerkId === ownerClerkId)
    .toArray();

  const ids = completed
    .map((e) => e.id)
    .filter((id): id is number => id !== undefined);

  await offlineDb.syncQueue.bulkDelete(ids);
  return ids.length;
}

/** Remove entries older than a given age (default: 7 days) */
export async function purgeOldEntries(
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;

  const old = await offlineDb.syncQueue
    .where("createdAt")
    .below(cutoff)
    .filter((e) => e.status === "completed" || e.status === "failed")
    .toArray();

  const ids = old
    .map((e) => e.id)
    .filter((id): id is number => id !== undefined);

  await offlineDb.syncQueue.bulkDelete(ids);
  return ids.length;
}

// ─── Dependency Resolution ──────────────────────────────────────────────────

/**
 * Check if an entry's dependencies have been resolved.
 * Returns true if the entry has no dependencies, or all dependencies are completed.
 */
export async function areDependenciesResolved(
  entry: SyncQueueEntry
): Promise<boolean> {
  if (!entry.dependsOnIdempotencyKey) return true;

  const dependency = await offlineDb.syncQueue
    .where("idempotencyKey")
    .equals(entry.dependsOnIdempotencyKey)
    .first();

  if (!dependency) return true; // Dependency not found = already purged = completed
  return dependency.status === "completed";
}

/**
 * Mark all entries that depend on a failed entry as also failed.
 */
export async function cascadeFailure(
  failedIdempotencyKey: string
): Promise<number> {
  const dependents = await offlineDb.syncQueue
    .filter(
      (e) =>
        e.dependsOnIdempotencyKey === failedIdempotencyKey &&
        e.status === "pending"
    )
    .toArray();

  for (const dep of dependents) {
    if (dep.id !== undefined) {
      await offlineDb.syncQueue.update(dep.id, {
        status: "failed",
        lastError: `Dependency failed: ${failedIdempotencyKey}`,
      });
      // Recursively cascade
      await cascadeFailure(dep.idempotencyKey);
    }
  }

  return dependents.length;
}
