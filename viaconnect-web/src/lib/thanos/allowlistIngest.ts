/**
 * Thanos peptide education scout ingest (deny-list mode).
 * Gary 2026-08-22: remove Science & Authorities allowlist for peptide education.
 * Full kb_peptides catalog drives queries (chunked). Marshall gate before promotion.
 * Firecrawl day-cap via createDayAwareBudget. Mercola/G56 peers hard-denied.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import {
  firecrawlSearch,
  firecrawlScrape,
  type FirecrawlBudget,
} from '@/lib/hounddog/firecrawl/client';
import { createDayAwareBudget } from '@/lib/hounddog/firecrawl/dayCap';
import { contentHash } from '@/lib/hounddog/ingest/contentHash';
import { evaluateHoundDogGate } from '@/lib/hounddog/contentGate';
import {
  assertPeptideScoutScope,
  loadExcludedAuthorityDomains,
} from '@/lib/agents/authorityAllowlist';
import { assertNoDoseLexicon } from '@/lib/thanos/doseRedaction';
import { promoteEducationalConsumerSafe } from '@/lib/thanos/promoteEducationalConsumerSafe';

export interface ThanosIngestStats {
  runId: string;
  runDate: string;
  discovered: number;
  staged: number;
  /** Hosts blocked by peptide deny-list (legacy key name kept for ledger compat). */
  blockedOutsideAllowlist: number;
  gateApproved: number;
  gateBlocked: number;
  gateEscalated: number;
  refreshed: number;
  educationUpserts: number;
  promotedConsumerSafe: number;
  queriesAttempted: number;
  catalogOffset: number;
  catalogChunk: number;
  hitBudget: boolean;
  creditsUsed: number;
  pagesUsed: number;
  searchEmpty?: number;
  searchFailed?: number;
  searchFailReasons?: string[];
  stageErrors?: string[];
}

export interface PeptideCatalogRow {
  slug: string;
  display: string;
  canonical: string;
}

const CHUNK_SIZE = 10;
const CURSOR_SOURCE = 'thanos_peptide_scout';
const CURSOR_TOPIC = 'catalog_rotate';

/** Load educational catalog peptides (includes not-yet consumer_safe). */
export async function loadPeptideCatalogForScout(opts?: {
  offset?: number;
  limit?: number;
}): Promise<{ rows: PeptideCatalogRow[]; offset: number; nextOffset: number | null; total: number }> {
  const offset = Math.max(0, opts?.offset ?? 0);
  const limit = Math.min(25, Math.max(1, opts?.limit ?? CHUNK_SIZE));
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('kb_peptides')
    .select('slug, display_name, canonical_name, exclusion_tier')
    .neq('exclusion_tier', 'excluded_adverse_reference')
    .order('slug', { ascending: true });

  if (error) {
    safeLog.warn('thanos.ingest', 'catalog load failed', { error: error.message });
    return { rows: [], offset, nextOffset: null, total: 0 };
  }

  const all = (data ?? [])
    .filter((r) => r.slug)
    .map((r) => ({
      slug: String(r.slug),
      display: String(r.display_name ?? r.canonical_name ?? r.slug),
      canonical: String(r.canonical_name ?? r.display_name ?? r.slug),
    }));

  const slice = all.slice(offset, offset + limit);
  const nextOffset =
    offset + slice.length < all.length ? offset + slice.length : null;
  return { rows: slice, offset, nextOffset, total: all.length };
}

export function buildScoutQueries(rows: PeptideCatalogRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const name = (r.canonical || r.display || r.slug).trim();
    if (name.length < 2) continue;
    // Prefer literature/regulatory hosts in the query string; hits may still
    // come from other non-denied domains under deny-list mode.
    out.push(`${name} peptide research OR clinical review`);
  }
  return out;
}

/** Match title/summary text to a catalog peptide (slug or name). */
export function resolvePeptideEducationTarget(
  text: string,
  catalog: PeptideCatalogRow[],
): PeptideCatalogRow | null {
  const t = text.toLowerCase();
  let best: PeptideCatalogRow | null = null;
  let bestLen = 0;
  for (const row of catalog) {
    const candidates = [
      row.slug.replace(/^edu-/, '').replace(/-/g, ' '),
      row.slug.replace(/^edu-/, ''),
      row.display,
      row.canonical,
    ]
      .map((s) => s.toLowerCase().trim())
      .filter((s) => s.length >= 3);
    for (const c of candidates) {
      if (t.includes(c) && c.length > bestLen) {
        best = row;
        bestLen = c.length;
      }
    }
  }
  return best;
}

export async function runThanosDailyIngest(opts?: {
  runId?: string;
  runDate?: string;
  budget?: FirecrawlBudget;
  /** Override catalog chunk (tests). */
  catalogRows?: PeptideCatalogRow[];
  skipPromote?: boolean;
}): Promise<ThanosIngestStats> {
  const runDate = opts?.runDate ?? new Date().toISOString().slice(0, 10);
  const runId = opts?.runId ?? `thanos-${runDate}`;
  const supabase = createAdminClient();
  const budget = opts?.budget ?? (await createDayAwareBudget(supabase));
  const extraDeny = await loadExcludedAuthorityDomains();

  const stats: ThanosIngestStats = {
    runId,
    runDate,
    discovered: 0,
    staged: 0,
    blockedOutsideAllowlist: 0,
    gateApproved: 0,
    gateBlocked: 0,
    gateEscalated: 0,
    refreshed: 0,
    educationUpserts: 0,
    promotedConsumerSafe: 0,
    queriesAttempted: 0,
    catalogOffset: 0,
    catalogChunk: 0,
    hitBudget: false,
    creditsUsed: 0,
    pagesUsed: 0,
    searchEmpty: 0,
    searchFailed: 0,
    searchFailReasons: [],
    stageErrors: [],
  };

  let catalog: PeptideCatalogRow[] = opts?.catalogRows ?? [];
  let nextOffset: number | null = null;

  if (!opts?.catalogRows) {
    let offset = 0;
    try {
      const { data: cur } = await supabase
        .from('discovery_cursors')
        .select('cursor_version')
        .eq('source_key', CURSOR_SOURCE)
        .eq('topic_key', CURSOR_TOPIC)
        .maybeSingle();
      const parsed = Number(cur?.cursor_version ?? '0');
      if (Number.isFinite(parsed) && parsed >= 0) offset = parsed;
    } catch {
      /* fail-open */
    }
    const loaded = await loadPeptideCatalogForScout({ offset, limit: CHUNK_SIZE });
    catalog = loaded.rows;
    stats.catalogOffset = loaded.offset;
    stats.catalogChunk = loaded.rows.length;
    nextOffset = loaded.nextOffset ?? 0;
  } else {
    stats.catalogChunk = catalog.length;
  }

  // Full catalog for name matching (bounded)
  let matchCatalog = catalog;
  if (!opts?.catalogRows) {
    const all = await loadPeptideCatalogForScout({ offset: 0, limit: 200 });
    matchCatalog = all.rows;
  }

  const queries = buildScoutQueries(catalog);
  for (const q of queries) {
    if (budget.hitBudget) break;
    stats.queriesAttempted += 1;

    const search = await firecrawlSearch(q, budget, 3);
    if (!search.ok) {
      stats.searchFailed = (stats.searchFailed ?? 0) + 1;
      if (search.reason) {
        stats.searchFailReasons = stats.searchFailReasons ?? [];
        if (stats.searchFailReasons.length < 8) {
          stats.searchFailReasons.push(search.reason.slice(0, 80));
        }
      }
      continue;
    }
    if (!search.results?.length) {
      stats.searchEmpty = (stats.searchEmpty ?? 0) + 1;
      continue;
    }

    for (const hit of search.results) {
      if (budget.hitBudget) break;
      stats.discovered += 1;
      const url = hit.url ?? '';
      const scope = assertPeptideScoutScope(url, extraDeny);
      if (!scope.ok) {
        stats.blockedOutsideAllowlist += 1;
        safeLog.info('thanos.ingest', 'skip denied host', {
          host: scope.host,
          reason: scope.reason,
        });
        continue;
      }

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

      if (summary && !assertNoDoseLexicon(summary)) {
        // Keep educational text without instructional doses in staged body
        continue;
      }

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
          gate_agent: gate.agent,
          gate_notes: gate.notes.slice(0, 500),
          full_text_excerpt: excerpt.slice(0, 2000),
          retrieved_at: new Date().toISOString(),
        },
        { onConflict: 'source_url' },
      );

      if (error) {
        stats.stageErrors = stats.stageErrors ?? [];
        if (stats.stageErrors.length < 8) {
          stats.stageErrors.push(
            `${error.code ?? 'err'}:${error.message.slice(0, 160)}`,
          );
        }
        continue;
      }

      stats.staged += 1;

      const matched = resolvePeptideEducationTarget(
        `${title} ${summary}`,
        matchCatalog,
      );
      if (matched && gate.verdict === 'approved') {
        const entryKey = `edu-${matched.slug.replace(/^edu-/, '')}`;
        const eduSummary =
          `${matched.display}: educational research update. ${(summary || title).slice(0, 400)} Educational only.`.slice(
            0,
            800,
          );
        if (assertNoDoseLexicon(eduSummary)) {
          const { error: eduErr } = await supabase
            .from('peptide_education_entries')
            .upsert(
              {
                entry_key: entryKey,
                title: `${matched.display} education`,
                summary: eduSummary,
                evidence_grade: 'emerging',
                topic_keys: [matched.slug, 'peptide-education'],
                source_url: url,
                content_hash: hash,
                last_verified_at: new Date().toISOString(),
                is_active: true,
                is_practitioner_depth: false,
                provenance: [
                  {
                    source_url: url,
                    retrieved_at: new Date().toISOString(),
                    agent: 'thanos',
                    mode: 'deny_list_catalog_scout',
                  },
                ],
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'entry_key' },
            );
          if (!eduErr) {
            stats.educationUpserts += 1;
            stats.refreshed += 1;
          }
        }
      }
    }
  }

  // Advance catalog cursor
  if (!opts?.catalogRows) {
    try {
      await supabase.from('discovery_cursors').upsert(
        {
          source_key: CURSOR_SOURCE,
          topic_key: CURSOR_TOPIC,
          cursor_version: String(nextOffset ?? 0),
          cursor_timestamp: new Date().toISOString(),
        },
        { onConflict: 'source_key,topic_key' },
      );
    } catch {
      /* fail-open */
    }
  }

  if (!opts?.skipPromote) {
    try {
      const promo = await promoteEducationalConsumerSafe({ limit: 40 });
      stats.promotedConsumerSafe = promo.promoted;
    } catch (err) {
      safeLog.warn('thanos.ingest', 'promote failed', {
        error: err instanceof Error ? err.message : String(err),
      });
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
      detail: { ...stats, mode: 'deny_list_catalog_scout' },
    });
  } catch {
    /* fail-open */
  }

  safeLog.info('thanos.ingest', 'run complete', stats as unknown as Record<string, unknown>);
  return stats;
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
