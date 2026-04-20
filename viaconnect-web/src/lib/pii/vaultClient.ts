// Prompt #102 — Vault-backed encrypted field RPC client wrapper.
//
// Direct access to Vault-encrypted fields goes through a server-side
// RPC that (a) decrypts via `vault.decrypted_secrets`, and (b) writes
// an audit-log entry for every read. This module is the callsite shape
// that routes + edge functions use. The actual RPC lands in a future
// Phase; for now the shape is exported so callers can import it.

import type { SupabaseClient } from '@supabase/supabase-js';

export type PIIField =
  | 'tax_doc_ssn_or_ein'
  | 'tax_doc_address'
  | 'tax_doc_foreign_tax_id'
  | 'wire_instructions';

export interface VaultReadResult {
  value: string | null;
  accessLoggedAt: string;
  accessAuditId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** Read an encrypted Vault-backed field via the audited RPC. Every
 *  read writes a practitioner_operations_audit_log row with
 *  action_category='pii_access'. Never log the returned value. */
export async function readVaultField(
  supabase: SupabaseClient,
  vaultRef: string,
  field: PIIField,
  purpose: string,
): Promise<VaultReadResult> {
  const loose = supabase as unknown as Loose;
  const { data, error } = await loose.rpc('read_vault_pii', {
    p_vault_ref: vaultRef,
    p_field: field,
    p_purpose: purpose,
  });
  if (error) {
    // Defense-in-depth: NEVER put the vaultRef or field name in thrown
    // error messages that could bubble to a client.
    throw new Error(`vault_read_failed: ${error.code ?? 'unknown'}`);
  }
  const row = (data ?? {}) as { value?: string; audit_id?: string };
  return {
    value: row.value ?? null,
    accessLoggedAt: new Date().toISOString(),
    accessAuditId: row.audit_id ?? null,
  };
}
