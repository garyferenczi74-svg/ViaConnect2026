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
 * Prompt 225a: hosts that must never be crawled even if a parent domain
 * (e.g. who.int) is allowlisted. ICTRP Search Portal requires WHO credentials.
 */
export const CRAWL_DENY_HOSTS: readonly string[] = [
  'trialsearch.who.int',
];

/**
 * G56 / peptide-scout hard denies. Required once Thanos/Hermes leave the
 * Science & Authorities allowlist (deny-first mode). Keep Mercola peers here
 * even if authorities_sources already marks them excluded.
 */
export const PEPTIDE_CRAWL_DENY_HOSTS: readonly string[] = [
  'mercola.com',
  'lifeextension.com',
  'mindbodygreen.com',
  'trialsearch.who.int',
];

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

export function isHostDenied(host: string): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  for (const d of CRAWL_DENY_HOSTS) {
    const ad = normalizeDomain(d);
    if (h === ad || h.endsWith(`.${ad}`)) return true;
  }
  return false;
}

/** True when host matches static peptide deny list or extra dynamic excludes. */
export function isHostPeptideDenied(
  host: string,
  extraDenyDomains: string[] = [],
): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  const denied = [...PEPTIDE_CRAWL_DENY_HOSTS, ...extraDenyDomains];
  for (const d of denied) {
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
  if (isHostDenied(host)) {
    return {
      ok: false,
      host,
      reason: 'deny_list_225a_ictrp_pending_credentials',
    };
  }
  if (!isHostAllowlisted(host, allowDomains)) {
    return { ok: false, host, reason: 'outside_allowlist' };
  }
  return { ok: true, host };
}

/**
 * Peptide education scout scope (Thanos / Hermes): deny-first, no allowlist.
 * Elysium genetics must keep using assertAllowlistScope.
 */
export function assertPeptideScoutScope(
  url: string,
  extraDenyDomains: string[] = [],
): { ok: boolean; host: string; reason?: string } {
  const host = hostFromUrl(url);
  if (!host) return { ok: false, host: '', reason: 'unparseable_url' };
  if (isHostPeptideDenied(host, extraDenyDomains)) {
    return { ok: false, host, reason: 'peptide_deny_list' };
  }
  return { ok: true, host };
}

/** Load excluded/blocked authority domains to merge into peptide deny list. */
export async function loadExcludedAuthorityDomains(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('authorities_sources')
      .select('domain')
      .or(
        'lane.eq.excluded,registry_status.eq.blocked,approval_status.eq.rejected',
      );
    if (error) {
      safeLog.warn('allowlist.excluded', 'query failed', {
        error: error.message,
      });
      return [];
    }
    return (data ?? [])
      .map((r) => String((r as { domain?: string }).domain ?? ''))
      .filter(Boolean);
  } catch (err) {
    safeLog.warn('allowlist.excluded', 'threw', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
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
