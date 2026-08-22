/**
 * Prompt 227ah: rejection ledger and loop prevention.
 * A rejected proposal may only be re-proposed with materially new supporting evidence.
 */

import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export function stableJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableJson(v)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
}

export function proposalFingerprint(args: {
  targetTable: string;
  targetRowId: string | null | undefined;
  targetField: string;
  proposedValue: unknown;
}): string {
  const raw = [
    args.targetTable,
    args.targetRowId ?? '',
    args.targetField,
    stableJson(args.proposedValue),
  ].join('|');
  return createHash('sha256').update(raw).digest('hex');
}

export async function isRejectedWithoutNewEvidence(
  admin: SupabaseClient,
  fingerprint: string,
  supportingRecordIds: string[],
): Promise<{ blocked: boolean; priorRejectionId?: string }> {
  const { data } = await admin
    .from('curation_rejections')
    .select('id, supporting_record_ids')
    .eq('fingerprint', fingerprint)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return { blocked: false };

  const prior = new Set(
    (data.supporting_record_ids as string[] | null | undefined) ?? [],
  );
  const hasNew = supportingRecordIds.some((id) => id && !prior.has(id));
  if (hasNew) return { blocked: false, priorRejectionId: String(data.id) };
  return { blocked: true, priorRejectionId: String(data.id) };
}

export async function recordCurationRejection(
  admin: SupabaseClient,
  args: {
    proposalId?: string | null;
    fingerprint: string;
    reason: string;
    supportingRecordIds?: string[];
  },
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { data, error } = await admin
    .from('curation_rejections')
    .insert({
      proposal_id: args.proposalId ?? null,
      fingerprint: args.fingerprint,
      reason: args.reason.slice(0, 2000),
      supporting_record_ids: args.supportingRecordIds ?? [],
    })
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id ? String(data.id) : undefined };
}
