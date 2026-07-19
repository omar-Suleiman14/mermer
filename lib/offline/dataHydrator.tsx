"use client";

/**
 * DataHydrator — Pre-populates Dexie with server data for offline access.
 *
 * Runs on app startup when online:
 * 1. First load: Full hydration (patients, recent visits, queue, follow-ups, installments)
 * 2. Subsequent loads: Incremental sync (only changes since last hydration)
 *
 * Data is stored in Dexie so it's available immediately when going offline.
 */

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";
import { offlineDb, createOfflineMeta } from "@/lib/offline/offlineDb";
import { resolveConflict, getStrategyForTable } from "@/lib/offline/conflictResolver";

interface DataHydratorProps {
  clerkId: string;
}

/**
 * Component that hydrates Dexie with server data on mount.
 * Render this inside the dashboard layout when the user is authenticated.
 */
export function DataHydrator({ clerkId }: DataHydratorProps) {
  const connectionStatus = useConnectionStatus();
  const isOnline = connectionStatus === "online";
  const hydrating = useRef(false);

  // Use the full hydration query
  const hydrationData = useQuery(
    api.sync.getFullHydrationData,
    isOnline && clerkId ? { clerkId } : "skip"
  );

  const lastHydratedAt = useRef<number>(0);

  useEffect(() => {
    if (!hydrationData || hydrating.current || !isOnline) return;

    // Prevent re-hydrating with the exact same data payload on a reconnect flutter
    if (hydrationData.hydratedAt === lastHydratedAt.current) return;

    hydrating.current = true;

    void hydrateFromServer(hydrationData).finally(() => {
      lastHydratedAt.current = hydrationData.hydratedAt;
      hydrating.current = false;
    });
  }, [hydrationData, isOnline]);

  return null;
}

/**
 * Hydrate all offline tables from server data.
 * Skips records that have pending local changes.
 */
async function hydrateFromServer(data: {
  patients: Record<string, unknown>[];
  visits: Record<string, unknown>[];
  queue: Record<string, unknown>[];
  followUps: Record<string, unknown>[];
  installments: Record<string, unknown>[];
  hydratedAt: number;
}): Promise<void> {
  try {
    const startTime = performance.now();

    await Promise.all([
      hydrateTable("patients", data.patients),
      hydrateTable("visits", data.visits),
      hydrateTable("queue", data.queue),
      hydrateTable("followUps", data.followUps),
      hydrateTable("installments", data.installments),
    ]);

    // Store hydration timestamp
    await offlineDb.syncMeta.put({
      key: "lastHydrationTimestamp",
      value: data.hydratedAt,
    });

    const elapsed = Math.round(performance.now() - startTime);
    const totalRecords =
      data.patients.length +
      data.visits.length +
      data.queue.length +
      data.followUps.length +
      data.installments.length;

    console.log(
      `[DataHydrator] Hydrated ${totalRecords} records across 5 tables in ${elapsed}ms`
    );
  } catch (err) {
    console.error("[DataHydrator] Hydration failed:", err);
  }
}

/**
 * Upsert records into a Dexie table from server data.
 * Existing records with pending local changes are preserved.
 */
async function hydrateTable(
  tableName: "patients" | "visits" | "queue" | "followUps" | "installments",
  records: Record<string, unknown>[]
): Promise<void> {
  if (!records || records.length === 0) return;

  const table = offlineDb[tableName];

  await offlineDb.transaction("rw", table, async () => {
    for (const record of records) {
      const serverId = record._id as string;
      if (!serverId) continue;

      // Check if this record already exists locally
      const existing = await table
        .where("_serverId")
        .equals(serverId)
        .first();

      if (existing) {
        // Resolve conflict using the table-specific strategy
        const strategy = getStrategyForTable(tableName);
        const { resolved, hadConflict } = resolveConflict(
          existing as any, // Cast to any to bypass strict type checking for the merge
          record,
          Date.now(), // Use current time as the server's update time since we don't have a reliable server update timestamp
          strategy
        );

        if (hadConflict) {
          console.log(`[DataHydrator] Resolved conflict in ${tableName} for ${serverId} using ${strategy}`);
        }

        const stripped = stripConvexMeta(resolved);
        await table.update(existing._localId, {
          ...stripped,
          // If the resolver kept local changes, it sets status to pending
          _syncStatus: resolved._syncStatus,
          _updatedAt: Date.now(),
          _version: existing._version + 1,
        });
      } else {
        // New record from server — insert
        const meta = createOfflineMeta(serverId);
        const stripped = stripConvexMeta(record);

        await (table as any).put({
          ...stripped,
          ...meta,
          _serverId: serverId,
          _syncStatus: "synced",
        });
      }
    }
  });
}

/** Remove Convex-internal fields before storing in Dexie */
function stripConvexMeta(record: Record<string, unknown>): Record<string, unknown> {
  const stripped = { ...record };
  delete stripped._id;
  delete stripped._creationTime;
  return stripped;
}
