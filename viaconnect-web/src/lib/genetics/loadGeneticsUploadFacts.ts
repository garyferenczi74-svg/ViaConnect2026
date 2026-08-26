// Brief 16: load the facts the genetics-upload SSOT needs.
// Real kit ingest is a completed kit registration or a DNA file upload
// (source_filename set). Sample seed writes filename-less dna_uploads and
// must not count. Elysium mapped_count is not an upload fact.

import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import {
  isRealKitUploadFilename,
  type GeneticsUploadFacts,
  type GeneticsUploadVariantFact,
} from './geneticsUploadState';

const TIMEOUT_MS = 4_000;

type QueryResult = {
  data: unknown;
  error: { message?: string } | null;
};

export interface GeneticsUploadQuery {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<QueryResult> & {
        eq: (column: string, value: string) => Promise<QueryResult>;
      };
    };
  };
}

function asVariantFacts(data: unknown): GeneticsUploadVariantFact[] {
  if (!Array.isArray(data)) return [];
  const rows: GeneticsUploadVariantFact[] = [];
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const row = entry as { is_sample?: unknown; panel_key?: unknown };
    rows.push({
      is_sample: row.is_sample === true,
      panel_key: typeof row.panel_key === 'string' ? row.panel_key : null,
    });
  }
  return rows;
}

function uploadsHaveRealFile(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return data.some((entry) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const row = entry as { source_filename?: unknown };
    return isRealKitUploadFilename(
      typeof row.source_filename === 'string' ? row.source_filename : null,
    );
  });
}

function kitsAreCompleted(data: unknown): boolean {
  if (!Array.isArray(data)) return false;
  return data.some((entry) => {
    if (typeof entry !== 'object' || entry === null) return false;
    const row = entry as { status?: unknown };
    return row.status === 'completed';
  });
}

export async function loadGeneticsUploadFacts(
  supabase: GeneticsUploadQuery,
  userId: string,
): Promise<GeneticsUploadFacts> {
  const empty: GeneticsUploadFacts = { variantRows: [], realKitIngest: false };

  try {
    const [variantsResult, uploadsResult, kitsResult] = await Promise.all([
      withTimeout(
        supabase.from('user_variants').select('is_sample, panel_key').eq('user_id', userId),
        TIMEOUT_MS,
        'genetics.upload.user_variants',
      ),
      withTimeout(
        supabase.from('dna_uploads').select('source_filename').eq('user_id', userId),
        TIMEOUT_MS,
        'genetics.upload.dna_uploads',
      ),
      withTimeout(
        supabase
          .from('kit_registrations')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'completed'),
        TIMEOUT_MS,
        'genetics.upload.kit_registrations',
      ),
    ]);

    const variants = variantsResult as QueryResult;
    const uploads = uploadsResult as QueryResult;
    const kits = kitsResult as QueryResult;

    if (variants.error) {
      safeLog.warn('genetics.upload', 'user_variants read failed', {
        user_id: userId,
        error: variants.error.message ?? 'supabase error',
      });
    }
    if (uploads.error) {
      safeLog.warn('genetics.upload', 'dna_uploads read failed', {
        user_id: userId,
        error: uploads.error.message ?? 'supabase error',
      });
    }
    if (kits.error) {
      safeLog.warn('genetics.upload', 'kit_registrations read failed', {
        user_id: userId,
        error: kits.error.message ?? 'supabase error',
      });
    }

    return {
      variantRows: variants.error ? [] : asVariantFacts(variants.data),
      variantsReadFailed: Boolean(variants.error),
      realKitIngest:
        !uploads.error && uploadsHaveRealFile(uploads.data)
          ? true
          : !kits.error && kitsAreCompleted(kits.data),
    };
  } catch (err) {
    safeLog.warn('genetics.upload', 'facts load failed', {
      user_id: userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}
