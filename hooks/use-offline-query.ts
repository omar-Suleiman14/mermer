"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "convex/react";
import { liveQuery } from "dexie";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";
import { offlineDb, type OfflineMeta } from "@/lib/offline/offlineDb";
import { resolveConflict, getStrategyForTable } from "@/lib/offline/conflictResolver";
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from "convex/server";

type OfflineTable =
  | "patients"
  | "visits"
  | "queue"
  | "followUps"
  | "installments";
type OfflineRecord = OfflineMeta & { [key: string]: any };

interface UseOfflineQueryOptions {
  /** Which Dexie table to read from when Convex is unavailable. */
  table: OfflineTable;
  /** Filter applied to locally cached records. */
  filter?: (records: OfflineRecord[]) => OfflineRecord[];
  /** Optional Dexie query callback for performance optimization. */
  query?: (table: any, ownerClerkId: string) => Promise<OfflineRecord[]>;
  /** Sort applied to locally cached records. */
  sort?: (a: OfflineRecord, b: OfflineRecord) => number;
  /** Max number of local records returned (default: 500). */
  limit?: number;
  /** Skip the Convex query while still reading Dexie. */
  skipConvex?: boolean;
  /** Transform local records for queries that return a single value rather than a list. */
  select?: (records: OfflineRecord[]) => unknown;
  /** Value to return before Dexie has completed its first read. Defaults to an empty list. */
  initialLocalValue?: unknown;
}

/**
 * A live, offline-aware companion to Convex's useQuery.
 *
 * Local records are normalized with `_id`, using their server ID when available
 * and their local UUID otherwise. This lets UI components safely render and pass
 * offline-created entities to offline mutations without asking Convex to validate
 * a UUID as a server ID.
 */
export function useOfflineQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query> | "skip",
  options: UseOfflineQueryOptions,
): FunctionReturnType<Query> | undefined {
  const connectionStatus = useConnectionStatus();
  const isOnline = connectionStatus === "online";
  const isOffline = connectionStatus === "offline";
  const shouldSkipConvex = args === "skip" || options.skipConvex || isOffline;
  const convexData = useQuery(query, (shouldSkipConvex ? "skip" : args) as any);
  const [localRecords, setLocalRecords] = useState<OfflineRecord[]>([]);
  const [hasLoadedLocal, setHasLoadedLocal] = useState(false);
  const [lastConvexData, setLastConvexData] = useState<
    FunctionReturnType<Query> | undefined
  >(undefined);
  const mirrorInProgress = useRef(false);
  const {
    table,
    filter,
    query: customQuery,
    sort,
    limit = 500,
    select,
    initialLocalValue = [],
  } = options;
  const ownerClerkId =
    args !== "skip" && typeof (args as Record<string, unknown>).clerkId === "string"
      ? (args as Record<string, unknown>).clerkId as string
      : "";

  useEffect(() => {
    if (convexData !== undefined) setLastConvexData(convexData);
  }, [convexData]);

  // Subscribe to Dexie instead of taking a one-time snapshot. Local creates and
  // updates must be reflected immediately while the device is offline.
  useEffect(() => {
    const subscription = liveQuery<OfflineRecord[]>(() => {
      if (!ownerClerkId) return Promise.resolve([]);
      if (customQuery) return customQuery(offlineDb[table], ownerClerkId);
      return (offlineDb[table] as any)
        .where("_ownerClerkId")
        .equals(ownerClerkId)
        .toArray();
    }).subscribe({
      next(records) {
        setLocalRecords(records);
        setHasLoadedLocal(true);
      },
      error(error) {
        console.error(
          `[useOfflineQuery] Failed to read Dexie table '${table}':`,
          error,
        );
        setHasLoadedLocal(true);
      },
    });

    return () => subscription.unsubscribe();
  }, [table, ownerClerkId]);

  const localData = useMemo(() => {
    let records = [...localRecords];
    if (filter) records = filter(records);
    if (sort) records.sort(sort);
    records = records.slice(0, limit);

    const normalized = records.map((record) => ({
      ...record,
      _id: record._serverId ?? record._localId,
    }));
    return (
      select ? select(normalized) : normalized
    ) as FunctionReturnType<Query>;
  }, [localRecords, filter, sort, limit, select]);

  // Mirror list and single-record queries when online to populate offline storage
  useEffect(() => {
    if (!isOnline || convexData === undefined || convexData === null || mirrorInProgress.current)
      return;
      
    // Handle both array responses and single object responses
    const recordsToMirror = Array.isArray(convexData) 
      ? convexData 
      : [convexData];
      
    mirrorInProgress.current = true;
    void mirrorToDexie(table, recordsToMirror as Record<string, unknown>[], ownerClerkId).finally(
      () => {
        mirrorInProgress.current = false;
      },
    );
  }, [isOnline, convexData, table, ownerClerkId]);

  if (isOffline) {
    // Preserve visible server data through the offline transition until Dexie has
    // produced its first snapshot, avoiding a transient loading spinner.
    if (!hasLoadedLocal) {
      return lastConvexData ?? (initialLocalValue as FunctionReturnType<Query>);
    }
    return localData;
  }

  if (connectionStatus === "reconnecting") {
    return (
      convexData ??
      (hasLoadedLocal
        ? localData
        : (lastConvexData ?? (initialLocalValue as FunctionReturnType<Query>)))
    );
  }

  return (
    convexData ??
    (hasLoadedLocal
      ? localData
      : (lastConvexData ?? (initialLocalValue as FunctionReturnType<Query>)))
  );
}

async function mirrorToDexie(
  table: OfflineTable,
  records: Record<string, unknown>[],
  ownerClerkId: string,
): Promise<void> {
  if (records.length === 0) return;
  const dexieTable = offlineDb[table];

  try {
    await offlineDb.transaction("rw", dexieTable, async () => {
      for (const record of records) {
        const serverId = (record._id as string) ?? (record.id as string);
        if (!serverId) continue;
        const existing = await (dexieTable as any)
          .where("_serverId")
          .equals(serverId)
          .filter((candidate: any) => candidate._ownerClerkId === ownerClerkId)
          .first();

        if (existing) {
          if (existing._syncStatus === "pending") continue;
          const strategy = getStrategyForTable(table);
          const { resolved, hadConflict } = resolveConflict(
            existing as any,
            record,
            existing._updatedAt,
            strategy
          );

          if (hadConflict) {
            console.log(`[mirrorToDexie] Resolved conflict in ${table} for ${serverId} using ${strategy}`);
          }

          await dexieTable.update(existing._localId, {
            ...stripConvexMeta(resolved),
            _serverId: serverId,
            _syncStatus: resolved._syncStatus,
            _updatedAt: Date.now(),
            _version: existing._version + 1,
          });
        } else {
          await (dexieTable as any).put({
            ...stripConvexMeta(record),
            _localId: crypto.randomUUID(),
            _ownerClerkId: ownerClerkId,
            _serverId: serverId,
            _syncStatus: "synced",
            _updatedAt: Date.now(),
            _version: 1,
            _isOfflineCreated: false,
          });
        }
      }
    });
  } catch (error) {
    console.error(`[mirrorToDexie] Failed for table '${table}':`, error);
  }
}

function stripConvexMeta(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const stripped = { ...record };
  delete stripped._id;
  delete stripped._creationTime;
  return stripped;
}
