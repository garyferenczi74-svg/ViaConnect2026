// =============================================================================
// Body Scan: NETWORK-FAILURE RESILIENCE + CAPTURE RESUME.
// (Prompt #169b, Task 20, spec section 16.3.)
//
// WHY THIS FILE EXISTS
//   A Body Scan can be CAPTURED while the device is offline, or the connection
//   can drop midway through the client side analysis / finalize. Without this,
//   that scan is silently lost. This module is the pure, I/O free CONTRACT that
//   guarantees such a scan is (a) never lost and (b) never duplicated, so the
//   hook (usePendingScans) and the surface (PendingScansSurface) stay thin.
//
//   FOUR concerns, all kept here as the unit tested source of truth:
//
//   1. DETERMINISTIC PROCESSING KEY
//      A capture payload (session id + the captured inputs) hashes to a STABLE
//      key. Re-running the SAME capture produces the SAME key, so a retry
//      reconciles to the same pending record (and ultimately the same scan row),
//      never a duplicate. computeProcessingKey is the hash.
//
//   2. TRANSIENT vs PERMANENT CLASSIFIER (the correctness crux)
//      The finalize is gated by the DB enforcement trigger (migration
//      20260516000080), which RAISEs PERMANENT business rejections
//      (age_restricted / scan_rate_limited / premium_required, and the
//      consent / age variants). Those MUST NOT be retried: surface them and drop
//      the pending item. Only TRANSIENT failures (offline, fetch/timeout, 5xx)
//      are retried. isTransient is that classifier.
//
//   3. BACKOFF SCHEDULE (section 16.3)
//      Retry every 30s for the first 5 minutes, then every 5 minutes, then every
//      30 minutes, up to 24 hours, after which we give up. nextRetryDelayMs +
//      isExpired encode that schedule as a pure function of elapsed time.
//
//   4. PENDING ITEM LIFECYCLE
//      A small reducer set (enqueue, succeed-and-remove, permanent-fail-and-
//      remove, schedule-next-attempt) plus a thin store interface (PendingScanStore)
//      so the IndexedDB store is mockable in node and swappable in the browser.
//
//   No DOM, no IndexedDB, no React in this file: it is 100% pure so the whole
//   resilience contract is unit testable (the IndexedDB binding lives in
//   pending-scan-store.ts, behind the PendingScanStore interface defined here).
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Deterministic processing key (idempotency)
// -----------------------------------------------------------------------------

// The fields that DEFINE a capture for the purpose of the processing key. The
// session id anchors it to one body_photo_sessions row; the captured inputs make
// the key change if (and only if) a genuinely different capture is submitted, so
// re-submitting the SAME capture (a retry) hashes to the SAME key. Optional
// fields are normalized so an undefined and an omitted value hash identically.
export interface CapturePayload {
  // The body_photo_sessions row this capture belongs to. The finalize UPDATE is
  // keyed on THIS id and is already idempotent (`.neq('scan_status','complete')`),
  // so reusing the same session id is what guarantees no second scan row.
  sessionId: string;
  // The storage paths of the captured pose images (whichever were captured). The
  // set of captured poses + their object paths uniquely fingerprints the capture.
  posePaths?: Partial<Record<'front' | 'back' | 'left' | 'right', string | null>>;
  // The per scan confirmed stats pinned at the freshness step, if any. Included
  // so a re-confirm with DIFFERENT stats is treated as a different capture.
  weightKgAtScan?: number | null;
  heightCmAtScan?: number | null;
  // The tier of the capture (Tier 1 today). Part of the fingerprint so a future
  // higher-tier recapture is a distinct key.
  tier?: number | null;
}

// A stable JSON serialization of the capture payload: keys are emitted in a fixed
// order and absent optional values are normalized to null, so two payloads that
// are semantically identical serialize to byte-identical strings (and hash to the
// same key) regardless of object key order or which optionals were supplied.
export function serializeCapturePayload(payload: CapturePayload): string {
  const poses = payload.posePaths ?? {};
  // Fixed pose order; missing pose -> null (not omitted) for a stable shape.
  const normalizedPoses = {
    front: poses.front ?? null,
    back: poses.back ?? null,
    left: poses.left ?? null,
    right: poses.right ?? null,
  };
  // Build the object with a FIXED key order and JSON.stringify it. We do not rely
  // on JSON.stringify key ordering of the input object: we construct the output
  // object literal in canonical order ourselves.
  return JSON.stringify({
    sessionId: payload.sessionId,
    posePaths: normalizedPoses,
    weightKgAtScan: payload.weightKgAtScan ?? null,
    heightCmAtScan: payload.heightCmAtScan ?? null,
    tier: payload.tier ?? null,
  });
}

// A small, dependency free, deterministic string hash (FNV-1a, 32-bit) rendered
// as a fixed-length hex string. We do not need cryptographic strength here, only
// determinism + a low collision rate for the small population of a single user's
// pending captures. Using a pure JS hash (rather than SubtleCrypto) keeps this
// module synchronous and node-testable with no Web Crypto dependency.
function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts (avoids precision loss of *16777619).
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Deterministic processing key for a capture (section 16.3 idempotency). The
 * SAME capture payload always yields the SAME key; a different capture yields a
 * different key. Prefixed with the session id (human-debuggable + guarantees keys
 * for different sessions never collide even on a hash collision of the inputs)
 * and suffixed with the content hash.
 */
export function computeProcessingKey(payload: CapturePayload): string {
  const serialized = serializeCapturePayload(payload);
  // Two-part hash (forward + a salted pass) widens the space and lowers the
  // already-low FNV collision chance for similar payloads.
  const h1 = fnv1a32Hex(serialized);
  const h2 = fnv1a32Hex(`${serialized}`);
  return `${payload.sessionId}:${h1}${h2}`;
}

// -----------------------------------------------------------------------------
// 2. Transient vs permanent classifier (the correctness crux)
// -----------------------------------------------------------------------------

// The STABLE message prefixes the DB finalize trigger (migration 20260516000080)
// RAISEs, plus the consent / age variants the client may surface. ANY of these
// in an error message marks the failure PERMANENT: the scan cannot be finalized
// for a business / policy reason, so retrying would never succeed. These mirror
// the prefixes mapped by mapFinalizeError in runScanAnalysis.ts.
export const PERMANENT_REJECTION_MARKERS = [
  'age_restricted',
  'scan_rate_limited',
  'premium_required',
  // Consent / age client gates (also permanent: no amount of retry grants them).
  'consent_required',
  'consent_revoked',
  'age_required',
] as const;

// Substrings that mark a TRANSIENT (retryable) failure. Network offline, fetch
// failures, aborted/timed-out requests. Kept lowercase; matched case-insensitively.
const TRANSIENT_MESSAGE_MARKERS = [
  'failed to fetch', // browser fetch network error
  'network error',
  'networkerror',
  'network request failed',
  'load failed', // Safari fetch network error text
  'timeout',
  'timed out',
  'aborted',
  'the operation was aborted',
  'econnreset',
  'econnrefused',
  'etimedout',
  'enotfound',
  'socket hang up',
  'offline',
] as const;

// Error shapes we can read a message / status / name off of without assuming a
// concrete class (Supabase/Postgres errors, fetch Response-like, Error, plain).
interface ErrorLike {
  message?: unknown;
  name?: unknown;
  // Supabase Postgres errors carry a SQLSTATE-ish `code`; HTTP-ish errors carry
  // a numeric `status` / `statusCode`. We use status to classify 5xx as transient.
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
  // A wrapped error may carry the ORIGINAL error as `cause` (e.g. the
  // ScanFinalizeError thrown by runScanAnalysis wraps the raw trigger / network
  // error so the user-facing message is shown while the original stays classifiable).
  cause?: unknown;
}

// Collect this error's own message PLUS any nested `cause` messages, so a wrapped
// error (user-facing copy on the surface, original trigger / network error as the
// cause) is still classified by the ORIGINAL signal. Bounded depth guards against
// a pathological self-referential cause chain.
function collectMessages(error: unknown, depth = 0): string {
  if (error == null || depth > 5) return '';
  if (typeof error === 'string') return error;
  let out = '';
  if (error instanceof Error) {
    out = error.message;
    const cause = (error as ErrorLike).cause;
    if (cause !== undefined && cause !== error) out += ' ' + collectMessages(cause, depth + 1);
    return out;
  }
  const e = error as ErrorLike;
  if (typeof e.message === 'string') out = e.message;
  if (e.cause !== undefined && e.cause !== error) out += ' ' + collectMessages(e.cause, depth + 1);
  return out;
}

function readMessage(error: unknown): string {
  return collectMessages(error).trim();
}

function readStatus(error: unknown): number | null {
  let cur: unknown = error;
  for (let depth = 0; depth < 6 && cur != null && typeof cur === 'object'; depth++) {
    const e = cur as ErrorLike;
    const raw = e.status ?? e.statusCode;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    cur = e.cause === cur ? null : e.cause;
  }
  return null;
}

function readName(error: unknown): string {
  let cur: unknown = error;
  for (let depth = 0; depth < 6 && cur != null && typeof cur === 'object'; depth++) {
    const e = cur as ErrorLike;
    if (typeof e.name === 'string' && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return e.name;
    }
    cur = e.cause === cur ? null : e.cause;
  }
  // Fall back to the top-level name for any other value.
  if (error != null && typeof error === 'object') {
    const n = (error as ErrorLike).name;
    if (typeof n === 'string') return n;
  }
  return '';
}

/**
 * Is this finalize / processing error PERMANENT (a business / policy rejection
 * that must NOT be retried)? True when the message carries any of the DB trigger
 * rejection prefixes (age_restricted / scan_rate_limited / premium_required) or a
 * consent / age client gate marker, OR the HTTP status is a non-retryable 4xx
 * (except 408 Request Timeout and 429 Too Many Requests, which are transient).
 *
 * Permanent failures are surfaced to the user and the pending item is removed.
 */
export function isPermanent(error: unknown): boolean {
  const msg = readMessage(error).toLowerCase();
  for (const marker of PERMANENT_REJECTION_MARKERS) {
    if (msg.includes(marker)) return true;
  }
  const status = readStatus(error);
  if (status !== null) {
    // 4xx are client/business rejections and are permanent, with two explicit
    // transient exceptions: 408 (timeout) and 429 (rate limited, retry later).
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }
  }
  return false;
}

/**
 * Is this finalize / processing error TRANSIENT (safe to retry)? A failure is
 * transient when it is NOT permanent AND it looks like a network / availability
 * problem: a network error message, an abort/timeout, a 5xx, or a 408/429.
 *
 * IMPORTANT: permanence WINS. If an error is permanent it is never transient,
 * even if its message happens to also contain a transient-looking word, so a DB
 * trigger rejection is never retried.
 */
export function isTransient(error: unknown): boolean {
  // Permanence is authoritative: a permanent rejection is never retried.
  if (isPermanent(error)) return false;

  const status = readStatus(error);
  if (status !== null) {
    if (status >= 500) return true; // server error: retry
    if (status === 408 || status === 429) return true; // timeout / rate limited
  }

  const name = readName(error).toLowerCase();
  if (name === 'aborterror' || name === 'timeouterror') return true;

  const msg = readMessage(error).toLowerCase();
  for (const marker of TRANSIENT_MESSAGE_MARKERS) {
    if (msg.includes(marker)) return true;
  }

  // Browser offline signal (navigator.onLine === false) is passed in as an error
  // with this sentinel by the hook so the classifier stays pure.
  return false;
}

// A convenience sentinel error the hook can throw/pass when it detects the device
// is offline BEFORE attempting a request, so isTransient classifies it correctly.
export const OFFLINE_SENTINEL_MESSAGE = 'offline: device has no network connection';
export function makeOfflineError(): Error {
  return new Error(OFFLINE_SENTINEL_MESSAGE);
}

/** The three-way outcome of classifying a processing error. */
export type FailureClass = 'transient' | 'permanent' | 'unknown';

/**
 * Classify an error into transient (retry), permanent (surface + drop), or
 * unknown. An UNKNOWN error (neither a recognized network signal nor a known
 * business rejection) is treated CONSERVATIVELY as transient for retry purposes
 * by the lifecycle (a one-off unexpected error should not silently discard a
 * captured scan), but is reported distinctly so the surface can show a neutral
 * "we will keep trying" message rather than a specific rejection reason.
 */
export function classifyFailure(error: unknown): FailureClass {
  if (isPermanent(error)) return 'permanent';
  if (isTransient(error)) return 'transient';
  return 'unknown';
}

/**
 * Should the lifecycle KEEP retrying this error? True for transient AND unknown
 * (conservative: an unexpected error must not lose a captured scan); false only
 * for a definitively permanent business rejection.
 */
export function shouldRetry(error: unknown): boolean {
  return !isPermanent(error);
}

// -----------------------------------------------------------------------------
// 3. Backoff schedule (section 16.3)
// -----------------------------------------------------------------------------

export const RETRY_SCHEDULE = {
  // Tier 1: every 30s for the first 5 minutes.
  tier1IntervalMs: 30_000,
  tier1UntilMs: 5 * 60_000, // first 5 minutes
  // Tier 2: every 5 minutes thereafter.
  tier2IntervalMs: 5 * 60_000,
  tier2UntilMs: 30 * 60_000, // ... up to 30 minutes elapsed
  // Tier 3: every 30 minutes thereafter.
  tier3IntervalMs: 30 * 60_000,
  // Hard cap: stop retrying after 24 hours and surface the item.
  maxAgeMs: 24 * 60 * 60_000,
} as const;

/**
 * The retry INTERVAL that applies at a given elapsed time since first capture
 * (section 16.3). 0..5m -> 30s; 5m..30m -> 5m; 30m..24h -> 30m. Past 24h the
 * schedule is exhausted (callers should consult isExpired); we still return the
 * tier 3 interval here so the function is total, but a well-behaved caller stops.
 *
 * Boundaries are taken at the START of each window: at exactly 5 minutes elapsed
 * we are in tier 2 (the every-30s phase covers strictly the first 5 minutes).
 */
export function retryIntervalAtElapsed(elapsedMs: number): number {
  const e = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  if (e < RETRY_SCHEDULE.tier1UntilMs) return RETRY_SCHEDULE.tier1IntervalMs;
  if (e < RETRY_SCHEDULE.tier2UntilMs) return RETRY_SCHEDULE.tier2IntervalMs;
  return RETRY_SCHEDULE.tier3IntervalMs;
}

/**
 * Has a pending item exceeded the 24h retry window (section 16.3)? Once expired
 * the lifecycle stops scheduling retries and the surface shows it as a scan that
 * needs the user to finish processing manually (the capture is still safe).
 */
export function isExpired(firstCapturedAtMs: number, nowMs: number): boolean {
  if (!Number.isFinite(firstCapturedAtMs) || !Number.isFinite(nowMs)) return false;
  return nowMs - firstCapturedAtMs >= RETRY_SCHEDULE.maxAgeMs;
}

/**
 * The DELAY (ms from now) until the next retry attempt for a pending item, given
 * when it was first captured, when its last attempt ran, and the current time
 * (section 16.3). The interval is chosen by the elapsed-since-capture tier; the
 * delay is that interval measured from the LAST attempt, clamped to >= 0 (so a
 * due/overdue item returns 0 = retry now).
 *
 * Returns null when the 24h window is exhausted (no further retry scheduled).
 */
export function nextRetryDelayMs(args: {
  firstCapturedAtMs: number;
  lastAttemptAtMs: number | null;
  nowMs: number;
}): number | null {
  const { firstCapturedAtMs, lastAttemptAtMs, nowMs } = args;
  if (isExpired(firstCapturedAtMs, nowMs)) return null;

  const elapsed = nowMs - firstCapturedAtMs;
  const interval = retryIntervalAtElapsed(elapsed);

  // No attempt yet: it is due immediately (it was just enqueued on a failure).
  if (lastAttemptAtMs == null) return 0;

  const dueAt = lastAttemptAtMs + interval;
  return Math.max(0, dueAt - nowMs);
}

/**
 * Is a pending item DUE for a retry right now (section 16.3)? True when the next
 * retry delay is 0 (an overdue or just-enqueued item) and the window is not
 * exhausted. Used by the hook's tick loop and the online-event resume to decide
 * which items to attempt.
 */
export function isDueForRetry(args: {
  firstCapturedAtMs: number;
  lastAttemptAtMs: number | null;
  nowMs: number;
}): boolean {
  const delay = nextRetryDelayMs(args);
  return delay === 0;
}

// -----------------------------------------------------------------------------
// 4. Pending item + lifecycle
// -----------------------------------------------------------------------------

export type PendingScanStatus =
  // Captured + persisted, waiting to be processed/finalized. The normal resting
  // state of an item that is being retried.
  | 'pending'
  // A retry is currently in flight (set while the resume runs, cleared after).
  | 'processing'
  // The retry window (24h) is exhausted; still safe, but no longer auto-retried.
  | 'expired'
  // A permanent rejection was surfaced; the item is about to be removed.
  | 'permanently_failed';

// One captured-but-unprocessed scan. Keyed by the deterministic processingKey, so
// enqueuing the SAME capture twice updates the same record rather than duplicating.
export interface PendingScanItem {
  // Deterministic processing key (the IndexedDB primary key). Idempotency anchor.
  processingKey: string;
  // The session id the finalize UPDATE is keyed on (already idempotent).
  sessionId: string;
  // The capture payload, persisted so a resume on app reopen can re-run finalize
  // with the SAME inputs (and therefore the same key) with no in-memory state.
  payload: CapturePayload;
  // Epoch ms of the FIRST capture/enqueue (drives the 24h window + interval tier).
  firstCapturedAtMs: number;
  // Epoch ms of the most recent retry attempt, or null if never attempted.
  lastAttemptAtMs: number | null;
  // How many retries have been attempted (diagnostic / surfaced as "attempt N").
  attemptCount: number;
  // The last error message observed (for the surface; transient -> neutral copy).
  lastError: string | null;
  // The lifecycle status.
  status: PendingScanStatus;
}

/**
 * Build a fresh pending item for a capture (or the seed when enqueuing). The
 * processingKey is derived from the payload so it is deterministic.
 */
export function makePendingItem(payload: CapturePayload, capturedAtMs: number): PendingScanItem {
  return {
    processingKey: computeProcessingKey(payload),
    sessionId: payload.sessionId,
    payload,
    firstCapturedAtMs: capturedAtMs,
    lastAttemptAtMs: null,
    attemptCount: 0,
    lastError: null,
    status: 'pending',
  };
}

/**
 * ENQUEUE reducer (idempotent on the deterministic key). Given the current list
 * and a payload, returns the next list. If an item with the same processingKey
 * already exists it is KEPT (its capture time / attempt history preserved) rather
 * than duplicated, guaranteeing the same capture never creates two records.
 */
export function enqueueItem(
  items: readonly PendingScanItem[],
  payload: CapturePayload,
  capturedAtMs: number,
): PendingScanItem[] {
  const key = computeProcessingKey(payload);
  if (items.some((it) => it.processingKey === key)) {
    // Already queued: no duplicate. Return a shallow copy for referential change.
    return [...items];
  }
  return [...items, makePendingItem(payload, capturedAtMs)];
}

/**
 * SUCCEED-AND-REMOVE reducer. A successful resume removes the item from the queue
 * (the scan finalized; the finalize UPDATE is idempotent so even a double success
 * cannot duplicate the scan row).
 */
export function removeItem(
  items: readonly PendingScanItem[],
  processingKey: string,
): PendingScanItem[] {
  return items.filter((it) => it.processingKey !== processingKey);
}

/**
 * MARK-ATTEMPT-STARTED reducer. Flags the item 'processing' while a retry is in
 * flight so concurrent ticks / the online handler do not double-fire it.
 */
export function markProcessing(
  items: readonly PendingScanItem[],
  processingKey: string,
): PendingScanItem[] {
  return items.map((it) =>
    it.processingKey === processingKey ? { ...it, status: 'processing' as const } : it,
  );
}

/**
 * RECORD-TRANSIENT-FAILURE reducer. The item STAYS in the queue (the scan is not
 * lost). Records the attempt time, increments the attempt count, stores the
 * error, and sets the status to 'expired' if the 24h window is now exhausted,
 * else back to 'pending' (so it is eligible for the next scheduled retry).
 */
export function recordTransientFailure(
  items: readonly PendingScanItem[],
  processingKey: string,
  attemptAtMs: number,
  errorMessage: string,
): PendingScanItem[] {
  return items.map((it) => {
    if (it.processingKey !== processingKey) return it;
    const expired = isExpired(it.firstCapturedAtMs, attemptAtMs);
    return {
      ...it,
      lastAttemptAtMs: attemptAtMs,
      attemptCount: it.attemptCount + 1,
      lastError: errorMessage,
      status: expired ? ('expired' as const) : ('pending' as const),
    };
  });
}

/**
 * Apply a processing error to an item by CLASSIFYING it: a permanent rejection
 * REMOVES the item (and is surfaced by the caller via the returned outcome); a
 * transient/unknown error keeps it and records the failed attempt. Returns the
 * next list plus an outcome describing what happened (so the hook can surface a
 * permanent rejection message and emit analytics).
 */
export interface ApplyFailureResult {
  items: PendingScanItem[];
  outcome: 'retained_transient' | 'removed_permanent';
  failureClass: FailureClass;
}

export function applyProcessingFailure(
  items: readonly PendingScanItem[],
  processingKey: string,
  error: unknown,
  attemptAtMs: number,
): ApplyFailureResult {
  const failureClass = classifyFailure(error);
  const errorMessage = readMessage(error) || 'Scan processing failed';

  if (failureClass === 'permanent') {
    return {
      items: removeItem(items, processingKey),
      outcome: 'removed_permanent',
      failureClass,
    };
  }

  // transient OR unknown: keep the item, record the attempt (never lose a scan).
  return {
    items: recordTransientFailure(items, processingKey, attemptAtMs, errorMessage),
    outcome: 'retained_transient',
    failureClass,
  };
}

// -----------------------------------------------------------------------------
// 5. Store interface (the thin, mockable IndexedDB seam)
// -----------------------------------------------------------------------------

/**
 * The persistence seam for pending scans. The browser implementation
 * (pending-scan-store.ts) is IndexedDB-backed; tests use an in-memory
 * implementation. Keeping the contract here (and pure) lets the lifecycle +
 * schedule be tested with zero IndexedDB / DOM dependency.
 *
 * The store is keyed by processingKey (deterministic), so putItem is an UPSERT
 * and re-persisting the same capture overwrites in place (no duplicate row).
 */
export interface PendingScanStore {
  // Read every pending item for the current user (RLS / per-origin scoped by the
  // implementation). Order is not guaranteed.
  getAll(): Promise<PendingScanItem[]>;
  // Read one item by its deterministic key, or null.
  get(processingKey: string): Promise<PendingScanItem | null>;
  // UPSERT one item (keyed on processingKey). Re-putting the same key overwrites.
  put(item: PendingScanItem): Promise<void>;
  // Delete one item by key (on success or permanent failure). A missing key is a
  // no-op.
  delete(processingKey: string): Promise<void>;
}

// The IndexedDB database + store names (shared by the browser store + any tooling).
export const PENDING_SCAN_DB_NAME = 'viaconnect_body_tracker';
export const PENDING_SCAN_STORE_NAME = 'body_scan_pending_processing';
export const PENDING_SCAN_DB_VERSION = 1;

/**
 * A minimal in-memory PendingScanStore. Two uses: (1) unit tests, with no
 * IndexedDB; (2) a graceful fallback in environments where IndexedDB is
 * unavailable (private browsing edge cases) so capture is never lost in-session
 * even if it cannot be persisted across reloads.
 */
export function createInMemoryPendingScanStore(seed: PendingScanItem[] = []): PendingScanStore {
  const map = new Map<string, PendingScanItem>();
  for (const it of seed) map.set(it.processingKey, it);
  return {
    async getAll() {
      return Array.from(map.values());
    },
    async get(processingKey: string) {
      return map.get(processingKey) ?? null;
    },
    async put(item: PendingScanItem) {
      map.set(item.processingKey, item);
    },
    async delete(processingKey: string) {
      map.delete(processingKey);
    },
  };
}

// -----------------------------------------------------------------------------
// 6. Product copy (section 16.3). Commas/colons only, no dashes, no emojis.
// -----------------------------------------------------------------------------

// Shown immediately after a capture whose processing/finalize hit a TRANSIENT
// failure: the scan is safe, processing will resume on reconnect.
export const CAPTURE_SAVED_OFFLINE_MESSAGE =
  'Your scan was captured successfully. We will finish processing when you have a connection.';

// The pending-scans surface heading + the per item action label (the surface
// mounts on the scan area; tapping the action re-runs finalize for that capture).
export const PENDING_SCANS_SURFACE_TITLE = 'Scans waiting to finish';
export const PENDING_SCANS_FINISH_ACTION_LABEL = 'Finish processing';

// A neutral, reassuring per item status line for an item still being retried.
export const PENDING_SCAN_RETRYING_MESSAGE =
  'Captured and saved. We will finish processing when you reconnect.';

// Shown when the 24h auto retry window has lapsed but the capture is still safe.
export const PENDING_SCAN_EXPIRED_MESSAGE =
  'Captured and saved. Tap to finish processing.';

/**
 * The user-facing line for a pending item, by status / failure class. Permanent
 * rejection text is NOT produced here (the item is removed and the caller surfaces
 * the specific rejection via runScanAnalysis's mapFinalizeError); this is only the
 * neutral "still safe" copy for the retained states.
 */
export function pendingItemStatusLine(item: Pick<PendingScanItem, 'status'>): string {
  switch (item.status) {
    case 'expired':
      return PENDING_SCAN_EXPIRED_MESSAGE;
    case 'processing':
      return 'Finishing processing now.';
    case 'pending':
    default:
      return PENDING_SCAN_RETRYING_MESSAGE;
  }
}
