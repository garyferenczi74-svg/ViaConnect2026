/**
 * Prompt 214c: Thanos peptide education ingest against Science & Authorities allowlist.
 * Firecrawl REST only (shared 214b client). Marshall gate before promotion.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  defaultBudget,
  firecrawlSearch,
  firecrawlScrape,
  type FirecrawlBudget,
} from '@/lib/hounddog/firecrawl/client';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import {
  assertAllowlistScope,
  loadApprovedAllowlistDomains,
} from '@/lib/agents/authorityAllowlist';

export interface ThanosIngestStats {
  runId: string;
  runDate: string;
  discovered: number;
  staged: number;
  blockedOutsideAllowlist: number;
  gateApproved: number;
  gateBlocked: number;
  gateEscalated: number;
  refreshed: number;
  hitBudget: boolean;
  creditsUsed: number;
  pagesUsed: number;
}

const PEPTIDE_QUERIES = [
  'BPC-157 peptide site:pubmed.ncbi.nlm.nih.gov',
  'Epitalon OR Epithalon site:pubmed.ncbi.nlm.nih.gov',
  'elamipretide OR SS-31 site:nih.gov',
  'Thymosin alpha-1 site:fda.gov OR site:clinicaltrials.gov',
];

export async function runThanosDailyIngest(opts?: {
  runId?: string;
  runDate?: string;
  budget?: FirecrawlBudget;
}): Promise<ThanosIngestStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `thanos-${runDate}`;
  const budget = opts?.budget ?? defaultBudget();
  const allow = await loadApprovedAllowlistDomains();
  const supabase = createAdminClient();

  const stats: ThanosIngestStats & {
    searchEmpty: number;
    searchFailed: number;
    searchFailReasons: string[];
  } = {
    runId,
    runDate,
    discovered: 0,
    staged: 0,
    blockedOutsideAllowlist: 0,
    gateApproved: 0,
    gateBlocked: 0,
    gateEscalated: 0,
    refreshed: 0,
    hitBudget: false,
    creditsUsed: 0,
    pagesUsed: 0,
    searchEmpty: 0,
    searchFailed: 0,
    searchFailReasons: [],
  };

  for (const q of PEPTIDE_QUERIES) {
    if (budget.hitBudget) break;

    const search = await firecrawlSearch(q, budget, 3);
    if (!search.ok) {
      stats.searchFailed += 1;
      if (search.reason) {
        stats.searchFailReasons.push(search.reason.slice(0, 80));
      }
      continue;
    }
    if (!search.results?.length) {
      stats.searchEmpty += 1;
      continue;
    }

    for (const hit of search.results) {
      if (budget.hitBudget) break;
      stats.discovered += 1;
      const url = hit.url ?? '';
      const scope = assertAllowlistScope(url, [...allow]);
      if (!scope.ok) {
        stats.blockedOutsideAllowlist += 1;
        safeLog.info('thanos.ingest', 'skip outside allowlist', {
          host: scope.host,
          reason: scope.reason,
        });
        continue;
      }

      // Optional enrich scrape (still allowlisted)
      let excerpt = hit.description ?? hit.title ?? '';
      if (budget.hitBudget === false) {
        const scrape = await firecrawlScrape(url, budget);
        if (scrape.ok && scrape.markdown) {
          excerpt = scrape.markdown.slice(0, 1200);
        }
      }

      const title = (hit.title ?? 'Peptide research update').slice(0, 240);
      const summary = excerpt
        .replace(/[\u2013\u2014]/g, '-')
        .slice(0, 800);
      const hash = contentHash(['thanos', url, title, summary.slice(0, 200)]);

      const gate = evaluateHoundDogGate({
        title,
        summary,
        source_url: url,
        source_type: 'thanos_peptide',
      });

      if (gate.verdict === 'blocked') {
        stats.gateBlocked += 1;
        continue;
      }
      if (gate.verdict === 'escalated') {
        stats.gateEscalated += 1;
        // Still stage with escalation flag for Lex queue visibility
      } else {
        stats.gateApproved += 1;
      }

      const { error } = await supabase.from('hounddog_staging_items').upsert(
        {
          external_id: `thanos:${hash.slice(0, 32)}`,
          content_hash: hash,
          title,
          summary,
          source_url: url,
          source_type: 'thanos_peptide',
          agent_slug: 'thanos',
          topic_key: 'peptide-education',
          relevance_score: 0.8,
          gate_status: gate.verdict === 'escalated' ? 'escalated' : 'pending',
          gate_checked_at: new Date().toISOString(),
          gate_agent: 'hounddog',
          gate_notes:
            gate.verdict === 'escalated'
              ? 'Thanos peptide staging escalated for Lex/Marshall visibility'
              : 'Thanos peptide staging pending Marshall promotion',
          full_text_excerpt: excerpt.slice(0, 2000),
        },
        { onConflict: 'content_hash' },
      );

      if (!error) {
        stats.staged += 1;
        // Refresh education entry last_verified when title matches a known key
        const entryKey = inferEntryKey(title + summary);
        if (entryKey && gate.verdict === 'approved') {
          const { error: upErr } = await supabase
            .from('peptide_education_entries')
            .update({
              last_verified_at: new Date().toISOString(),
              provenance: [
                {
                  source_url: url,
                  retrieved_at: new Date().toISOString(),
                  agent: 'thanos',
                },
              ],
              updated_at: new Date().toISOString(),
            })
            .eq('entry_key', entryKey);
          if (!upErr) stats.refreshed += 1;
        }
      }
    }
  }

  stats.hitBudget = budget.hitBudget;
  stats.creditsUsed = budget.creditsUsed;
  stats.pagesUsed = budget.pagesUsed;

  try {
    await supabase.from('firecrawl_run_ledger').insert({
      run_id: runId,
      run_date: runDate,
      source_class: 'thanos_peptide',
      pages_used: budget.pagesUsed,
      credits_used: budget.creditsUsed,
      budget_pages: budget.maxPages,
      budget_credits: budget.maxCredits,
      hit_budget: budget.hitBudget,
      detail: { ...stats },
    });
  } catch {
    /* fail-open */
  }

  safeLog.info('thanos.ingest', 'run complete', stats as unknown as Record<string, unknown>);
  return stats;
}

function inferEntryKey(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('bpc-157') || t.includes('bpc157')) return 'edu-bpc157';
  if (t.includes('epitalon') || t.includes('epithalon')) return 'edu-epitalon';
  if (t.includes('elamipretide') || t.includes('ss-31') || t.includes('ss31')) return 'edu-ss31';
  if (t.includes('tesofensine')) return 'edu-tesofensine-pause';
  return null;
}

/** Pure: consumer peptide surfaces must never expose purchase paths. */
export function assertNoPeptidePurchasePath(hrefs: string[]): boolean {
  const bad = [/\/shop\//i, /add-to-cart/i, /checkout/i, /buy[-_ ]?now/i];
  for (const h of hrefs) {
    for (const re of bad) {
      if (re.test(h)) return false;
    }
  }
  return true;
}

/** Pure: practitioner depth only on practitioner routes. */
export function isPractitionerDepthAllowed(pathname: string): boolean {
  return (
    pathname.startsWith('/practitioner') ||
    pathname.startsWith('/naturopath') ||
    pathname.startsWith('/admin')
  );
}
