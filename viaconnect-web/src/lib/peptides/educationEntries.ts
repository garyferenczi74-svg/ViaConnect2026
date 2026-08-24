/**
 * Consumer peptide education rows from peptide_education_entries.
 * Thanos allowlist only. Active rows. No invented copy.
 */

import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import {
  dropsEducationCompound,
  isSafeEntryKey,
  isThanosAllowlistedEntryKey,
  mapEducationRow,
  THANOS_CONSUMER_ENTRY_KEYS,
  type EducationEntry,
} from '@/lib/peptides/educationEntryFields';

export type { EducationEntry } from '@/lib/peptides/educationEntryFields';
export {
  extractPmids,
  formatProvenance,
  isSafeEntryKey,
  isThanosAllowlistedEntryKey,
  THANOS_CONSUMER_ENTRY_KEYS,
} from '@/lib/peptides/educationEntryFields';

export interface EducationEntryCatalogResult {
  ok: boolean;
  entries: EducationEntry[];
  total: number;
  error?: string;
}

const ENTRY_SELECT =
  'entry_key, title, mechanism, evidence_grade, regulatory_status, safety_context, provenance, source_url';

export async function loadConsumerEducationEntries(): Promise<EducationEntryCatalogResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('peptide_education_entries')
      .select(ENTRY_SELECT)
      .in('entry_key', [...THANOS_CONSUMER_ENTRY_KEYS])
      .eq('is_active', true)
      .order('title', { ascending: true })
      .limit(THANOS_CONSUMER_ENTRY_KEYS.length);

    if (error) {
      safeLog.warn('peptide.education.entries', 'query failed', {
        error: error.message,
      });
      return { ok: false, entries: [], total: 0, error: 'catalog_unavailable' };
    }

    const entries = (Array.isArray(data) ? data : [])
      .map((row) => mapEducationRow(row as Record<string, unknown>))
      .filter((row): row is EducationEntry => row !== null);

    return { ok: true, entries, total: entries.length };
  } catch (e) {
    safeLog.error('peptide.education.entries', 'threw', { error: e });
    return { ok: false, entries: [], total: 0, error: 'catalog_error' };
  }
}

export async function loadConsumerEducationEntryByKey(
  entryKey: string,
): Promise<EducationEntry | null> {
  if (
    !isSafeEntryKey(entryKey) ||
    !isThanosAllowlistedEntryKey(entryKey) ||
    dropsEducationCompound(entryKey)
  ) {
    return null;
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('peptide_education_entries')
      .select(ENTRY_SELECT)
      .eq('entry_key', entryKey)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      safeLog.warn('peptide.education.entries', 'detail query failed', {
        error: error.message,
      });
      return null;
    }
    if (!data) return null;
    return mapEducationRow(data as Record<string, unknown>);
  } catch (e) {
    safeLog.error('peptide.education.entries', 'detail threw', { error: e });
    return null;
  }
}
