/**
 * Prompt 214b: PubMed discovery via NCBI E-utilities + optional Firecrawl full-text.
 */

import { safeLog } from '@/lib/utils/safe-log';
import {
  type FirecrawlBudget,
  firecrawlScrape,
  canSpend,
} from '@/lib/hounddog/firecrawl/client';
import { contentHash } from './contentHash';

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

export interface PubMedRecord {
  pmid: string;
  title: string;
  abstract: string;
  pubDate?: string;
  pmcId?: string;
  externalId: string;
  sourceUrl: string;
  contentHash: string;
  supersedesExternalId?: string;
  fullTextExcerpt?: string;
}

function ncbiKey(): string | undefined {
  // Vercel historically used NCBI_API_Key; Linux env is case-sensitive.
  return (
    process.env.NCBI_API_KEY?.trim() ||
    process.env.NCBI_API_Key?.trim() ||
    undefined
  );
}

/** NCBI requires tool + email on every E-utilities request. */
function ncbiCommonParams(): Record<string, string> {
  const params: Record<string, string> = {
    tool: process.env.NCBI_TOOL?.trim() || 'viaconnect',
    email: process.env.NCBI_EMAIL?.trim() || 'garyferenczi74@gmail.com',
  };
  const key = ncbiKey();
  if (key) params.api_key = key;
  return params;
}

function throttleMs(): number {
  // With API key NCBI allows ~10 req/s; without ~3/s. Be conservative.
  return ncbiKey() ? 120 : 350;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function pubmedEsearch(
  term: string,
  mindate: string,
  retmax = 10,
): Promise<string[]> {
  const params = new URLSearchParams({
    ...ncbiCommonParams(),
    db: 'pubmed',
    term,
    retmode: 'json',
    retmax: String(retmax),
    datetype: 'edat',
    mindate,
    maxdate: '3000',
    sort: 'pub+date',
  });

  const res = await fetch(`${EUTILS}/esearch.fcgi?${params.toString()}`);
  if (!res.ok) {
    safeLog.warn('pubmed.esearch', 'http error', { status: res.status });
    return [];
  }
  const json = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return json.esearchresult?.idlist ?? [];
}

export async function pubmedEsummary(pmids: string[]): Promise<
  Array<{ pmid: string; title: string; pubDate?: string; source?: string }>
> {
  if (pmids.length === 0) return [];
  const params = new URLSearchParams({
    ...ncbiCommonParams(),
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'json',
  });

  await sleep(throttleMs());
  const res = await fetch(`${EUTILS}/esummary.fcgi?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: Record<string, { title?: string; pubdate?: string; source?: string; uid?: string }>;
  };
  const result = json.result ?? {};
  return pmids.map((pmid) => {
    const row = result[pmid] ?? {};
    return {
      pmid,
      title: row.title ?? `PMID ${pmid}`,
      pubDate: row.pubdate,
      source: row.source,
    };
  });
}

export async function pubmedEfetchAbstracts(pmids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (pmids.length === 0) return map;
  const params = new URLSearchParams({
    ...ncbiCommonParams(),
    db: 'pubmed',
    id: pmids.join(','),
    retmode: 'xml',
    rettype: 'abstract',
  });

  await sleep(throttleMs());
  const res = await fetch(`${EUTILS}/efetch.fcgi?${params.toString()}`);
  if (!res.ok) return map;
  const xml = await res.text();
  // Lightweight split by PubmedArticle
  const articles = xml.split('<PubmedArticle>');
  for (const chunk of articles) {
    const pmidMatch = chunk.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    const texts = [...chunk.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (texts.length) map.set(pmidMatch[1], texts.join(' '));
  }
  return map;
}

/**
 * Detect upgrade: same title prefix + newer year, or explicit "update"/"follow-up" in title.
 */
export function detectSupersedes(
  title: string,
  priorExternalIds: string[],
): string | undefined {
  if (priorExternalIds.length === 0) return undefined;
  if (/\b(update|updated|follow[- ]up|erratum|extension)\b/i.test(title)) {
    return priorExternalIds[0];
  }
  return undefined;
}

export interface PubMedRunResult {
  discovered: number;
  staged: Array<PubMedRecord>;
  skipped: number;
  budget: FirecrawlBudget;
}

/**
 * Date-bounded PubMed discovery for one topic; optional PMC full-text via Firecrawl.
 */
export async function runPubMedTopicDiscovery(opts: {
  topicKey: string;
  query: string;
  mindate: string;
  budget: FirecrawlBudget;
  priorPmids?: string[];
  enrichFullText?: boolean;
}): Promise<PubMedRunResult> {
  const staged: PubMedRecord[] = [];
  let skipped = 0;

  let pmids: string[] = [];
  try {
    pmids = await pubmedEsearch(opts.query, opts.mindate, 8);
  } catch (err) {
    safeLog.warn('pubmed.discovery', 'esearch failed', { error: err });
    return { discovered: 0, staged, skipped: 0, budget: opts.budget };
  }

  await sleep(throttleMs());
  const summaries = await pubmedEsummary(pmids);
  const abstracts = await pubmedEfetchAbstracts(pmids);

  for (const s of summaries) {
    const abstract = abstracts.get(s.pmid) ?? '';
    const sourceUrl = `https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`;
    const hash = contentHash([s.pmid, s.title, abstract]);
    const supersedes = detectSupersedes(s.title, opts.priorPmids ?? []);

    let fullTextExcerpt: string | undefined;
    if (opts.enrichFullText && canSpend(opts.budget, 1, 1)) {
      // Try PMC open-access pattern
      const pmcUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/pmid/${s.pmid}/`;
      const scrape = await firecrawlScrape(pmcUrl, opts.budget);
      if (scrape.ok && scrape.markdown) {
        fullTextExcerpt = scrape.markdown.slice(0, 4000);
      } else {
        skipped += 1;
      }
    }

    staged.push({
      pmid: s.pmid,
      title: s.title,
      abstract: abstract || 'Abstract unavailable via E-utilities.',
      pubDate: s.pubDate,
      externalId: `pmid:${s.pmid}`,
      sourceUrl,
      contentHash: hash,
      supersedesExternalId: supersedes,
      fullTextExcerpt,
    });
  }

  return { discovered: pmids.length, staged, skipped, budget: opts.budget };
}
