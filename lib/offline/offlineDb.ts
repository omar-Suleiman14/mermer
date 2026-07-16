import Dexie, { type Table } from "dexie";

// ─── Types mirroring Convex schema for offline storage ──────────────────────

export type SyncStatus = "synced" | "pending" | "conflict";

/** Base fields added to every offline-cached record */
export interface OfflineMeta {
  /** Client-side UUID — primary key for offline-created records */
  _localId: string;
  /** Convex server ID — populated after first sync */
  _serverId: string | null;
  /** Whether this record has unsynced changes */
  _syncStatus: SyncStatus;
  /** Client-side modification timestamp (ms) for conflict resolution */
  _updatedAt: number;
  /** Monotonic version counter — incremented on every local write */
  _version: number;
  /** If true, this record was created offline and hasn't been synced yet */
  _isOfflineCreated: boolean;
}

// ─── Offline table shapes ───────────────────────────────────────────────────

export interface OfflinePatient extends OfflineMeta {
  doctorId: string;
  name: string;
  age: number;
  phone: string;
  additionalPhones?: string[];
  whatsappPhone?: string;
  address?: string;
  chronicConditions: string[];
  patientType?: string;
  notes?: string;
  gender?: "male" | "female" | "other";
  createdAt: number;
}

export interface OfflineVisit extends OfflineMeta {
  patientId: string; // may be a _localId if patient was also created offline
  doctorId: string;
  date: number;
  queueNumber?: number;
  source?: "manual" | "online" | "installment" | "follow-up";
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no-show" | "rescheduled";
  patientName?: string;
  patientPhone?: string;
  patientAge?: number;
  installmentId?: string;
  actionBy?: string;
  isPaid?: boolean;
  reasonForVisit?: string;
  prescribedMedications?: (string | { name: string; frequency?: string; notes?: string })[];
  analysisRequested?: string[];
  notes?: string;
  diagnosis?: string;
  measurements?: string;
  vitals?: string;
  createdAt: number;
}

export interface OfflineQueue extends OfflineMeta {
  doctorId: string;
  patientId: string; // may be a _localId
  queueDate?: number;
  position: number;
  status: "waiting" | "in-progress" | "done";
  addedAt: number;
  scheduledTime?: number;
  reminderSent: boolean;
  visitId?: string;
  patientName?: string;
  patientPhone?: string;
}

export interface OfflineFollowUp extends OfflineMeta {
  doctorId: string;
  patientId: string;
  visitId?: string;
  parentVisitId?: string;
  patientName: string;
  followUpDate: number;
  followUpTime: string;
  type: "in-person" | "call" | "whatsapp";
  note?: string;
  status: "scheduled" | "done" | "cancelled";
  createdAt: number;
}

/** Cached installment plans. These are read offline; mutations remain server-backed. */
export interface OfflineInstallment extends OfflineMeta {
  doctorId: string;
  patientId: string;
  status?: "active" | "completed" | "expired" | "cancelled";
  totalAmount?: number;
  downPayment?: number;
  costPerVisit?: number;
  numVisits?: number;
  completedVisits?: number;
  paidVisits?: number;
  unpaidBalance?: number;
  nextVisitDate?: number;
  createdAt?: number;
  [key: string]: unknown;
}

// ─── Sync Queue ─────────────────────────────────────────────────────────────

export type SyncOperation =
  | "create"
  | "update"
  | "delete"
  | "addManualAppointment"
  | "updateAppointment"
  | "swapAppointments";
export type SyncEntryStatus = "pending" | "in-flight" | "failed" | "completed";

export interface SyncQueueEntry {
  id?: number; // Auto-increment PK
  /** Idempotency key — sent to the server to prevent duplicate operations */
  idempotencyKey: string;
  /** Which Dexie table this operation targets */
  table: "patients" | "visits" | "queue" | "followUps";
  /** CRUD operation type */
  operation: SyncOperation;
  /** Local UUID of the record being operated on */
  localId: string;
  /** Convex server ID (for updates/deletes of existing records) */
  serverId: string | null;
  /** The full mutation arguments to replay */
  payload: Record<string, unknown>;
  /** When this entry was created (for FIFO ordering) */
  createdAt: number;
  /** Current processing status */
  status: SyncEntryStatus;
  /** Number of sync attempts */
  retryCount: number;
  /** Last error message if sync failed */
  lastError?: string;
  /** If this entry depends on another entry's success (e.g., queue depends on patient create) */
  dependsOnIdempotencyKey?: string;
}

// ─── ID Remap ───────────────────────────────────────────────────────────────

export interface IdRemapEntry {
  /** Composite key: `table:localId` */
  key: string;
  table: string;
  localId: string;
  serverId: string;
  createdAt: number;
}

// ─── Sync Metadata ──────────────────────────────────────────────────────────

export interface SyncMetaEntry {
  key: string; // e.g., "lastHydrationTimestamp", "lastSyncTimestamp"
  value: string | number | boolean;
}

// ─── Dexie Database ─────────────────────────────────────────────────────────

export class MermerOfflineDB extends Dexie {
  patients!: Table<OfflinePatient, string>;
  visits!: Table<OfflineVisit, string>;
  queue!: Table<OfflineQueue, string>;
  followUps!: Table<OfflineFollowUp, string>;
  installments!: Table<OfflineInstallment, string>;
  syncQueue!: Table<SyncQueueEntry, number>;
  idRemap!: Table<IdRemapEntry, string>;
  syncMeta!: Table<SyncMetaEntry, string>;

  constructor() {
    super("mermer-offline");

    this.version(1).stores({
      // _localId is the primary key (UUID) for all data tables
      patients: "_localId, _serverId, _syncStatus, doctorId, phone, name",
      visits: "_localId, _serverId, _syncStatus, doctorId, patientId, date",
      queue: "_localId, _serverId, _syncStatus, doctorId, queueDate",
      followUps: "_localId, _serverId, _syncStatus, doctorId, patientId, followUpDate",

      // Sync queue uses auto-increment PK for strict FIFO ordering
      syncQueue: "++id, status, table, idempotencyKey, createdAt",

      // ID remap: composite key "table:localId"
      idRemap: "key, table, localId, serverId",

      // Key-value store for sync metadata
      syncMeta: "key",
    });

    // Versioned separately so existing clients upgrade their cache in place.
    this.version(2).stores({
      patients: "_localId, _serverId, _syncStatus, doctorId, phone, name",
      visits: "_localId, _serverId, _syncStatus, doctorId, patientId, date",
      queue: "_localId, _serverId, _syncStatus, doctorId, queueDate",
      followUps: "_localId, _serverId, _syncStatus, doctorId, patientId, followUpDate",
      installments: "_localId, _serverId, _syncStatus, doctorId, patientId, status, nextVisitDate",
      syncQueue: "++id, status, table, idempotencyKey, createdAt",
      idRemap: "key, table, localId, serverId",
      syncMeta: "key",
    });
  }
}

// Singleton instance
export const offlineDb = new MermerOfflineDB();

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate offline metadata for a new record */
export function createOfflineMeta(serverId?: string): OfflineMeta {
  return {
    _localId: crypto.randomUUID(),
    _serverId: serverId ?? null,
    _syncStatus: serverId ? "synced" : "pending",
    _updatedAt: Date.now(),
    _version: 1,
    _isOfflineCreated: !serverId,
  };
}

/** Look up a record by either its local ID or server ID */
export async function findRecord<T extends OfflineMeta>(
  table: Table<T, string>,
  id: string
): Promise<T | undefined> {
  // Try local ID first (primary key lookup is fastest)
  const byLocal = await table.get(id);
  if (byLocal) return byLocal;

  // Fall back to server ID index
  return table.where("_serverId").equals(id).first();
}
