/**
 * Prompt 214c: Science & Authorities crawl allowlist helpers.
 * Thanos and Elysium may crawl only approved domains.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';

export interface AuthoritySource {
  domain: string;
  label: string;
  source_kind: string;
  domain_tags: string[];
  base_url: string | null;
  approval_status: string;
  is_active: boolean;
}

/** Extract hostname from URL; empty string if unparseable. */
export function hostFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '').trim();
}

/**
 * True when host is exactly allowlisted or a subdomain of an allowlisted domain.
 */
export function isHostAllowlisted(host: string, allowDomains: string[]): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  for (const d of allowDomains) {
    const ad = normalizeDomain(d);
    if (!ad) continue;
    if (h === ad || h.endsWith(`.${ad}`)) return true;
  }
  return false;
}

export function assertAllowlistScope(
  url: string,
  allowDomains: string[],
): { ok: boolean; host: string; reason?: string } {
  const host = hostFromUrl(url);
  if (!host) return { ok: false, host: '', reason: 'unparseable_url' };
  if (!isHostAllowlisted(host, allowDomains)) {
    return { ok: false, host, reason: 'outside_allowlist' };
  }
  return { ok: true, host };
}

/** Load approved active allowlist domains (fail-open empty). */
export async function loadApprovedAllowlistDomains(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('authorities_sources')
      .select('domain')
      .eq('is_active', true)
      .eq('approval_status', 'approved');
    if (error) {
      safeLog.warn('allowlist.load', 'query failed', { error: error.message });
      return FALLBACK_ALLOWLIST_DOMAINS;
    }
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return FALLBACK_ALLOWLIST_DOMAINS;
    return rows.map((r) => String((r as { domain?: string }).domain ?? '')).filter(Boolean);
  } catch (err) {
    safeLog.warn('allowlist.load', 'threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return FALLBACK_ALLOWLIST_DOMAINS;
  }
}

/** Static fallback when DB migration not applied yet (same seed set). */
export const FALLBACK_ALLOWLIST_DOMAINS: readonly string[] = [
  'pubmed.ncbi.nlm.nih.gov',
  'ncbi.nlm.nih.gov',
  'fda.gov',
  'nih.gov',
  'who.int',
  'internationalgenome.org',
  'genome.gov',
  'clinicaltrials.gov',
  'nature.com',
  'nejm.org',
  'jamanetwork.com',
  'thelancet.com',
  'frontiersin.org',
  'academic.oup.com',
  'sciencedirect.com',
  'cell.com',
  'snpedia.com',
  'medlineplus.gov',
  'efsa.europa.eu',
  'ods.od.nih.gov',
  'a4m.com',
  'peptidesociety.org',
  'utoronto.ca',
  'tufts.edu',
];
