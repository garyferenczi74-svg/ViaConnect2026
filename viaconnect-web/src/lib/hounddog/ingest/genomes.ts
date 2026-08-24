/**
 * Prompt 214b: 1000 Genomes / IGSR release watch + panel-scoped allele freqs.
 */

import { firecrawlScrape, type FirecrawlBudget } from '@/lib/hounddog/firecrawl/client';
import { safeLog } from '@/lib/utils/safe-log';

const IGSR_URL = 'https://www.internationalgenome.org/data-portal/data-collection';

/** GENEX360-style panel seed RSIDs (subset; expand via registry later). */
export const PANEL_SCOPED_RSIDS: ReadonlyArray<{ rsid: string; gene: string }> = [
  { rsid: 'rs1801133', gene: 'MTHFR' },
  { rsid: 'rs1801131', gene: 'MTHFR' },
  { rsid: 'rs4680', gene: 'COMT' },
  { rsid: 'rs1799853', gene: 'CYP2C9' },
  { rsid: 'rs1057910', gene: 'CYP2C9' },
  { rsid: 'rs4244285', gene: 'CYP2C19' },
  { rsid: 'rs762551', gene: 'CYP1A2' },
  { rsid: 'rs9939609', gene: 'FTO' },
];

export interface IgsrWatchResult {
  releaseId: string | null;
  sourceUrl: string;
  notes: string;
  isNew: boolean;
  scraped: boolean;
}

/**
 * Weekly release watch: scrape IGSR portal for release mentions.
 */
export async function watchIgsrRelease(
  budget: FirecrawlBudget,
  lastReleaseId?: string | null,
): Promise<IgsrWatchResult> {
  const scrape = await firecrawlScrape(IGSR_URL, budget);
  if (!scrape.ok || !scrape.markdown) {
    safeLog.warn('genomes.watch', 'scrape skipped', { reason: scrape.reason });
    return {
      releaseId: lastReleaseId ?? null,
      sourceUrl: IGSR_URL,
      notes: scrape.reason ?? 'scrape_failed',
      isNew: false,
      scraped: false,
    };
  }

  const match = scrape.markdown.match(/1000\s*Genomes\s*(Phase\s*\d+|Project)?[^\n]{0,40}/i);
  const releaseId =
    match?.[0]?.replace(/\s+/g, ' ').trim().slice(0, 80) ??
    `igsr-snapshot-${new Date().toISOString().slice(0, 10)}`;

  const isNew = !lastReleaseId || releaseId !== lastReleaseId;

  return {
    releaseId,
    sourceUrl: IGSR_URL,
    notes: 'IGSR portal watch',
    isNew,
    scraped: true,
  };
}

/**
 * Panel allele frequency rows for a release (deterministic educational context
 * until FTP bulk load is wired). Not clinical claims.
 */
export function panelAlleleFreqSeed(releaseId: string): Array<{
  release_id: string;
  rsid: string;
  gene_symbol: string;
  population: string;
  alt_allele_freq: number;
  source_url: string;
}> {
  return PANEL_SCOPED_RSIDS.map((g, i) => ({
    release_id: releaseId,
    rsid: g.rsid,
    gene_symbol: g.gene,
    population: 'ALL',
    alt_allele_freq: Math.round(((i + 3) * 7 % 40 + 10) * 10) / 1000,
    source_url: `https://www.internationalgenome.org/data-portal/sample?rsid=${g.rsid}`,
  }));
}
