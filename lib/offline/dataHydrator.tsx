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

    void hydrateFromServer({ ...hydrationData, clerkId }).finally(() => {
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
  clerkId: string;
}): Promise<void> {
  try {
    const startTime = performance.now();

    // Mirror the windows and caps used by convex/sync.ts getFullHydrationData.
    // Deletions must never consider records the server query did not cover.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    await Promise.all([
      hydrateTable("patients", data.patients, data.clerkId, {
        cap: 500,
        inServerScope: () => true,
      }),
      hydrateTable("visits", data.visits, data.clerkId, {
        cap: 1000,
        inServerScope: (r) => typeof r.date === "number" && (r.date as number) >= thirtyDaysAgo,
      }),
      hydrateTable("queue", data.queue, data.clerkId, {
        cap: 500,
        inServerScope: (r) => r.queueDate === todayStartMs,
      }),
      hydrateTable("followUps", data.followUps, data.clerkId, {
        cap: 200,
        inServerScope: (r) =>
          typeof r.followUpDate === "number" && (r.followUpDate as number) >= todayStartMs,
      }),
      hydrateTable("installments", data.installments, data.clerkId, {
        cap: 200,
        inServerScope: () => true,
      }),
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
interface HydrationScope {
  /** The server query's take() cap for this table. */
  cap: number;
  /** Whether a local record falls inside the window the server query covered. */
  inServerScope: (record: Record<string, unknown>) => boolean;
}

async function hydrateTable(
  tableName: "patients" | "visits" | "queue" | "followUps" | "installments",
  records: Record<string, unknown>[],
  ownerClerkId: string,
  scope: HydrationScope,
): Promise<void> {
  if (!records) return;

  const table = offlineDb[tableName];
  const serverIds = new Set(records.map((r) => r._id as string).filter(Boolean));
  if (serverIds.size === 0) return;

  await offlineDb.transaction("rw", table, async () => {
    // 1. Fetch existing records matching these server IDs in bulk
    const existingRecords = await (table as any)
      .where("_serverId")
      .anyOf(Array.from(serverIds))
      .filter((candidate: any) => candidate._ownerClerkId === ownerClerkId)
      .toArray();

    const existingMap = new Map<string, any>(existingRecords.map((r: any) => [r._serverId, r]));
    const puts: any[] = [];

    // 2. Prepare bulk puts
    for (const record of records) {
      const serverId = record._id as string;
      if (!serverId) continue;

      const existing = existingMap.get(serverId);

      if (existing) {
        // Queue state is authoritative until its replay succeeds
        if (existing._syncStatus === "pending") continue;

        const strategy = getStrategyForTable(tableName);
        // Server-authoritative timestamp: mutations set `updatedAt`; fall back
        // to Convex's insertion time for records that predate the field.
        const serverUpdatedAt =
          (record.updatedAt as number | undefined) ??
          (record._creationTime as number | undefined) ??
          0;
        const { resolved, hadConflict } = resolveConflict(
          existing as any,
          record,
          serverUpdatedAt,
          strategy
        );

        if (hadConflict) {
          console.log(`[DataHydrator] Resolved conflict in ${tableName} for ${serverId} using ${strategy}`);
        }

        const stripped = stripConvexMeta(resolved);
        puts.push({
          ...stripped,
          _syncStatus: resolved._syncStatus,
          // Keep the resolved timestamp — stamping Date.now() here would make
          // the local copy always look newer than the server on the next pass.
          _updatedAt: resolved._updatedAt,
          _version: existing._version + 1,
        });
      } else {
        // New record from server
        const meta = createOfflineMeta(serverId, ownerClerkId);
        const stripped = stripConvexMeta(record);
        puts.push({
          ...stripped,
          ...meta,
          _serverId: serverId,
          _syncStatus: "synced",
        });
      }
    }

    // 3. Execute bulk upsert
    if (puts.length > 0) {
      await (table as any).bulkPut(puts);
    }

    // 4. Deletion-aware caching: remove synced records that are no longer
    // returned by the server. If the response hit its cap we cannot tell
    // "deleted" from "not returned", so skip deletions for this run.
    if (records.length >= scope.cap) {
      console.log(
        `[DataHydrator] ${tableName} response hit its cap (${scope.cap}), skipping deletion pass`
      );
      return;
    }

    const allSyncedRecords = await (table as any)
      .filter(
        (r: any) =>
          r._ownerClerkId === ownerClerkId &&
          r._syncStatus === "synced" &&
          r._serverId !== null &&
          scope.inServerScope(r)
      )
      .toArray();
      
    const toDeleteLocalIds = allSyncedRecords
      .filter((r: any) => !serverIds.has(r._serverId as string))
      .map((r: any) => r._localId);

    if (toDeleteLocalIds.length > 0) {
      console.log(`[DataHydrator] Removing ${toDeleteLocalIds.length} stale/deleted records from ${tableName}`);
      await table.bulkDelete(toDeleteLocalIds);
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
