/**
 * src/lib/protocol/recommendationAudit.ts
 *
 * Reproducibility audit + snapshot engine.
 * Prompt 208a Module J Task J2 (2026-06-22).
 *
 * Provides:
 *   stableInputsHash   -- pure deterministic hash of any input (djb2/FNV-1a variant)
 *   snapshotCorpus     -- count published atoms + active rules, insert corpus_snapshots row
 *   recordRecommendationAudit -- insert one recommendation_audit row (fail-open side-record)
 *   getActiveEmbeddingVersion -- read embedding_versions where active=true (fail-open)
 *
 * All DB operations are fail-open: they never throw, never gate recommendations,
 * never change synthesis output. They are additive side-records only.
 *
 * stableInputsHash constraints (hard):
 *   - PURE: no Date, no Math.random, no crypto dependency.
 *   - Deterministic: same input -> same hash always.
 *   - Key-order-invariant: object keys are sorted recursively before hashing.
 *   - Returns a non-empty hex/numeric string.
 *
 * No em/en-dashes. No emojis. No package.json changes.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getPublishedAtoms } from '@/lib/kb/knowledgeAtoms';
import { getActivePublishedRules } from '@/lib/kb/ruleKillswitch';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// canonicalStringify
//
// Recursively stringifies a value with object keys sorted at every level.
// Arrays retain their element order (array order is semantically meaningful).
// Primitive values are handled by JSON.stringify's own rules.
// ---------------------------------------------------------------------------

function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalStringify(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof value === 'object') {
    const sorted = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + canonicalStringify((value as Record<string, unknown>)[k]));
    return '{' + sorted.join(',') + '}';
  }

  // Primitives: boolean, number, string, bigint
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// djb2 hash
//
// Classic djb2 string hash. No crypto. No external dep. Pure + deterministic.
// Returns a non-negative 32-bit integer as a zero-padded 8-character hex string.
// ---------------------------------------------------------------------------

function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + charCode (bitwise ops keep it 32-bit)
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// ---------------------------------------------------------------------------
// stableInputsHash (exported)
//
// PURE deterministic hash of any input.
// Key-order invariant: object keys are sorted recursively.
// Array element order is preserved.
// ---------------------------------------------------------------------------

export function stableInputsHash(input: unknown): string {
  const canonical = canonicalStringify(input);
  return djb2(canonical);
}

// ---------------------------------------------------------------------------
// RecommendationAuditInput
// ---------------------------------------------------------------------------

export interface RecommendationAuditInput {
  inputsHash: string;
  ruleIds: string[];
  snapshotRef?: string | null;
  disclaimerVersion: string;
}

// ---------------------------------------------------------------------------
// snapshotCorpus
//
// Count published atoms + active rules, hash the counts, insert a
// corpus_snapshots row. Fail-open: any error returns null (never throws).
// ---------------------------------------------------------------------------

export async function snapshotCorpus(): Promise<{
  atom_count: number;
  rule_count: number;
  snapshot_hash: string;
} | null> {
  try {
    const [atoms, rules] = await Promise.all([getPublishedAtoms(), getActivePublishedRules()]);

    const atom_count = atoms.length;
    const rule_count = rules.length;
    const snapshot_hash = stableInputsHash({ atom_count, rule_count });

    const supabase = createAdminClient();
    const { error } = await supabase.from('corpus_snapshots').insert([
      { atom_count, rule_count, snapshot_hash },
    ]);

    if (error) {
      safeLog.warn('recommendationAudit', 'corpus_snapshots insert failed', {
        error,
        atom_count,
        rule_count,
      });
      return null;
    }

    return { atom_count, rule_count, snapshot_hash };
  } catch (err) {
    safeLog.warn('recommendationAudit', 'snapshotCorpus threw; returning null', { err });
    return null;
  }
}

// ---------------------------------------------------------------------------
// recordRecommendationAudit
//
// Insert one recommendation_audit row for the given user + inputs.
// Fail-open: DB errors return false; never throws.
// ---------------------------------------------------------------------------

export async function recordRecommendationAudit(
  userId: string,
  input: RecommendationAuditInput,
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('recommendation_audit').insert([
      {
        user_id: userId,
        inputs_hash: input.inputsHash,
        rule_ids: input.ruleIds,
        snapshot_ref: input.snapshotRef ?? null,
        disclaimer_version: input.disclaimerVersion,
      },
    ]);

    if (error) {
      safeLog.warn('recommendationAudit', 'recommendation_audit insert failed', {
        userId,
        error,
      });
      return false;
    }

    return true;
  } catch (err) {
    safeLog.warn('recommendationAudit', 'recordRecommendationAudit threw', { userId, err });
    return false;
  }
}

// ---------------------------------------------------------------------------
// getActiveEmbeddingVersion
//
// Read the embedding_versions row where active = true.
// Fail-open: errors or no row returns null (never throws).
// ---------------------------------------------------------------------------

export async function getActiveEmbeddingVersion(): Promise<{
  model: string;
  version: string | null;
  dimension: number | null;
} | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('embedding_versions')
      .select('model, version, dimension')
      .eq('active', true)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    const row = data[0] as { model: string; version: string | null; dimension: number | null };
    return {
      model: row.model,
      version: row.version ?? null,
      dimension: row.dimension ?? null,
    };
  } catch (err) {
    safeLog.warn('recommendationAudit', 'getActiveEmbeddingVersion threw', { err });
    return null;
  }
}
