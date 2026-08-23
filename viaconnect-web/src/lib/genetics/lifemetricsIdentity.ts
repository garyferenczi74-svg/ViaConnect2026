/**
 * src/lib/genetics/lifemetricsIdentity.ts
 *
 * Resolve a LifeMetrics webhook or pull payload onto exactly one ViaConnect
 * user. Never fall back to a hardcoded account (including Gary). Zero matches
 * or more than one match is unmatched. Callers must not write variants when
 * this returns null.
 *
 * Standing rules: no em or en dashes, TypeScript strict (no any).
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface LifemetricsIdentityHints {
  userId?: string | null;
  email?: string | null;
  kitBarcode?: string | null;
  clientId?: string | null;
}

export type LifemetricsIdentityLookups = {
  findProfileId: (userId: string) => Promise<string | null>;
  findUserIdsByEmail: (email: string) => Promise<string[]>;
  findUserIdsByKitBarcode: (kitBarcode: string) => Promise<string[]>;
};

function asNonEmpty(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueIds(ids: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const id of ids) {
    const trimmed = asNonEmpty(id);
    if (trimmed && UUID_RE.test(trimmed)) seen.add(trimmed);
  }
  return [...seen];
}

/**
 * Pick a single user id from lookup results. Empty or ambiguous sets stay
 * unmatched so another member's rows cannot land on the wrong profile.
 */
export function pickExclusiveUserId(ids: string[]): string | null {
  const unique = uniqueIds(ids);
  return unique.length === 1 ? unique[0] : null;
}

export async function resolveLifemetricsUserId(
  hints: LifemetricsIdentityHints,
  lookups: LifemetricsIdentityLookups,
): Promise<string | null> {
  const explicit = asNonEmpty(hints.userId);
  if (explicit) {
    if (!UUID_RE.test(explicit)) return null;
    const profileId = await lookups.findProfileId(explicit);
    return profileId;
  }

  const email = asNonEmpty(hints.email)?.toLowerCase() ?? null;
  if (email) {
    const matches = await lookups.findUserIdsByEmail(email);
    return pickExclusiveUserId(matches);
  }

  const kitBarcode = asNonEmpty(hints.kitBarcode);
  if (kitBarcode) {
    const matches = await lookups.findUserIdsByKitBarcode(kitBarcode);
    return pickExclusiveUserId(matches);
  }

  return null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? asNonEmpty(value) : null;
}

function readNested(
  record: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const direct = readString(record[key]);
    if (direct) return direct;
  }
  return null;
}

function readNumericId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
  return readString(value);
}

function readClientId(record: Record<string, unknown>): string | null {
  const labeled = readNested(record, [
    'client_id',
    'clientId',
    'lifemetrics_client_id',
    'lm_client_id',
  ]);
  if (labeled) return labeled;
  const numeric = readNumericId(record.client_id ?? record.clientId);
  if (numeric) return numeric;
  const client = record.client;
  if (client && typeof client === 'object' && !Array.isArray(client)) {
    const nested = client as Record<string, unknown>;
    return readNested(nested, ['id', 'client_id', 'clientId']) ?? readNumericId(nested.id);
  }
  return null;
}

/**
 * Pull identity hints from a LifeMetrics action envelope or webhook body.
 * Does not default a user. Unknown shapes yield empty hints.
 */
export function extractLifemetricsIdentityHints(
  payload: unknown,
): LifemetricsIdentityHints {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const nested: Record<string, unknown>[] = [root];
  const queue: unknown[] = [root];
  const nestKeys = ['data', 'payload', 'result', 'patient', 'member', 'user', 'subject', 'client'];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || Array.isArray(current)) continue;
    const record = current as Record<string, unknown>;
    for (const key of nestKeys) {
      const value = record[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        nested.push(value as Record<string, unknown>);
        queue.push(value);
      }
    }
  }

  let userId: string | null = null;
  let email: string | null = null;
  let kitBarcode: string | null = null;
  let clientId: string | null = null;
  for (const record of nested) {
    userId =
      userId ??
      readNested(record, [
        'viaconnect_user_id',
        'via_connect_user_id',
        'user_id',
      ]);
    email =
      email ??
      readNested(record, ['email', 'patient_email', 'member_email', 'user_email']);
    kitBarcode =
      kitBarcode ??
      readNested(record, ['kit_barcode', 'barcode', 'kit_id', 'kitBarcode']);
    clientId = clientId ?? readClientId(record);
  }
  return { userId, email, kitBarcode, clientId };
}
