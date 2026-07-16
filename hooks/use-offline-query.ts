"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";
import { offlineDb, type OfflineMeta } from "@/lib/offline/offlineDb";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

type OfflineTable = "patients" | "visits" | "queue" | "followUps";

interface UseOfflineQueryOptions {
  /** Which Dexie table to read from when offline */
  table: OfflineTable;
  /**
   * Optional filter function applied to Dexie results.
   * Receives all records from the table and should return the filtered set.
   */
  filter?: (records: (OfflineMeta & Record<string, unknown>)[]) => (OfflineMeta & Record<string, unknown>)[];
  /**
   * Optional sort function applied to Dexie results.
   */
  sort?: (
    a: OfflineMeta & Record<string, unknown>,
    b: OfflineMeta & Record<string, unknown>
  ) => number;
  /** Max number of records to return from Dexie (default: 500) */
  limit?: number;
  /** If true, skip the Convex query entirely (useful during initial hydration) */
  skipConvex?: boolean;
}

/**
 * Offline-aware query hook. Drop-in companion to `useQuery` from convex/react.
 *
 * Online:  Returns Convex data (primary) and mirrors it to Dexie in the background.
 * Offline: Returns data from Dexie (local cache).
 * Reconnecting: Returns Dexie data until Convex catches up.
 *
 * Usage:
 * ```tsx
 * const patients = useOfflineQuery(
 *   api.patients.listPatients,
 *   { clerkId },
 *   {
 *     table: "patients",
 *     filter: (records) => records.filter(r => r.doctorId === doctorId),
 *   }
 * );
 * ```
 */
export function useOfflineQuery<
  Query extends FunctionReference<"query">,
>(
  query: Query,
  args: FunctionArgs<Query> | "skip",
  options: UseOfflineQueryOptions
): FunctionReturnType<Query> | undefined {
  const connectionStatus = useConnectionStatus();
  const isOnline = connectionStatus === "online";
  const isOffline = connectionStatus === "offline";

  // Run the Convex query when online (or reconnecting to catch up)
  const shouldSkipConvex = args === "skip" || options.skipConvex || isOffline;
  const convexData = useQuery(query, (shouldSkipConvex ? "skip" : args) as any);

  // Local Dexie data state
  const [localData, setLocalData] = useState<FunctionReturnType<Query> | undefined>(undefined);
  const mirrorInProgress = useRef(false);

  const { table, filter, sort, limit = 500 } = options;

  // ── Read from Dexie when offline ──────────────────────────────────────
  useEffect(() => {
    if (!isOffline && convexData !== undefined) return;

    let cancelled = false;

    async function loadFromDexie() {
      try {
        const dexieTable = offlineDb[table];
        let records = await dexieTable.toArray();

        // Apply filter
        if (filter) {
          records = filter(records as any) as any;
        }

        // Apply sort
        if (sort) {
          records.sort(sort as any);
        }

        // Apply limit
        records = records.slice(0, limit);

        if (!cancelled) {
          setLocalData(records as FunctionReturnType<Query>);
        }
      } catch (err) {
        console.error(`[useOfflineQuery] Failed to read from Dexie table '${table}':`, err);
      }
    }

    void loadFromDexie();

    return () => {
      cancelled = true;
    };
  }, [isOffline, convexData, table, limit]); // intentionally exclude filter/sort to avoid re-renders

  // ── Mirror Convex data to Dexie when online ───────────────────────────
  useEffect(() => {
    if (!isOnline || convexData === undefined || convexData === null) return;
    if (mirrorInProgress.current) return;

    mirrorInProgress.current = true;

    void mirrorToDexie(table, convexData as Record<string, unknown>[]).finally(() => {
      mirrorInProgress.current = false;
    });
  }, [isOnline, convexData, table]);

  // ── Return the right data source ──────────────────────────────────────
  if (isOffline) {
    return localData;
  }

  // While reconnecting, prefer Convex if available, fall back to Dexie
  if (connectionStatus === "reconnecting") {
    return convexData !== undefined ? convexData : localData;
  }

  // Online: use Convex data, fall back to Dexie during initial load
  return convexData !== undefined ? convexData : localData;
}

// ─── Mirror Logic ─────────────────────────────────────────────────────────

/**
 * Mirror an array of Convex records to Dexie.
 * Upserts by server ID — existing records with pending local changes are skipped.
 */
async function mirrorToDexie(
  table: OfflineTable,
  records: Record<string, unknown>[]
): Promise<void> {
  if (!Array.isArray(records) || records.length === 0) return;

  const dexieTable = offlineDb[table];

  try {
    await offlineDb.transaction("rw", dexieTable, async () => {
      for (const record of records) {
        const serverId = (record._id as string) ?? (record.id as string);
        if (!serverId) continue;

        // Check if we already have this record locally
        const existing = await dexieTable
          .where("_serverId")
          .equals(serverId)
          .first();

        if (existing) {
          // Don't overwrite records with pending local changes
          if (existing._syncStatus === "pending") continue;

          // Update the existing record with fresh server data
          await dexieTable.update(existing._localId, {
            ...stripConvexMeta(record),
            _serverId: serverId,
            _syncStatus: "synced",
            _updatedAt: Date.now(),
            _version: existing._version + 1,
          });
        } else {
          // New record from server — insert into Dexie
          await (dexieTable as any).put({
            ...stripConvexMeta(record),
            _localId: crypto.randomUUID(),
            _serverId: serverId,
            _syncStatus: "synced",
            _updatedAt: Date.now(),
            _version: 1,
            _isOfflineCreated: false,
          });
        }
      }
    });
  } catch (err) {
    console.error(`[mirrorToDexie] Failed for table '${table}':`, err);
  }
}

/**
 * Strip Convex-specific metadata fields from a record before storing in Dexie.
 */
function stripConvexMeta(
  record: Record<string, unknown>
): Record<string, unknown> {
  const stripped = { ...record };
  delete stripped._id;
  delete stripped._creationTime;
  return stripped;
}
