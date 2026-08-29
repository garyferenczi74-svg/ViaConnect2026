/**
 * Prompt 231: server-side scan consent gate, mirroring
 * src/lib/peptides/converterGate.ts. hasScanConsent() is the single
 * server-side check the submit route must call before any write;
 * localStorage is never the gate.
 *
 * Three-layer resilience: the whole check is raced against a timeout, wrapped
 * in try/catch, and fails CLOSED to { ok: false } (never throws, never
 * treats a degraded read as consent given) with a structured log on failure.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

const GATE_TIMEOUT_MS = 4000;

export interface ActiveScanConsent {
  id: string;
  version: string;
  bodyMarkdown: string;
}

export interface ScanConsentResult {
  ok: boolean;
  version?: string;
}

export async function getActiveScanConsentVersion(): Promise<ActiveScanConsent | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('scan_consent_versions')
    .select('id, version, body_markdown, lex_status')
    .eq('lex_status', 'cleared')
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: String(data.id),
    version: String(data.version),
    bodyMarkdown: String(data.body_markdown),
  };
}

export async function hasScanConsent(userId: string): Promise<ScanConsentResult> {
  try {
    return await withTimeout(
      checkScanConsent(userId),
      GATE_TIMEOUT_MS,
      'scan.scanConsentGate.hasScanConsent',
    );
  } catch (error) {
    safeLog.warn('scan.scanConsentGate', 'hasScanConsent failed closed', {
      error,
      userId,
    });
    return { ok: false };
  }
}

async function checkScanConsent(userId: string): Promise<ScanConsentResult> {
  const active = await getActiveScanConsentVersion();
  if (!active) return { ok: false };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('scan_consent_acks')
    .select('id')
    .eq('user_id', userId)
    .eq('consent_version_id', active.id)
    .maybeSingle();

  if (error || !data) return { ok: false };
  return { ok: true, version: active.version };
}
