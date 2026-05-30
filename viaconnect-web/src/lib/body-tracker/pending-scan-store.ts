'use client';

// =============================================================================
// Body Scan: the IndexedDB-backed PendingScanStore (Prompt #169b, Task 20,
// spec section 16.3).
//
// This is the THIN browser binding for the pure PendingScanStore contract in
// pending-scan-sync.ts. All schedule / classifier / lifecycle logic is pure and
// unit tested there; this file only owns the IndexedDB plumbing (open, upgrade,
// get/put/delete) so it stays small and side-effect-isolated.
//
// STORE DESIGN:
//   db:    viaconnect_body_tracker  (version 1)
//   store: body_scan_pending_processing
//   key:   the DETERMINISTIC processingKey (keyPath 'processingKey'), so put is
//          an UPSERT and re-persisting the same capture overwrites in place,
//          never creating a duplicate record (idempotency guarantee).
//
// PERSIST-BEFORE-PROCESS:
//   The capture flow calls persistPendingCapture(payload) IMMEDIATELY after a
//   capture (before any analysis / finalize). If the app is killed or goes
//   offline mid-finalize, the record is already durable, so usePendingScans can
//   resume it on reopen / reconnect. The deterministic key means the resume
//   reconciles to the SAME record (and the same scan row).
//
// FAIL-SOFT:
//   In an environment with no IndexedDB (very old / locked-down private mode),
//   open() rejects and the hook falls back to the in-memory store, so a capture
//   is never lost within the session even if it cannot survive a reload.
// =============================================================================

import {
  PENDING_SCAN_DB_NAME,
  PENDING_SCAN_DB_VERSION,
  PENDING_SCAN_STORE_NAME,
  computeProcessingKey,
  createInMemoryPendingScanStore,
  makePendingItem,
  type CapturePayload,
  type PendingScanItem,
  type PendingScanStore,
} from './pending-scan-sync';

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

// Open (and upgrade-create) the database. Rejects if IndexedDB is unavailable.
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(PENDING_SCAN_DB_NAME, PENDING_SCAN_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PENDING_SCAN_STORE_NAME)) {
        // keyPath = processingKey makes put() an upsert on the deterministic key.
        db.createObjectStore(PENDING_SCAN_STORE_NAME, { keyPath: 'processingKey' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

/**
 * The IndexedDB-backed PendingScanStore. Each call opens a short-lived
 * connection (IndexedDB connections are cheap and this keeps us free of a
 * long-lived handle that a tab close would leave dangling). Throws if IndexedDB
 * is unavailable, so the caller can fall back to the in-memory store.
 */
export function createIndexedDbPendingScanStore(): PendingScanStore {
  return {
    async getAll(): Promise<PendingScanItem[]> {
      const db = await openDb();
      try {
        const tx = db.transaction(PENDING_SCAN_STORE_NAME, 'readonly');
        const store = tx.objectStore(PENDING_SCAN_STORE_NAME);
        const all = await promisifyRequest(store.getAll());
        return (all as PendingScanItem[]) ?? [];
      } finally {
        db.close();
      }
    },

    async get(processingKey: string): Promise<PendingScanItem | null> {
      const db = await openDb();
      try {
        const tx = db.transaction(PENDING_SCAN_STORE_NAME, 'readonly');
        const store = tx.objectStore(PENDING_SCAN_STORE_NAME);
        const row = await promisifyRequest(store.get(processingKey));
        return (row as PendingScanItem | undefined) ?? null;
      } finally {
        db.close();
      }
    },

    async put(item: PendingScanItem): Promise<void> {
      const db = await openDb();
      try {
        const tx = db.transaction(PENDING_SCAN_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PENDING_SCAN_STORE_NAME);
        await promisifyRequest(store.put(item));
        await txDone(tx);
      } finally {
        db.close();
      }
    },

    async delete(processingKey: string): Promise<void> {
      const db = await openDb();
      try {
        const tx = db.transaction(PENDING_SCAN_STORE_NAME, 'readwrite');
        const store = tx.objectStore(PENDING_SCAN_STORE_NAME);
        await promisifyRequest(store.delete(processingKey));
        await txDone(tx);
      } finally {
        db.close();
      }
    },
  };
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction error'));
  });
}

/**
 * Persist a captured scan to the pending store IMMEDIATELY after capture, before
 * any processing/finalize (section 16.3 persist-before-process). Idempotent on
 * the deterministic key: if the same capture is persisted again (e.g. the user
 * retried), the existing record's capture time + attempt history is PRESERVED
 * (we do not overwrite firstCapturedAtMs / attemptCount), so a re-persist never
 * resets the 24h window or the retry progress, and never creates a duplicate.
 *
 * Returns the (existing or newly created) item, or null if the store could not
 * be opened (the caller then keeps it only in memory for the session).
 */
export async function persistPendingCapture(
  payload: CapturePayload,
  capturedAtMs: number = Date.now(),
  store?: PendingScanStore,
): Promise<PendingScanItem | null> {
  let s: PendingScanStore;
  try {
    s = store ?? createIndexedDbPendingScanStore();
  } catch {
    return null;
  }
  try {
    const key = computeProcessingKey(payload);
    const existing = await s.get(key);
    if (existing) {
      // Preserve the original capture moment + retry history; do not reset it.
      return existing;
    }
    const item = makePendingItem(payload, capturedAtMs);
    await s.put(item);
    return item;
  } catch {
    // Fail-soft: a persistence error must not block the capture flow. The scan
    // is still attempted live; only cross-reload durability is lost.
    return null;
  }
}

/**
 * Resolve the best available PendingScanStore for the current environment:
 * IndexedDB when present, else a fresh in-memory store. Centralized so the hook
 * and the capture path agree on which store backs the queue.
 */
export function resolvePendingScanStore(): PendingScanStore {
  try {
    if (hasIndexedDB()) return createIndexedDbPendingScanStore();
  } catch {
    /* fall through to in-memory */
  }
  // No IndexedDB: an in-memory store keeps capture safe within the session
  // (cross-reload durability is lost, but the scan is never dropped live).
  return createInMemoryPendingScanStore();
}

// -----------------------------------------------------------------------------
// Cross-component in-flight lock (NO-DUPLICATE guarantee).
//
// Two independent surfaces can drive a scan for the SAME session id: the live
// RunScanButton.start() and the background PendingScansSurface retry loop
// (usePendingScans). As of Prompt #169b Task 20, runScanAnalysis is idempotent at
// the APP layer: the finalize UPDATE carries `.neq('scan_status','complete')` (a
// re-complete is a no-op) AND the body_scan_measurements INSERT is guarded by a
// pre-INSERT existence check (it is skipped when a row already exists for the
// session), with an early-return for the already-finalized-with-measurement case.
// That makes a SEQUENTIAL resume safe on its own. This lock additionally closes
// the CONCURRENT same-tab window: body_scan_measurements has only a non-unique
// session_id index (migration 20260416000100), so two analyses interleaving
// between the existence check and the INSERT could still race a duplicate.
//
// This module-level lock (keyed by session id, per tab) ensures at most ONE
// analysis runs for a given session at a time across BOTH callers. It is a
// best-effort, single-tab coordinator (not a cross-tab/distributed lock): the
// durable no-duplicate backstop is the app-layer idempotency in runScanAnalysis
// (and, as a Gary-gated follow-up, a partial UNIQUE index on
// body_scan_measurements(session_id) once live duplicates are verified absent);
// this lock just closes the same-tab concurrency window.
// -----------------------------------------------------------------------------

const inFlightSessions = new Set<string>();

/**
 * Try to acquire the in-flight lock for a session. Returns true if acquired (the
 * caller MUST releaseSessionLock in a finally), false if another caller in this
 * tab is already analyzing this session (the caller should skip).
 */
export function acquireSessionLock(sessionId: string): boolean {
  if (inFlightSessions.has(sessionId)) return false;
  inFlightSessions.add(sessionId);
  return true;
}

/** Release the in-flight lock for a session. Safe to call if not held. */
export function releaseSessionLock(sessionId: string): void {
  inFlightSessions.delete(sessionId);
}

/** Whether a session is currently being analyzed in this tab. */
export function isSessionInFlight(sessionId: string): boolean {
  return inFlightSessions.has(sessionId);
}
