// Prompt #122 P5: distribution helpers.
//
// Shared by Drata + Vanta pushers: target lookup, attempt recording, and
// a fetch wrapper that captures HTTP status + response excerpt for audit.

import type {
  DistributionAttemptInput,
  DistributionPlatform,
  DistributionTargetRow,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the target row for a platform. Returns a safe-default disabled row
 * if the config is missing — matches collector-config fallback behavior.
 */
export async function loadDistributionTarget(
  supabase: SupabaseClient,
  platform: DistributionPlatform,
): Promise<DistributionTargetRow> {
  const { data, error } = await supabase
    .from('soc2_distribution_targets')
    .select('platform, enabled, api_url, api_key_ref, notes')
    .eq('platform', platform)
    .maybeSingle();
  if (error) {
    throw new Error(`distribution target lookup failed: ${error.message}`);
  }
  return data ?? {
    platform,
    enabled: false,
    api_url: null,
    api_key_ref: null,
    notes: 'config row missing',
  };
}

/**
 * Record a distribution attempt. Never throws; logs on error so the caller's
 * main path isn't disrupted by an audit-trail hiccup.
 */
export async function recordDistributionAttempt(input: DistributionAttemptInput): Promise<void> {
  const { error } = await input.supabase.from('soc2_distribution_attempts').insert({
    packet_id: input.packetId,
    platform: input.platform,
    status: input.status,
    http_status: input.httpStatus ?? null,
    response_excerpt: trimExcerpt(input.responseExcerpt),
    error_message: input.errorMessage ?? null,
    uploaded_files_count: input.uploadedFilesCount ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('recordDistributionAttempt: insert failed', error);
  }
}

/**
 * Resolve an api_key_ref (Vault path) to a concrete API key. In production
 * this calls the Supabase Vault read function; in tests the caller can
 * override via the VAULT_RESOLVER env injection.
 *
 * Returns null if the ref is null/missing — caller should treat as "disabled."
 */
export async function resolveVaultRef(
  supabase: SupabaseClient,
  keyRef: string | null,
): Promise<string | null> {
  if (!keyRef) return null;
  // Supabase Vault: `supabase.rpc('read_secret', { p_ref: keyRef })` by convention.
  const { data, error } = await supabase.rpc('vault_read', { p_ref: keyRef });
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`resolveVaultRef failed for ${keyRef}`, error);
    return null;
  }
  return (data as string | null) ?? null;
}

function trimExcerpt(s: string | undefined): string | null {
  if (!s) return null;
  const MAX = 2000;
  return s.length > MAX ? s.slice(0, MAX) + '…' : s;
}

/** Best-effort HTTP POST with JSON body. Captures status + response text. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 30_000,
): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => '');
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}
