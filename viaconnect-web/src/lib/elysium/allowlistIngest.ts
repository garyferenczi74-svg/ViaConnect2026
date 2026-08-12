/**
 * Prompt 214c: Elysium genetics research ingest + IGSR ownership.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  defaultBudget,
  firecrawlSearch,
  type FirecrawlBudget,
} from '@/lib/hounddog/firecrawl/client';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import {
  assertAllowlistScope,
  loadApprovedAllowlistDomains,
} from '@/lib/agents/authorityAllowlist';
import { watchIgsrRelease, panelAlleleFreqSeed } from '@/lib/hounddog/ingest/genomes';
import { CLINICAL_SNPS } from '@/lib/genetics/clinicalSnps';
import { auditGenex360Coverage } from './coverage';

export interface ElysiumIngestStats {
  runId: string;
  runDate: string;
  discovered: number;
  staged: number;
  blockedOutsideAllowlist: number;
  gateApproved: number;
  gateBlocked: number;
  gateEscalated: number;
  coverageSeeded: number;
  genomes: { watched: boolean; isNew: boolean; releaseId: string | null; snps: number };
  hitBudget: boolean;
  creditsUsed: number;
  pagesUsed: number;
}

const GENETICS_QUERIES = [
  'MTHFR C677T folate methylation clinical review',
  'COMT Val158Met stress catecholamine genetics',
  'CYP2C19 pharmacogenomics allele frequency',
];

export async function runElysiumDailyIngest(opts?: {
  runId?: string;
  runDate?: string;
  includeGenomes?: boolean;
  budget?: FirecrawlBudget;
}): Promise<ElysiumIngestStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `elysium-${runDate}`;
  const budget = opts?.budget ?? defaultBudget();
  const allow = await loadApprovedAllowlistDomains();
  const supabase = createAdminClient();

  const stats: ElysiumIngestStats = {
    runId,
    runDate,
    discovered: 0,
    staged: 0,
    blockedOutsideAllowlist: 0,
    gateApproved: 0,
    gateBlocked: 0,
    gateEscalated: 0,
    coverageSeeded: 0,
    genomes: { watched: false, isNew: false, releaseId: null, snps: 0 },
    hitBudget: false,
    creditsUsed: 0,
    pagesUsed: 0,
  };

  // Ensure interpretation catalog coverage rows exist (idempotent seed)
  const audit = auditGenex360Coverage();
  for (const row of audit.rows.slice(0, 80)) {
    const hash = contentHash(['elysium', row.rsid, row.panel_key, row.effect_summary.slice(0, 80)]);
    const { error } = await supabase.from('elysium_variant_interpretations').upsert(
      {
        rsid: row.rsid,
        gene_symbol: row.gene,
        panel_key: row.panel_key,
        effect_summary: row.effect_summary,
        evidence_grade: row.evidence_grade,
        interpretation_status: row.status,
        content_hash: hash,
        last_verified_at: new Date().toISOString(),
        provenance: [{ agent: 'elysium', source: 'catalog_seed' }],
      },
      { onConflict: 'rsid,panel_key' },
    );
    if (!error) stats.coverageSeeded += 1;
  }

  for (const q of GENETICS_QUERIES) {
    if (budget.hitBudget) break;
    const search = await firecrawlSearch(q, budget, 3);
    if (!search.ok || !search.results?.length) continue;

    for (const hit of search.results) {
      if (budget.hitBudget) break;
      stats.discovered += 1;
      const url = hit.url ?? '';
      const scope = assertAllowlistScope(url, [...allow]);
      if (!scope.ok) {
        stats.blockedOutsideAllowlist += 1;
        safeLog.info('elysium.ingest', 'skip outside allowlist', {
          host: scope.host,
          reason: scope.reason,
        });
        continue;
      }

      const title = (hit.title ?? 'Genetics research update').slice(0, 240);
      const summary = (hit.description ?? title).replace(/[\u2013\u2014]/g, '-').slice(0, 800);
      const hash = contentHash(['elysium', url, title, summary.slice(0, 200)]);

      const gate = evaluateHoundDogGate({
        title,
        summary,
        source_url: url,
        source_type: 'elysium_genetics',
      });

      if (gate.verdict === 'blocked') {
        stats.gateBlocked += 1;
        continue;
      }
      if (gate.verdict === 'escalated') stats.gateEscalated += 1;
      else stats.gateApproved += 1;

      const { error } = await supabase.from('hounddog_staging_items').upsert(
        {
          external_id: `elysium:${hash.slice(0, 32)}`,
          content_hash: hash,
          title,
          summary,
          source_url: url,
          source_type: 'elysium_genetics',
          agent_slug: 'elysium',
          topic_key: 'genetics-education',
          relevance_score: 0.85,
          status: gate.verdict === 'escalated' ? 'escalated' : 'pending',
        },
        { onConflict: 'content_hash' },
      );
      if (!error) stats.staged += 1;

      // Refresh matching SNP interpretation when rsID appears in title
      const rsidMatch = title.match(/rs\d+/i);
      if (rsidMatch && gate.verdict === 'approved') {
        await supabase
          .from('elysium_variant_interpretations')
          .update({
            last_verified_at: new Date().toISOString(),
            source_url: url,
            provenance: [
              {
                source_url: url,
                retrieved_at: new Date().toISOString(),
                agent: 'elysium',
              },
            ],
            updated_at: new Date().toISOString(),
          })
          .eq('rsid', rsidMatch[0]);
      }
    }
  }

  // Weekly IGSR ownership (Monday or forced)
  const day = new Date(`${runDate}T12:00:00.000Z`).getUTCDay();
  const includeGenomes = opts?.includeGenomes ?? day === 1;
  if (includeGenomes && !budget.hitBudget) {
    const { data: last } = await supabase
      .from('genomics_reference_releases')
      .select('release_id')
      .order('ingested_at', { ascending: false })
      .limit(1);
    const lastId =
      Array.isArray(last) && last[0]
        ? String((last[0] as { release_id?: string }).release_id ?? '')
        : null;
    const watch = await watchIgsrRelease(budget, lastId);
    stats.genomes.watched = watch.scraped;
    stats.genomes.isNew = watch.isNew;
    stats.genomes.releaseId = watch.releaseId;

    if (watch.scraped && watch.releaseId && watch.isNew) {
      await supabase.from('genomics_reference_releases').upsert(
        {
          release_id: watch.releaseId,
          source_url: watch.sourceUrl,
          notes: `Elysium IGSR watch: ${watch.notes}`,
          announced_at: new Date().toISOString(),
        },
        { onConflict: 'release_id' },
      );
      const seeds = panelAlleleFreqSeed(watch.releaseId);
      for (const s of seeds) {
        await supabase.from('genomics_panel_allele_freq').upsert(s, {
          onConflict: 'release_id,rsid,population',
        });
      }
      stats.genomes.snps = seeds.length;

      // Attach population context to matching interpretations
      for (const s of seeds) {
        await supabase
          .from('elysium_variant_interpretations')
          .update({
            population_context: `ALL population alt freq ~${s.alt_allele_freq} (release ${s.release_id})`,
            release_id: s.release_id,
            last_verified_at: new Date().toISOString(),
          })
          .eq('rsid', s.rsid);
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
      source_class: 'elysium_genetics',
      pages_used: budget.pagesUsed,
      credits_used: budget.creditsUsed,
      budget_pages: budget.maxPages,
      budget_credits: budget.maxCredits,
      hit_budget: budget.hitBudget,
      detail: { ...stats, clinical_snps: CLINICAL_SNPS.length },
    });
  } catch {
    /* fail-open */
  }

  safeLog.info('elysium.ingest', 'run complete', stats as unknown as Record<string, unknown>);
  return stats;
}
