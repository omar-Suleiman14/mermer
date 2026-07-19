import type { OfflineMeta } from "./offlineDb";

// ─── Conflict Resolution ────────────────────────────────────────────────────
//
// When we reconnect and pull fresh data from Convex, we need to reconcile
// records that were modified both locally (offline) and on the server.
//
// Strategy: Last-Write-Wins (LWW) with optional field-level merge.
//
// The `_updatedAt` timestamp determines the winner. For clinical data
// (visits), we use field-level merge where non-conflicting fields are
// combined and conflicting fields use LWW.

export type ConflictStrategy = "last-write-wins" | "field-merge" | "local-wins" | "server-wins";

export interface ConflictResult<T> {
  /** The resolved record */
  resolved: T;
  /** Whether a conflict was detected */
  hadConflict: boolean;
  /** Which strategy was used */
  strategy: ConflictStrategy;
  /** Fields that were in conflict (for field-merge strategy) */
  conflictingFields?: string[];
}

/**
 * Resolve a conflict between a local record and a server record.
 */
export function resolveConflict<T extends OfflineMeta & Record<string, unknown>>(
  localRecord: T,
  serverRecord: Record<string, unknown>,
  serverUpdatedAt: number,
  strategy: ConflictStrategy = "last-write-wins"
): ConflictResult<T> {
  switch (strategy) {
    case "last-write-wins":
      return resolveLastWriteWins(localRecord, serverRecord, serverUpdatedAt);
    case "field-merge":
      return resolveFieldMerge(localRecord, serverRecord, serverUpdatedAt);
    case "local-wins":
      return {
        resolved: localRecord,
        hadConflict: true,
        strategy: "local-wins",
      };
    case "server-wins":
      return {
        resolved: {
          ...localRecord,
          ...serverRecord,
          _syncStatus: "synced" as const,
          _updatedAt: serverUpdatedAt,
        } as T,
        hadConflict: true,
        strategy: "server-wins",
      };
    default:
      return resolveLastWriteWins(localRecord, serverRecord, serverUpdatedAt);
  }
}

/**
 * Last-Write-Wins: the record with the later _updatedAt timestamp wins entirely.
 */
function resolveLastWriteWins<T extends OfflineMeta & Record<string, unknown>>(
  localRecord: T,
  serverRecord: Record<string, unknown>,
  serverUpdatedAt: number
): ConflictResult<T> {
  const localWins = localRecord._syncStatus === "pending" || localRecord._updatedAt >= serverUpdatedAt;

  if (localWins) {
    // Local version is newer — keep it, it will be synced to server
    return {
      resolved: {
        ...localRecord,
        _syncStatus: "pending" as const,
      } as T,
      hadConflict: true,
      strategy: "last-write-wins",
    };
  }

  // Server version is newer — accept server data
  return {
    resolved: {
      ...localRecord,
      ...serverRecord,
      // Preserve offline metadata
      _localId: localRecord._localId,
      _serverId: localRecord._serverId,
      _syncStatus: "synced" as const,
      _updatedAt: serverUpdatedAt,
      _version: localRecord._version + 1,
      _isOfflineCreated: false,
    } as T,
    hadConflict: true,
    strategy: "last-write-wins",
  };
}

/**
 * Field-level merge: combine non-conflicting fields from both records.
 * For conflicting fields, the later timestamp wins.
 * This is safer for clinical data where partial updates are common.
 */
function resolveFieldMerge<T extends OfflineMeta & Record<string, unknown>>(
  localRecord: T,
  serverRecord: Record<string, unknown>,
  serverUpdatedAt: number
): ConflictResult<T> {
  // Fields to skip during merge (offline metadata)
  const metaFields = new Set([
    "_localId",
    "_serverId",
    "_syncStatus",
    "_updatedAt",
    "_version",
    "_isOfflineCreated",
    "_id",
    "_creationTime",
  ]);

  const conflictingFields: string[] = [];
  const merged: any = { ...localRecord };
  const localWins = localRecord._syncStatus === "pending" || localRecord._updatedAt >= serverUpdatedAt;

  for (const key of Object.keys(serverRecord)) {
    if (metaFields.has(key)) continue;

    const localVal = localRecord[key];
    const serverVal = serverRecord[key];

    // If values are the same, no conflict
    if (JSON.stringify(localVal) === JSON.stringify(serverVal)) {
      continue;
    }

    // If local field is unchanged (undefined/null) but server has a value
    if (localVal === undefined || localVal === null) {
      merged[key] = serverVal;
      continue;
    }

    // If server field is unchanged but local has a value
    if (serverVal === undefined || serverVal === null) {
      // Keep local value
      continue;
    }

    // Both have different values — conflict
    conflictingFields.push(key);

    // LWW for the conflicting field
    if (!localWins) {
      merged[key] = serverVal;
    }
  }

  const hadConflict = conflictingFields.length > 0;

  merged._syncStatus = hadConflict && localWins ? "pending" : "synced";
  merged._updatedAt = Math.max(localRecord._updatedAt, serverUpdatedAt);
  merged._version = localRecord._version + 1;

  return {
    resolved: merged as T,
    hadConflict,
    strategy: "field-merge",
    conflictingFields,
  };
}

// ─── Strategy Mapping ───────────────────────────────────────────────────────

/**
 * Determine the appropriate conflict strategy for a given table.
 * Clinical data (visits) uses field-merge, everything else uses LWW.
 */
export function getStrategyForTable(table: string): ConflictStrategy {
  switch (table) {
    case "visits":
      // Clinical data — merge field-by-field to preserve partial updates
      return "field-merge";
    case "patients":
    case "queue":
    case "followUps":
    default:
      return "last-write-wins";
  }
}
