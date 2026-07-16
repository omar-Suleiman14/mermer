"use client";

import { useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { useConnectionStatus } from "@/components/providers/ConnectionProvider";
import {
  offlineDb,
  createOfflineMeta,
  type OfflineMeta,
} from "@/lib/offline/offlineDb";
import { enqueueSyncOp } from "@/lib/offline/syncQueue";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

type OfflineTable = "patients" | "visits" | "queue" | "followUps";

interface UseOfflineMutationOptions {
  /** Which Dexie table this mutation writes to */
  table: OfflineTable;
  /**
   * The CRUD operation type.
   * - "create": inserts a new record
   * - "update": modifies an existing record (requires serverId or localId in args)
   * - "delete": removes a record
   */
  operation: "create" | "update" | "delete";
  /**
   * Optional function to extract/transform the mutation args into a Dexie record.
   * If not provided, the raw args are used directly.
   */
  toLocalRecord?: (
    args: Record<string, unknown>
  ) => Record<string, unknown>;
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
  onOfflineSuccess?: (localRecord: OfflineMeta & Record<string, unknown>) => void | Promise<void>;
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
  options: UseOfflineMutationOptions
): (args: FunctionArgs<Mutation>) => Promise<OfflineMutationResult> {
  const connectionStatus = useConnectionStatus();
  const convexMutation = useMutation(mutation);

  const { table, operation, toLocalRecord, dependsOnIdempotencyKey, onOnlineSuccess, onOfflineSuccess } = options;

  // Use ref to avoid stale closure over connectionStatus
  const statusRef = useRef(connectionStatus);
  statusRef.current = connectionStatus;

  const execute = useCallback(
    async (args: FunctionArgs<Mutation>): Promise<OfflineMutationResult> => {
      const isOnline = statusRef.current === "online";

      if (isOnline) {
        return executeOnline(args);
      }
      return executeOffline(args);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [convexMutation, table, operation]
  );

  // ── Online path: Convex mutation + mirror to Dexie ────────────────────
  async function executeOnline(
    args: FunctionArgs<Mutation>
  ): Promise<OfflineMutationResult> {
    try {
      const result = await convexMutation(args);

      // Mirror to Dexie for offline cache
      if (operation === "create" && result) {
        const serverRecord = typeof result === "object" ? result as Record<string, unknown> : { _id: result };
        const serverId = (serverRecord._id as string) ?? (result as string);

        const localRecord = toLocalRecord
          ? toLocalRecord(args as Record<string, unknown>)
          : (args as Record<string, unknown>);

        const meta = createOfflineMeta(serverId);

        await (offlineDb[table] as any).put({
          ...localRecord,
          ...meta,
          _serverId: serverId,
          _syncStatus: "synced",
        });

        await onOnlineSuccess?.(result);

        return { id: serverId, isOffline: false, idempotencyKey: null };
      }

      if (operation === "update" && result) {
        const serverId = (args as Record<string, unknown>).id as string
          ?? (args as Record<string, unknown>)._id as string
          ?? (args as Record<string, unknown>).patientId as string
          ?? (args as Record<string, unknown>).visitId as string;

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
        const serverId = (args as Record<string, unknown>).id as string
          ?? (args as Record<string, unknown>)._id as string;

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
        console.warn("[useOfflineMutation] Network error, falling back to offline:", err);
        return executeOffline(args);
      }
      throw err; // Re-throw validation errors, etc.
    }
  }

  // ── Offline path: Write to Dexie + enqueue sync ───────────────────────
  async function executeOffline(
    args: FunctionArgs<Mutation>
  ): Promise<OfflineMutationResult> {
    const dexieTable = offlineDb[table];

    if (operation === "create") {
      const meta = createOfflineMeta();
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
        operation: "create",
        localId: meta._localId,
        serverId: null,
        payload: args as Record<string, unknown>,
        dependsOnIdempotencyKey,
      });

      await onOfflineSuccess?.(record as any);

      return { id: meta._localId, isOffline: true, idempotencyKey };
    }

    if (operation === "update") {
      // Find the local record by server ID or local ID
      const targetId = (args as Record<string, unknown>).id as string
        ?? (args as Record<string, unknown>)._id as string
        ?? (args as Record<string, unknown>).patientId as string
        ?? (args as Record<string, unknown>).visitId as string;

      let existing = await dexieTable.get(targetId);
      if (!existing) {
        existing = await dexieTable
          .where("_serverId")
          .equals(targetId)
          .first();
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
          operation: "update",
          localId: existing._localId,
          serverId: existing._serverId,
          payload: args as Record<string, unknown>,
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
        operation: "update",
        localId: targetId,
        serverId: targetId,
        payload: args as Record<string, unknown>,
        dependsOnIdempotencyKey,
      });

      return { id: targetId, isOffline: true, idempotencyKey };
    }

    if (operation === "delete") {
      const targetId = (args as Record<string, unknown>).id as string
        ?? (args as Record<string, unknown>)._id as string;

      let existing = await dexieTable.get(targetId);
      if (!existing) {
        existing = await dexieTable
          .where("_serverId")
          .equals(targetId)
          .first();
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
