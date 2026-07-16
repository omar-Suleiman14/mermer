import { offlineDb, type IdRemapEntry } from "./offlineDb";

// ─── ID Remap Service ───────────────────────────────────────────────────────
//
// When records are created offline, they get a client-side UUID as their
// _localId. Once the record syncs to Convex, we get back a server ID
// (e.g., "k17abc123"). This service tracks the mapping so that:
//
// 1. Dependent records (e.g., a queue entry referencing a patient) can
//    look up the server ID for their foreign keys.
// 2. After sync, we update all local references from localId → serverId.

/** Build the composite key for the remap table */
function remapKey(table: string, localId: string): string {
  return `${table}:${localId}`;
}

/**
 * Store a new local → server ID mapping.
 */
export async function registerIdMapping(
  table: string,
  localId: string,
  serverId: string
): Promise<void> {
  await offlineDb.idRemap.put({
    key: remapKey(table, localId),
    table,
    localId,
    serverId,
    createdAt: Date.now(),
  });
}

/**
 * Look up the server ID for a locally-created record.
 * Returns null if no mapping exists yet (record hasn't synced).
 */
export async function getServerId(
  table: string,
  localId: string
): Promise<string | null> {
  const entry = await offlineDb.idRemap.get(remapKey(table, localId));
  return entry?.serverId ?? null;
}

/**
 * Resolve an ID that might be either a local UUID or a server ID.
 * If it's a local ID with a known mapping, returns the server ID.
 * If it's already a server ID or has no mapping, returns the original.
 */
export async function resolveId(
  table: string,
  id: string
): Promise<string> {
  const serverId = await getServerId(table, id);
  return serverId ?? id;
}

/**
 * Resolve all local IDs in a payload object.
 * Scans known foreign key fields and replaces local UUIDs with server IDs.
 */
export async function resolvePayloadIds(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const resolved = { ...payload };

  // Known foreign key fields and their source tables
  const foreignKeyMap: Record<string, string> = {
    patientId: "patients",
    visitId: "visits",
    parentVisitId: "visits",
    installmentId: "installments",
  };

  for (const [field, sourceTable] of Object.entries(foreignKeyMap)) {
    const value = resolved[field];
    if (typeof value === "string" && isLocalId(value)) {
      const serverId = await getServerId(sourceTable, value);
      if (serverId) {
        resolved[field] = serverId;
      }
    }
  }

  return resolved;
}

/**
 * Check if an ID looks like a local UUID (as opposed to a Convex server ID).
 * Convex IDs are shorter and don't use hyphens.
 */
export function isLocalId(id: string): boolean {
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Get all mappings for a given table.
 */
export async function getAllMappings(
  table: string
): Promise<IdRemapEntry[]> {
  return offlineDb.idRemap.where("table").equals(table).toArray();
}

/**
 * Purge old mappings (records that have been synced for more than N days).
 * Keeps things tidy since old mappings are no longer needed once all
 * dependent records have also synced.
 */
export async function purgeOldMappings(
  maxAgeMs: number = 30 * 24 * 60 * 60 * 1000 // 30 days
): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;

  const old = await offlineDb.idRemap
    .filter((entry) => entry.createdAt < cutoff)
    .toArray();

  await offlineDb.idRemap.bulkDelete(old.map((e) => e.key));
  return old.length;
}
