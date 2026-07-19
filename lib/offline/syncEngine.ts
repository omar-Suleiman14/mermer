import { ConvexReactClient } from "convex/react";
import { offlineDb } from "./offlineDb";
import {
  getPendingEntries,
  getPendingCount,
  markInFlight,
  markCompleted,
  markFailed,
  recoverInFlightEntries,
  areDependenciesResolved,
  cascadeFailure,
  purgeCompletedEntries,
} from "./syncQueue";
import { registerIdMapping, resolvePayloadIds, isLocalId } from "./idRemap";
import { ConnectionDetector } from "./connectionDetector";

// ─── Types ──────────────────────────────────────────────────────────────────

type MutationFn = (args: Record<string, unknown>) => Promise<unknown>;

interface SyncEngineConfig {
  /** The Convex client to use for mutations */
  convexClient: ConvexReactClient;
  /** The connection detector instance */
  connectionDetector: ConnectionDetector;
  /** Callback when pending sync count changes */
  onPendingCountChange?: (count: number) => void;
  /** Callback when sync completes (queue fully drained) */
  onSyncComplete?: () => void;
  /** Callback when an individual entry fails */
  onEntryFailed?: (entry: { table: string; operation: string; error: string }) => void;
  /** Max retries per entry before giving up */
  maxRetries?: number;
}

// ─── Mutation Registry ──────────────────────────────────────────────────────
//
// Maps table+operation to the Convex mutation function reference.
// This is populated by calling `registerMutation()` during app initialization.

interface MutationRegistryEntry {
  table: string;
  operation: string;
  mutationFn: MutationFn;
}

const mutationRegistry = new Map<string, MutationRegistryEntry>();

function registryKey(table: string, operation: string): string {
  return `${table}:${operation}`;
}

/**
 * Register a Convex mutation function for a specific table and operation.
 * Must be called during app initialization for each table/operation combo.
 *
 * Usage:
 * ```typescript
 * registerMutation("patients", "create", (args) => convexClient.mutation(api.patients.createPatient, args));
 * ```
 */
export function registerMutation(
  table: string,
  operation: string,
  mutationFn: MutationFn
): void {
  mutationRegistry.set(registryKey(table, operation), {
    table,
    operation,
    mutationFn,
  });
}

/**
 * Clear all registered mutations (for cleanup/testing).
 */
export function clearMutationRegistry(): void {
  mutationRegistry.clear();
}

// ─── Sync Engine ────────────────────────────────────────────────────────────

export class SyncEngine {
  private _config: Required<SyncEngineConfig>;
  private _isSyncing = false;
  private _isDestroyed = false;
  private _unsubscribeConnection: (() => void) | null = null;
  private _syncTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: SyncEngineConfig) {
    this._config = {
      maxRetries: 5,
      onPendingCountChange: () => {},
      onSyncComplete: () => {},
      onEntryFailed: () => {},
      ...config,
    };
  }

  /**
   * Start the sync engine. Call this once during app initialization.
   *
   * It will:
   * 1. Recover any in-flight entries from a previous crash
   * 2. Subscribe to connection status changes
   * 3. Start syncing if already online with pending entries
   */
  async start(): Promise<void> {
    if (this._isDestroyed) return;

    console.log("[SyncEngine] Starting...");

    // Recover entries that were in-flight during a crash/page close
    const recovered = await recoverInFlightEntries();
    if (recovered > 0) {
      console.log(`[SyncEngine] Recovered ${recovered} in-flight entries`);
    }

    // Update pending count
    await this._notifyPendingCount();

    // Listen for connection changes
    this._unsubscribeConnection = this._config.connectionDetector.subscribe(
      (status) => {
        if (status === "reconnecting" || status === "online") {
          // Connection restored — start syncing
          void this.sync();
        }
      }
    );

    // If we're already online, check for pending entries
    if (this._config.connectionDetector.status !== "offline") {
      const pending = await getPendingCount();
      if (pending > 0) {
        void this.sync();
      }
    }
  }

  /**
   * Stop the sync engine and clean up resources.
   */
  destroy(): void {
    this._isDestroyed = true;
    this._isSyncing = false;
    this._unsubscribeConnection?.();
    this._unsubscribeConnection = null;

    if (this._syncTimeout) {
      clearTimeout(this._syncTimeout);
      this._syncTimeout = null;
    }

    console.log("[SyncEngine] Destroyed");
  }

  /**
   * Trigger a sync cycle. Drains all pending entries in FIFO order.
   * Safe to call multiple times — concurrent calls are coalesced.
   */
  async sync(): Promise<void> {
    if (this._isSyncing || this._isDestroyed) return;

    this._isSyncing = true;
    console.log("[SyncEngine] Sync started");

    try {
      // Only mark as reconnecting when there are actionable entries to drain
      const actionableCount = await getPendingCount();
      if (actionableCount > 0) {
        this._config.connectionDetector.markReconnecting();
      }

      let processedCount = 0;
      let failedCount = 0;

      // Process entries in FIFO order
      while (!this._isDestroyed) {
        const entries = await getPendingEntries();
        if (entries.length === 0) break;

        // Check if we're still connected
        if (this._config.connectionDetector.status === "offline") {
          console.log("[SyncEngine] Lost connection during sync, pausing");
          break;
        }

        // Process the first entry whose dependencies are resolved
        let processed = false;
        for (const entry of entries) {
          if (entry.id === undefined) continue;

          // Check dependencies
          const depsResolved = await areDependenciesResolved(entry);
          if (!depsResolved) {
            continue; // Skip this entry, try the next one
          }

          // Check retry limit
          if (entry.retryCount >= this._config.maxRetries) {
            console.warn(
              `[SyncEngine] Entry ${entry.idempotencyKey} exceeded max retries, marking failed`
            );
            await markFailed(entry.id, `Exceeded max retries (${this._config.maxRetries})`);
            await cascadeFailure(entry.idempotencyKey);
            failedCount++;
            this._config.onEntryFailed({
              table: entry.table,
              operation: entry.operation,
              error: `Exceeded max retries`,
            });
            await this._notifyPendingCount();
            processed = true;
            break;
          }

          // Process this entry
          const success = await this._processEntry(entry);
          if (success) {
            processedCount++;
          } else {
            failedCount++;
          }

          await this._notifyPendingCount();
          processed = true;
          break; // Re-fetch the queue to get fresh state
        }

        if (!processed) {
          // All remaining entries have unresolved dependencies — wait and retry
          console.log("[SyncEngine] All remaining entries have unresolved deps, waiting...");
          break;
        }
      }

      // Clean up completed entries
      await purgeCompletedEntries();

      // Check if everything synced
      const remaining = await getPendingCount();
      if (remaining === 0) {
        console.log(
          `[SyncEngine] Sync complete! Processed: ${processedCount}, Failed: ${failedCount}`
        );
        this._config.connectionDetector.markOnline();
        this._config.onSyncComplete();
      } else {
        console.log(
          `[SyncEngine] Sync paused. Processed: ${processedCount}, Remaining: ${remaining}`
        );
        // Schedule a retry for remaining entries
        this._scheduleRetry();
      }
    } catch (err) {
      console.error("[SyncEngine] Sync cycle error:", err);
    } finally {
      this._isSyncing = false;
    }
  }

  /**
   * Process a single sync queue entry.
   * Returns true if successful, false if failed.
   */
  private async _processEntry(
    entry: NonNullable<Awaited<ReturnType<typeof getPendingEntries>>[0]>
  ): Promise<boolean> {
    const entryId = entry.id!;

    try {
      // Mark as in-flight
      await markInFlight(entryId);

      // Look up the mutation function
      const key = registryKey(entry.table, entry.operation);
      const registration = mutationRegistry.get(key);

      if (!registration) {
        console.error(
          `[SyncEngine] No mutation registered for ${key}. ` +
            `Register with registerMutation("${entry.table}", "${entry.operation}", fn)`
        );
        await markFailed(entryId, `No mutation registered for ${key}`);
        return false;
      }

      // Resolve any local IDs in the payload to server IDs
      let payload = { ...entry.payload };
      payload = await resolvePayloadIds(payload);

      // Add idempotency key to payload
      payload._idempotencyKey = entry.idempotencyKey;

      // Execute the Convex mutation
      const result = await registration.mutationFn(payload);

      // If this was a create operation, register the ID mapping
      if ((entry.operation === "create" || entry.operation === "addManualAppointment") && result) {
        const serverId =
          typeof result === "string"
            ? result
            : (result as Record<string, unknown>)?._id as string ??
              (result as Record<string, unknown>)?.id as string ??
              (result as Record<string, unknown>)?.visitId as string;

        if (serverId && isLocalId(entry.localId)) {
          await registerIdMapping(entry.table, entry.localId, serverId);

          // Update the local Dexie record with the server ID
          const dexieTable = offlineDb[entry.table as keyof typeof offlineDb] as
            import("dexie").Table<Record<string, unknown>, string>;

          const localRecord = await dexieTable.get(entry.localId);
          if (localRecord) {
            await dexieTable.update(entry.localId, {
              _serverId: serverId,
              _syncStatus: "synced",
              _isOfflineCreated: false,
            });
          }
        }
      }

      // If this was a delete, remove the local record
      if (entry.operation === "delete") {
        const dexieTable = offlineDb[entry.table as keyof typeof offlineDb] as
          import("dexie").Table<Record<string, unknown>, string>;
        await dexieTable.delete(entry.localId);
      }

      // If this was an update, mark as synced
      if (entry.operation === "update" || entry.operation === "updateAppointment" || entry.operation === "swapAppointments") {
        const dexieTable = offlineDb[entry.table as keyof typeof offlineDb] as
          import("dexie").Table<Record<string, unknown>, string>;
        const localRecord = await dexieTable.get(entry.localId);
        if (localRecord) {
          await dexieTable.update(entry.localId, {
            _syncStatus: "synced",
          });
        }
      }

      // Mark entry as completed
      await markCompleted(entryId);

      console.log(
        `[SyncEngine] ✓ ${entry.table}.${entry.operation} (${entry.idempotencyKey})`
      );

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      // Check if this is a "duplicate" error (idempotency hit)
      if (isDuplicateError(err)) {
        console.log(
          `[SyncEngine] Idempotency hit for ${entry.idempotencyKey}, marking completed`
        );
        await markCompleted(entryId);
        return true;
      }

      // Check if this is a network error (should retry later)
      if (isNetworkError(err)) {
        console.warn(
          `[SyncEngine] Network error for ${entry.idempotencyKey}, will retry`
        );
        const existing = await offlineDb.syncQueue.get(entryId);
        await offlineDb.syncQueue.update(entryId, {
          status: "pending",
          lastError: errorMsg,
          retryCount: existing?.retryCount ? existing.retryCount + 1 : 1,
        });
        return false;
      }

      // Validation / business logic error — mark as failed
      console.error(
        `[SyncEngine] ✗ ${entry.table}.${entry.operation} (${entry.idempotencyKey}):`,
        errorMsg
      );
      await markFailed(entryId, errorMsg);

      this._config.onEntryFailed({
        table: entry.table,
        operation: entry.operation,
        error: errorMsg,
      });

      return false;
    }
  }

  private _scheduleRetry(delayMs: number = 10_000): void {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);

    this._syncTimeout = setTimeout(() => {
      this._syncTimeout = null;
      if (!this._isDestroyed && this._config.connectionDetector.status !== "offline") {
        void this.sync();
      }
    }, delayMs);
  }

  private async _notifyPendingCount(): Promise<void> {
    const count = await getPendingCount();
    this._config.onPendingCountChange(count);
  }

  /** Force a manual sync (e.g., triggered by user) */
  async manualSync(): Promise<void> {
    this._isSyncing = false; // Reset the lock
    await this.sync();
  }
}

// ─── Error Classification ───────────────────────────────────────────────────

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

function isDuplicateError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("duplicate") ||
      msg.includes("idempotency") ||
      msg.includes("already exists") ||
      msg.includes("conflict")
    );
  }
  return false;
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _engineInstance: SyncEngine | null = null;

/**
 * Get or create the global sync engine instance.
 * Call `initSyncEngine()` first to configure it.
 */
export function getSyncEngine(): SyncEngine | null {
  return _engineInstance;
}

/**
 * Initialize the global sync engine. Call once during app startup.
 */
export function initSyncEngine(config: SyncEngineConfig): SyncEngine {
  if (_engineInstance) {
    _engineInstance.destroy();
  }

  _engineInstance = new SyncEngine(config);
  void _engineInstance.start();
  return _engineInstance;
}

/**
 * Destroy the global sync engine. Call during app teardown.
 */
export function destroySyncEngine(): void {
  if (_engineInstance) {
    _engineInstance.destroy();
    _engineInstance = null;
  }
}
