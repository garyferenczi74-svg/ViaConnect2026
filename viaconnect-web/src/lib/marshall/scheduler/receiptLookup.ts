// Prompt #125 P2: Clearance receipt reuse + freshness checker.
//
// Before the orchestrator spends a pre-check budget on a draft, we check
// whether this practitioner already has an active receipt for the exact
// content hash. If yes AND the rule registry version it was issued under
// has no material changes vs. the current registry AND it's not within
// its expiration window, we reuse; otherwise we re-scan.
//
// Implementation note: The receipt row does not carry rule_registry_version
// in its column set (per the #121 P1 migration); the version lives inside
// the signed JWT `jwt_compact`. We extract it from the payload claim.
// If the JWT cannot be parsed we conservatively treat the receipt as
// unusable and re-scan.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { RegistrySnapshot } from './registryDiff';
import { registryMaterialChanges } from './registryDiff';

export interface PrecheckReceiptRow {
  id: string;
  receipt_id: string;
  session_id: string;
  practitioner_id: string;
  draft_hash_sha256: string;
  jwt_compact: string;
  issued_at: string;
  expires_at: string;
  revoked: boolean;
}

export interface ReceiptLookupInput {
  supabase: SupabaseClient;
  practitionerId: string;
  contentHashSha256: string;
  now?: Date;
}

export type ReceiptLookupResult =
  | { outcome: 'no_match' }
  | { outcome: 'revoked'; receiptId: string }
  | { outcome: 'expired'; receiptId: string }
  | { outcome: 'jwt_unreadable'; receiptId: string }
  | { outcome: 'stale_registry'; receipt: PrecheckReceiptRow; ruleRegistryVersion: string; materialChangesCount: number }
  | { outcome: 'valid'; receipt: PrecheckReceiptRow; ruleRegistryVersion: string };

export async function lookupReusableReceipt(
  input: ReceiptLookupInput,
  currentRegistry: RegistrySnapshot,
  loadRegistrySnapshot: (version: string) => Promise<RegistrySnapshot | null>,
): Promise<ReceiptLookupResult> {
  const now = input.now ?? new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = input.supabase as any;

  const { data, error } = await sb
    .from('precheck_clearance_receipts')
    .select('id, receipt_id, session_id, practitioner_id, draft_hash_sha256, jwt_compact, issued_at, expires_at, revoked')
    .eq('practitioner_id', input.practitionerId)
    .eq('draft_hash_sha256', input.contentHashSha256)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return { outcome: 'no_match' };
  }
  const row = data as PrecheckReceiptRow;

  if (row.revoked) {
    return { outcome: 'revoked', receiptId: row.receipt_id };
  }
  if (new Date(row.expires_at).getTime() <= now.getTime()) {
    return { outcome: 'expired', receiptId: row.receipt_id };
  }

  const version = extractRegistryVersionFromJwt(row.jwt_compact);
  if (!version) {
    return { outcome: 'jwt_unreadable', receiptId: row.receipt_id };
  }

  if (version === currentRegistry.registryVersion) {
    return { outcome: 'valid', receipt: row, ruleRegistryVersion: version };
  }

  const fromSnapshot = await loadRegistrySnapshot(version);
  if (!fromSnapshot) {
    return { outcome: 'stale_registry', receipt: row, ruleRegistryVersion: version, materialChangesCount: -1 };
  }
  const materialChanges = registryMaterialChanges(fromSnapshot, currentRegistry);
  if (materialChanges.length > 0) {
    return {
      outcome: 'stale_registry',
      receipt: row,
      ruleRegistryVersion: version,
      materialChangesCount: materialChanges.length,
    };
  }
  return { outcome: 'valid', receipt: row, ruleRegistryVersion: version };
}

// ─── JWT payload inspection (no verification; verification happens
// upstream at issuance time; here we just need the version claim) ───────

export function extractRegistryVersionFromJwt(jwtCompact: string): string | null {
  const parts = jwtCompact.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const parsed = JSON.parse(payloadJson) as { ruleRegistryVersion?: unknown; rule_registry_version?: unknown };
    const v = parsed.ruleRegistryVersion ?? parsed.rule_registry_version;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}
