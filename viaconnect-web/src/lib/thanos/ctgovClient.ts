/**
 * Prompt 225a Source A: ClinicalTrials.gov API v2 (direct REST, no Firecrawl).
 */

import { safeLog } from '@/lib/utils/safe-log';

const CTGOV_BASE = 'https://clinicaltrials.gov/api/v2/studies';

export interface CtgovListResult {
  ok: boolean;
  studies: unknown[];
  nextPageToken?: string;
  status?: number;
  reason?: string;
}

export async function fetchCtgovStudies(opts: {
  queryIntr?: string;
  queryTerm?: string;
  pageSize?: number;
  pageToken?: string;
  filterOverallStatus?: string;
}): Promise<CtgovListResult> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 100, 1), 1000);
  const params = new URLSearchParams({
    format: 'json',
    pageSize: String(pageSize),
    sort: 'LastUpdatePostDate:desc',
  });
  if (opts.queryIntr) params.set('query.intr', opts.queryIntr);
  if (opts.queryTerm) params.set('query.term', opts.queryTerm);
  if (opts.filterOverallStatus) {
    params.set('filter.overallStatus', opts.filterOverallStatus);
  }
  if (opts.pageToken) params.set('pageToken', opts.pageToken);

  try {
    const res = await fetch(`${CTGOV_BASE}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      safeLog.warn('ctgov.list', 'non-ok', { status: res.status });
      return { ok: false, studies: [], status: res.status, reason: `http_${res.status}` };
    }
    const json = (await res.json()) as {
      studies?: unknown[];
      nextPageToken?: string;
    };
    return {
      ok: true,
      studies: Array.isArray(json.studies) ? json.studies : [],
      nextPageToken: json.nextPageToken,
    };
  } catch (err) {
    safeLog.warn('ctgov.list', 'failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ok: false,
      studies: [],
      reason: err instanceof Error ? err.message : 'ctgov_error',
    };
  }
}

export async function fetchCtgovStudy(nctId: string): Promise<{
  ok: boolean;
  study?: unknown;
  reason?: string;
}> {
  const id = nctId.trim().toUpperCase();
  if (!/^NCT\d+$/.test(id)) {
    return { ok: false, reason: 'invalid_nct' };
  }
  try {
    const res = await fetch(`${CTGOV_BASE}/${id}?format=json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }
    const study = await res.json();
    return { ok: true, study };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'ctgov_detail_error',
    };
  }
}
