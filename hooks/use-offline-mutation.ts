"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";
import {
  offlineDb,
  createOfflineMeta,
  type OfflineMeta,
  type SyncOperation,
} from "@/lib/offline/offlineDb";
import { enqueueSyncOp } from "@/lib/offline/syncQueue";
import { isLocalId } from "@/lib/offline/idRemap";
import type { FunctionReference, FunctionArgs } from "convex/server";

type OfflineTable = "patients" | "visits" | "queue" | "followUps" | "installments";

interface UseOfflineMutationOptions {
  /** Which Dexie table this mutation writes to */
  table: OfflineTable;
  /**
   * The CRUD operation type .
   * - "create": inserts a new record
   * - "update": modifies an existing record (requires serverId or localId in args)
   * - "delete": removes a record
   */
  operation: "create" | "update" | "delete";
  /** Mutation registry key used when replaying this operation after reconnecting. */
  syncOperation?: SyncOperation;
  /**
   * Optional function to extract/transform the mutation args into a Dexie record.
   * If not provided, the raw args are used directly.
   */
  toLocalRecord?: (args: Record<string, unknown>) => Record<string, unknown>;
  /**
   * If this mutation depends on a previously-queued offline mutation,
   * provide the idempotency key of the dependency.
   * For example, when adding a patient to the queue, this would be the
   * idempotency key from the createPatient operation.
   */
  dependsOnIdempotencyKey?: string;
  /**
   * Called after a successful online mutation with the server result.
   * Use this to perform side effects like updating related records.
   */
  onOnlineSuccess?: (result: unknown) => void | Promise<void>;
  /**
   * Called after a successful offline write with the local record.
   */
  onOfflineSuccess?: (
    localRecord: OfflineMeta & Record<string, unknown>,
  ) => void | Promise<void>;
}

export interface OfflineMutationResult {
  /** The local UUID (for offline creates) or server ID */
  id: string;
  /** Whether the operation was queued for later sync */
  isOffline: boolean;
  /** The idempotency key (for dependency tracking between operations) */
  idempotencyKey: string | null;
}

/**
 * Offline-aware mutation hook. Drop-in companion to `useMutation` from convex/react.
 *
 * Online:  Executes the Convex mutation directly + mirrors result to Dexie.
 * Offline: Writes to Dexie locally + enqueues the operation in the sync queue.
 *
 * Usage:
 * ```tsx
 * const createPatient = useOfflineMutation(
 *   api.patients.createPatient,
 *   {
 *     table: "patients",
 *     operation: "create",
 *     toLocalRecord: (args) => ({
 *       doctorId: args.clerkId,
 *       name: args.name,
 *       age: args.age,
 *       phone: args.phone,
 *       chronicConditions: args.chronicConditions ?? [],
 *       createdAt: Date.now(),
 *     }),
 *   }
 * );
 *
 * // In handler:
 * const result = await createPatient({ name: "Ahmed", age: 35, phone: "01012345678" });
 * // result.id → UUID if offline, server ID if online
 * // result.isOffline → true if queued
 * ```
 */
export function useOfflineMutation<
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
  options: UseOfflineMutationOptions,
): (args: FunctionArgs<Mutation>) => Promise<OfflineMutationResult> {
  const connectionStatus = useConnectionStatus();
  const convexMutation = useMutation(mutation);

  const {
    table,
    operation,
    syncOperation = operation,
    toLocalRecord,
    dependsOnIdempotencyKey,
    onOnlineSuccess,
    onOfflineSuccess,
  } = options;

  // Use ref to avoid stale closure over connectionStatus
  const statusRef = useRef(connectionStatus);
  useEffect(() => {
    statusRef.current = connectionStatus;
  }, [connectionStatus]);

  const execute = async (
    args: FunctionArgs<Mutation>,
  ): Promise<OfflineMutationResult> => {
    const isOnline =
      statusRef.current === "online" &&
      !hasLocalEntityId(args as Record<string, unknown>);
    return isOnline ? executeOnline(args) : executeOffline(args);
  };

  // ── Online path: Convex mutation + mirror to Dexie ────────────────────
  async function executeOnline(
    args: FunctionArgs<Mutation>,
  ): Promise<OfflineMutationResult> {
    try {
      const result = await convexMutation(args);

      // Mirror to Dexie for offline cache
      if (operation === "create" && result) {
        const serverRecord =
          typeof result === "object"
            ? (result as Record<string, unknown>)
            : { _id: result };
        const serverId = extractServerId(serverRecord, result);
        if (!serverId) {
          throw new Error("[useOfflineMutation] Create mutation returned no record ID");
        }

        const localRecord = toLocalRecord
          ? toLocalRecord(args as Record<string, unknown>)
          : (args as Record<string, unknown>);

        const meta = createOfflineMeta(
          serverId,
          String((args as Record<string, unknown>).clerkId ?? ""),
        );

        await (offlineDb[table] as any).put({
          ...localRecord,
          ...meta,
          _serverId: serverId,
          _syncStatus: "synced",
        });

        await onOnlineSuccess?.(result);

        return { id: serverId, isOffline: false, idempotencyKey: null };
      }

      if (operation === "update") {
        const serverId = getTargetId(args as Record<string, unknown>);

        if (serverId) {
          const existing = await offlineDb[table]
            .where("_serverId")
            .equals(serverId)
            .first();

          if (existing) {
            const updates = toLocalRecord
              ? toLocalRecord(args as Record<string, unknown>)
              : (args as Record<string, unknown>);

            await offlineDb[table].update(existing._localId, {
              ...updates,
              _syncStatus: "synced",
              _updatedAt: Date.now(),
              _version: existing._version + 1,
            });
          }
        }

        await onOnlineSuccess?.(result);
        return { id: serverId ?? "", isOffline: false, idempotencyKey: null };
      }

      if (operation === "delete") {
        const serverId =
          ((args as Record<string, unknown>).id as string) ??
          ((args as Record<string, unknown>)._id as string);

        if (serverId) {
          const existing = await offlineDb[table]
            .where("_serverId")
            .equals(serverId)
            .first();

          if (existing) {
            await offlineDb[table].delete(existing._localId);
          }
        }

        await onOnlineSuccess?.(result);
        return { id: serverId ?? "", isOffline: false, idempotencyKey: null };
      }

      await onOnlineSuccess?.(result);
      return { id: "", isOffline: false, idempotencyKey: null };
    } catch (err) {
      // If the online mutation fails due to network error, fall back to offline
      if (isNetworkError(err)) {
        console.warn(
          "[useOfflineMutation] Network error, falling back to offline:",
          err,
        );
        return executeOffline(args);
      }
      throw err; // Re-throw validation errors, etc.
    }
  }

  // ── Offline path: Write to Dexie + enqueue sync ───────────────────────
  async function executeOffline(
    args: FunctionArgs<Mutation>,
  ): Promise<OfflineMutationResult> {
    const dexieTable = offlineDb[table];
    const ownerClerkId = getOwnerClerkId(args as Record<string, unknown>);

    if (operation === "create") {
      const meta = createOfflineMeta(undefined, ownerClerkId);
      const localRecord = toLocalRecord
        ? toLocalRecord(args as Record<string, unknown>)
        : (args as Record<string, unknown>);

      const record = {
        ...localRecord,
        ...meta,
      } as Parameters<typeof dexieTable.put>[0];

      await (dexieTable as any).put(record);

      const idempotencyKey = await enqueueSyncOp({
        table,
        operation: syncOperation,
        localId: meta._localId,
        serverId: null,
        payload: args as Record<string, unknown>,
        ownerClerkId,
        dependsOnIdempotencyKey,
      });

      await onOfflineSuccess?.(record as any);

      return { id: meta._localId, isOffline: true, idempotencyKey };
    }

    if (operation === "update") {
      if (syncOperation === "swapAppointments") {
        const firstId = (args as Record<string, unknown>).appointmentId1 as
          | string
          | undefined;
        const secondId = (args as Record<string, unknown>).appointmentId2 as
          | string
          | undefined;
        if (!firstId || !secondId) {
          throw new Error(
            "[useOfflineMutation] A swap requires two appointment IDs",
          );
        }

        const first = await findOfflineRecord(dexieTable as any, firstId);
        const second = await findOfflineRecord(dexieTable as any, secondId);
        if (!first || !second) {
          throw new Error(
            "[useOfflineMutation] Both appointments must be available locally to swap offline",
          );
        }

        const now = Date.now();
        await offlineDb.transaction("rw", dexieTable, async () => {
          await dexieTable.update(first._localId, {
            date: second.date,
            _syncStatus: "pending",
            _updatedAt: now,
            _version: first._version + 1,
          });
          await dexieTable.update(second._localId, {
            date: first.date,
            _syncStatus: "pending",
            _updatedAt: now,
            _version: second._version + 1,
          });
        });

        const idempotencyKey = await enqueueSyncOp({
          table,
          operation: syncOperation,
          localId: first._localId,
          serverId: first._serverId,
          payload: args as Record<string, unknown>,
          ownerClerkId,
          dependsOnIdempotencyKey,
        });
        return {
          id: first._serverId ?? first._localId,
          isOffline: true,
          idempotencyKey,
        };
      }

      // Find the local record by server ID or local ID
      const targetId = getTargetId(args as Record<string, unknown>);

      if (!targetId) {
        throw new Error(
          "[useOfflineMutation] Unable to identify the record to update",
        );
      }

      let existing = await dexieTable.get(targetId);
      if (!existing) {
        existing = await dexieTable.where("_serverId").equals(targetId).first();
      }

      if (existing) {
        const updates = toLocalRecord
          ? toLocalRecord(args as Record<string, unknown>)
          : (args as Record<string, unknown>);

        await dexieTable.update(existing._localId, {
          ...updates,
          _syncStatus: "pending",
          _updatedAt: Date.now(),
          _version: existing._version + 1,
        });

        const idempotencyKey = await enqueueSyncOp({
          table,
          operation: syncOperation,
          localId: existing._localId,
          serverId: existing._serverId,
          payload: args as Record<string, unknown>,
          ownerClerkId,
          dependsOnIdempotencyKey,
        });

        await onOfflineSuccess?.(existing as any);

        return {
          id: existing._serverId ?? existing._localId,
          isOffline: true,
          idempotencyKey,
        };
      }

      // Record not found locally — queue the update anyway
      const idempotencyKey = await enqueueSyncOp({
        table,
        operation: syncOperation,
        localId: targetId,
        serverId: targetId,
        payload: args as Record<string, unknown>,
        ownerClerkId,
        dependsOnIdempotencyKey,
      });

      return { id: targetId, isOffline: true, idempotencyKey };
    }

    if (operation === "delete") {
      const targetId =
        ((args as Record<string, unknown>).id as string) ??
        ((args as Record<string, unknown>)._id as string);

      let existing = await dexieTable.get(targetId);
      if (!existing) {
        existing = await dexieTable.where("_serverId").equals(targetId).first();
      }

      if (existing) {
        // Don't actually delete from Dexie yet — mark as pending delete
        // The sync engine will delete after confirmed by server
        await dexieTable.update(existing._localId, {
          _syncStatus: "pending",
          _updatedAt: Date.now(),
        });

        const idempotencyKey = await enqueueSyncOp({
          table,
          operation: "delete",
          localId: existing._localId,
          serverId: existing._serverId,
          payload: args as Record<string, unknown>,
          ownerClerkId,
          dependsOnIdempotencyKey,
        });

        return {
          id: existing._serverId ?? existing._localId,
          isOffline: true,
          idempotencyKey,
        };
      }

      // Record not found locally — queue delete anyway
      const idempotencyKey = await enqueueSyncOp({
        table,
        operation: "delete",
        localId: targetId,
        serverId: targetId,
        payload: args as Record<string, unknown>,
        ownerClerkId,
        dependsOnIdempotencyKey,
      });

      return { id: targetId, isOffline: true, idempotencyKey };
    }

    throw new Error(`[useOfflineMutation] Unknown operation: ${operation}`);
  }

  return execute;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Detect network-related errors that should trigger offline fallback */
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError && err.message.includes("fetch")) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("failed to fetch") ||
      msg.includes("connection") ||
      msg.includes("timeout") ||
      msg.includes("socket")
    );
  }
  return false;
}

function getTargetId(args: Record<string, unknown>): string | undefined {
  const candidates = [
    args.id,
    args._id,
    args.patientId,
    args.visitId,
    args.appointmentId,
  ];
  return candidates.find((id): id is string => typeof id === "string");
}

function getOwnerClerkId(args: Record<string, unknown>): string {
  const clerkId = args.clerkId;
  if (typeof clerkId !== "string" || !clerkId) {
    throw new Error("[useOfflineMutation] Offline mutations require clerkId");
  }
  return clerkId;
}

function extractServerId(
  serverRecord: Record<string, unknown>,
  result: unknown,
): string | undefined {
  const candidates = [
    serverRecord._id,
    serverRecord.id,
    serverRecord.visitId,
    serverRecord.patientId,
    result,
  ];
  return candidates.find((id): id is string => typeof id === "string");
}

/** Local UUIDs must never be sent through Convex's ID validators. */
function hasLocalEntityId(args: Record<string, unknown>): boolean {
  return [
    args.patientId,
    args.visitId,
    args.appointmentId,
    args.appointmentId1,
    args.appointmentId2,
    args.installmentId,
    args.parentVisitId,
  ].some((id) => typeof id === "string" && isLocalId(id));
}

async function findOfflineRecord(
  table: {
    get(id: string): Promise<any>;
    where(index: string): { equals(id: string): { first(): Promise<any> } };
  },
  id: string,
): Promise<any> {
  return (await table.get(id)) ?? table.where("_serverId").equals(id).first();
}
