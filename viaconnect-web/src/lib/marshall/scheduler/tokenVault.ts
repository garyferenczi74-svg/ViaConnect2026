// Prompt #125 P2: Scheduler OAuth token vault wrapper.
//
// Mirrors the audited-read pattern from src/lib/pii/vaultClient.ts. Tokens
// never live in a scheduler_connections row column; that row holds only a
// `token_vault_ref` string pointing at Supabase Vault. Every read is
// logged. Every write and delete goes through RPCs that will be added in
// a later Supabase migration; this module is the stable application-side
// shape that P2 logic imports.
//
// For P2 the RPCs `store_scheduler_token`, `read_scheduler_token`, and
// `delete_scheduler_token` are expected to exist as defined in the spec.
// Tests inject a fake VaultClient and never hit these RPCs.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface OAuthTokenBundle {
  accessToken: string;
  refreshToken?: string;
  tokenType: string; // 'Bearer' typically
  expiresAt?: string; // ISO 8601
  scope?: string;
}

export interface TokenVaultClient {
  store(bundle: OAuthTokenBundle, purpose: string): Promise<{ vaultRef: string }>;
  read(vaultRef: string, purpose: string): Promise<OAuthTokenBundle>;
  delete(vaultRef: string): Promise<void>;
}

function fail(code: string): never {
  // Defense-in-depth: never include the vaultRef in the thrown message so
  // error bubbles to the client don't leak Vault internals.
  throw new Error(`vault_${code}`);
}

/**
 * Default SupabaseClient-backed TokenVaultClient. Uses RPCs:
 *   store_scheduler_token(p_bundle jsonb, p_purpose text) -> { vault_ref }
 *   read_scheduler_token (p_vault_ref text, p_purpose text) -> bundle
 *   delete_scheduler_token(p_vault_ref text) -> void
 */
export function supabaseTokenVault(supabase: SupabaseClient): TokenVaultClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loose = supabase as any;
  return {
    async store(bundle, purpose) {
      const { data, error } = await loose.rpc('store_scheduler_token', {
        p_bundle: bundle,
        p_purpose: purpose,
      });
      if (error) fail('store_failed');
      const row = (data ?? {}) as { vault_ref?: string };
      if (!row.vault_ref) fail('store_missing_ref');
      return { vaultRef: row.vault_ref as string };
    },
    async read(vaultRef, purpose) {
      const { data, error } = await loose.rpc('read_scheduler_token', {
        p_vault_ref: vaultRef,
        p_purpose: purpose,
      });
      if (error) fail('read_failed');
      const row = data as OAuthTokenBundle | null;
      if (!row || !row.accessToken) fail('read_empty');
      return row as OAuthTokenBundle;
    },
    async delete(vaultRef) {
      const { error } = await loose.rpc('delete_scheduler_token', {
        p_vault_ref: vaultRef,
      });
      if (error) fail('delete_failed');
    },
  };
}
