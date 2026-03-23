/**
 * ViaConnect GeneX360 — Multi-Source Research Engine
 *
 * Orchestrates parallel queries across 6 data sources:
 * Claude, Grok, PubMed, ClinicalTrials.gov, Web Search (Perplexity), FarmCeutica KB
 */

import { supabase } from '../../src/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────

export type SourceId =
  | 'claude'
  | 'grok'
  | 'pubmed'
  | 'clinicaltrials'
  | 'web'
  | 'farmaceutica';

export type SourceStatus = 'pending' | 'loading' | 'done' | 'error';

export interface SourceProgress {
  id: SourceId;
  label: string;
  status: SourceStatus;
  detail?: string;
  color: string;
}

export interface Citation {
  type: 'pubmed' | 'clinicaltrial' | 'web' | 'kb' | 'ai';
  id: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
  url?: string;
  doi?: string;
  nctId?: string;
  pmid?: string;
}

export interface EvidenceGrade {
  score: number; // 0-10
  label: 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
  sourceAgreement: number;
  qualityScore: number;
  recencyScore: number;
}

export interface SourceResult {
  sourceId: SourceId;
  content: string;
  citations: Citation[];
  raw?: unknown;
}

export interface ResearchResponse {
  answer: string;
  evidenceGrade: EvidenceGrade;
  citations: Citation[];
  sourceResults: Record<string, SourceResult>;
}

export interface ResearchFilters {
  dateRange?: { from?: string; to?: string };
  evidenceType?: string[];
  population?: string;
  sources?: SourceId[];
}

export interface ResearchRequest {
  query: string;
  sources?: SourceId[];
  filters?: ResearchFilters;
  includeGenetics?: boolean;
  geneticProfile?: Record<string, unknown> | null;
  userRole?: 'consumer' | 'practitioner' | 'naturopath';
  ncbiApiKey?: string;
}

// ── Source Configuration ───────────────────────────────────────────────────

export const SOURCE_CONFIG: Record<
  SourceId,
  { label: string; color: string }
> = {
  claude: { label: 'Claude AI', color: '#06B6D4' },
  grok: { label: 'Grok', color: '#FFFFFF' },
  pubmed: { label: 'PubMed', color: '#3B82F6' },
  clinicaltrials: { label: 'ClinicalTrials.gov', color: '#10B981' },
  web: { label: 'Web Search', color: '#8B5CF6' },
  farmaceutica: { label: 'FarmCeutica KB', color: '#F59E0B' },
};

export const ALL_SOURCES: SourceId[] = [
  'claude',
  'grok',
  'pubmed',
  'clinicaltrials',
  'web',
  'farmaceutica',
];

// ── Medical Entity Extraction ──────────────────────────────────────────────

export function extractMedicalEntities(query: string): {
  conditions: string[];
  genes: string[];
  supplements: string[];
  terms: string[];
} {
  const conditions: string[] = [];
  const genes: string[] = [];
  const supplements: string[] = [];

  // Gene patterns (e.g., MTHFR, CYP2D6, COMT, etc.)
  const genePattern =
    /\b(MTHFR|CYP2D6|CYP2C19|CYP1A2|CYP3A4|COMT|VDR|APOE|SOD2|NOS3|MAOA|MAOB|CBS|MTR|MTRR|BHMT|AHCY|MAT|SHMT|TYMS|DHFR|GAD1|DAO|HNMT|NAT2|GSTP1|GPX1|CAT|TNF|IL6|IL1B|HFE|FUT2|BCO1|FADS[12]|PEMT|NBPF3|SLC\w+)\b/gi;
  const geneMatches = query.match(genePattern);
  if (geneMatches) genes.push(...new Set(geneMatches.map((g) => g.toUpperCase())));

  // ViaConnect supplement names
  const supplementPattern =
    /\b(MTHFR\+|COMT\+|FOCUS\+|BLAST\+|SHRED\+|NAD\+|CoQ10\+|methylfolate|methylcobalamin|curcumin|berberine|ashwagandha|magnesium|zinc|vitamin\s*[ABCDEK]\d*|omega[- ]?3|probiotics?|quercetin|resveratrol|NMN|NR|glutathione|SAMe|TMG|betaine|riboflavin|B[126]|folate|iron)\b/gi;
  const suppMatches = query.match(supplementPattern);
  if (suppMatches) supplements.push(...new Set(suppMatches.map((s) => s.trim())));

  // Common health conditions
  const conditionPattern =
    /\b(anxiety|depression|insomnia|sleep|fatigue|inflammation|pain|migraine|headache|diabetes|hypertension|blood pressure|cholesterol|heart disease|cardiovascular|cancer|autoimmune|thyroid|hashimoto|hypothyroid|hyperthyroid|PCOS|endometriosis|fertility|pregnancy|menopause|osteoporosis|arthritis|fibromyalgia|IBS|IBD|crohn|celiac|GERD|acid reflux|ADHD|autism|alzheimer|dementia|parkinson|multiple sclerosis|epilepsy|asthma|allergy|eczema|psoriasis|acne|obesity|weight loss|metabolic syndrome|insulin resistance|homocysteine|methylation|detoxification|oxidative stress|mitochondrial)\b/gi;
  const condMatches = query.match(conditionPattern);
  if (condMatches) conditions.push(...new Set(condMatches.map((c) => c.toLowerCase())));

  // General search terms (words > 3 chars, excluding stopwords)
  const stopwords = new Set([
    'what', 'that', 'this', 'with', 'from', 'have', 'been', 'does', 'will',
    'about', 'which', 'their', 'there', 'would', 'could', 'should', 'these',
    'those', 'than', 'then', 'when', 'where', 'while', 'into', 'also',
    'very', 'just', 'more', 'most', 'some', 'such', 'each', 'much',
    'many', 'well', 'back', 'being', 'other', 'after', 'before',
  ]);
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w));

  return { conditions, genes, supplements, terms: [...new Set(terms)] };
}

// ── Source Query Functions ──────────────────────────────────────────────────

export async function queryClaude(
  request: ResearchRequest,
  onToken?: (token: string) => void,
): Promise<SourceResult> {
  const systemPrompt = buildClaudeSystemPrompt(request);

  const response = await fetch('/api/research/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'claude',
      query: request.query,
      systemPrompt,
      includeGenetics: request.includeGenetics,
      geneticProfile: request.geneticProfile,
    }),
  });

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`);

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      onToken?.(chunk);
    }
  }

  return {
    sourceId: 'claude',
    content: fullContent,
    citations: extractInlineCitations(fullContent),
  };
}

export async function queryGrok(
  request: ResearchRequest,
): Promise<SourceResult> {
  const response = await fetch('/api/research/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'grok',
      query: request.query,
      includeGenetics: request.includeGenetics,
      geneticProfile: request.geneticProfile,
    }),
  });

  if (!response.ok) throw new Error(`Grok API error: ${response.status}`);
  const data = await response.json();
  return {
    sourceId: 'grok',
    content: data.content,
    citations: data.citations ?? [],
  };
}

export async function queryPubMed(
  request: ResearchRequest,
): Promise<SourceResult> {
  // Fetch NCBI API key from server (keeps secret server-side)
  if (!request.ncbiApiKey) {
    try {
      const keyRes = await fetch('/api/research/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'pubmed', query: request.query }),
      });
      if (keyRes.ok) {
        const { ncbiApiKey } = await keyRes.json();
        if (ncbiApiKey) request = { ...request, ncbiApiKey };
      }
    } catch {
      // Continue without API key (lower rate limit)
    }
  }

  const entities = extractMedicalEntities(request.query);
  const searchTerms = [
    ...entities.conditions,
    ...entities.genes,
    ...entities.supplements,
  ]
    .slice(0, 5)
    .join('+AND+');

  if (!searchTerms) {
    return { sourceId: 'pubmed', content: 'No medical terms found for PubMed search.', citations: [] };
  }

  const filters = request.filters;
  let dateFilter = '';
  if (filters?.dateRange?.from) {
    const fromDate = filters.dateRange.from.replace(/-/g, '/');
    const toDate = filters.dateRange.to
      ? filters.dateRange.to.replace(/-/g, '/')
      : new Date().toISOString().split('T')[0].replace(/-/g, '/');
    dateFilter = `&mindate=${fromDate}&maxdate=${toDate}&datetype=pdat`;
  }

  // NCBI API key increases rate limit from 3 to 10 req/s
  const apiKeyParam = request.ncbiApiKey ? `&api_key=${request.ncbiApiKey}` : '';

  // Step 1: esearch
  const searchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerms)}&retmax=10&retmode=json&sort=relevance${dateFilter}${apiKeyParam}`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error('PubMed search failed');
  const searchData = await searchRes.json();
  const ids: string[] = searchData.esearchresult?.idlist ?? [];

  if (ids.length === 0) {
    return { sourceId: 'pubmed', content: 'No PubMed articles found.', citations: [] };
  }

  // Step 2: efetch for summaries
  const fetchUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${apiKeyParam}`;
  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) throw new Error('PubMed fetch failed');
  const fetchData = await fetchRes.json();

  const citations: Citation[] = [];
  const summaries: string[] = [];

  for (const pmid of ids) {
    const article = fetchData.result?.[pmid];
    if (!article) continue;

    const authors = (article.authors ?? [])
      .slice(0, 3)
      .map((a: { name: string }) => a.name);
    const year = article.pubdate
      ? parseInt(article.pubdate.split(' ')[0], 10)
      : undefined;

    citations.push({
      type: 'pubmed',
      id: pmid,
      title: article.title ?? '',
      authors,
      journal: article.source ?? '',
      year,
      pmid,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      doi: article.elocationid?.replace('doi: ', '') ?? undefined,
    });

    summaries.push(`[PMID:${pmid}] ${article.title} (${article.source}, ${article.pubdate})`);
  }

  return {
    sourceId: 'pubmed',
    content: `Found ${citations.length} articles:\n\n${summaries.join('\n\n')}`,
    citations,
  };
}

export async function queryClinicalTrials(
  request: ResearchRequest,
): Promise<SourceResult> {
  const entities = extractMedicalEntities(request.query);
  const condition = [...entities.conditions, ...entities.genes].slice(0, 3).join(' ');
  const intervention = entities.supplements.slice(0, 3).join(' ');

  if (!condition && !intervention) {
    return { sourceId: 'clinicaltrials', content: 'No relevant terms for clinical trials search.', citations: [] };
  }

  const params = new URLSearchParams({
    'query.cond': condition || request.query.slice(0, 100),
    pageSize: '10',
    format: 'json',
  });
  if (intervention) params.set('query.intr', intervention);

  const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('ClinicalTrials.gov API error');
  const data = await response.json();

  const studies = data.studies ?? [];
  const citations: Citation[] = [];
  const summaries: string[] = [];

  for (const study of studies) {
    const protocol = study.protocolSection;
    if (!protocol) continue;

    const nctId = protocol.identificationModule?.nctId ?? '';
    const title = protocol.identificationModule?.briefTitle ?? '';
    const status = protocol.statusModule?.overallStatus ?? '';
    const phase = protocol.designModule?.phases?.join(', ') ?? 'N/A';
    const enrollment = protocol.designModule?.enrollmentInfo?.count ?? 'N/A';

    citations.push({
      type: 'clinicaltrial',
      id: nctId,
      title,
      nctId,
      url: `https://clinicaltrials.gov/study/${nctId}`,
    });

    summaries.push(
      `[${nctId}] ${title}\nStatus: ${status} | Phase: ${phase} | Enrollment: ${enrollment}`,
    );
  }

  return {
    sourceId: 'clinicaltrials',
    content: `Found ${citations.length} clinical trials:\n\n${summaries.join('\n\n')}`,
    citations,
  };
}

export async function queryWebSearch(
  request: ResearchRequest,
): Promise<SourceResult> {
  const response = await fetch('/api/research/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'web',
      query: request.query,
    }),
  });

  if (!response.ok) throw new Error(`Web search error: ${response.status}`);
  const data = await response.json();
  return {
    sourceId: 'web',
    content: data.content,
    citations: data.citations ?? [],
  };
}

export async function queryFarmCeuticaKB(
  request: ResearchRequest,
): Promise<SourceResult> {
  const entities = extractMedicalEntities(request.query);
  const searchText = [
    ...entities.supplements,
    ...entities.genes,
    ...entities.conditions,
  ].join(' ') || request.query;

  // Query Supabase pgvector similarity search via RPC
  // Note: match_knowledge_base RPC and research tables are created by migration
  const { data, error } = await (supabase.rpc as any)('match_knowledge_base', {
    query_text: searchText,
    match_count: 5,
  });

  if (error || !data?.length) {
    // Fallback: direct table search on products
    const { data: products } = await supabase
      .from('products')
      .select('name, description, category')
      .textSearch('name', searchText.split(' ').join(' | '), { type: 'websearch' })
      .limit(5);

    const productList = (products ?? []) as Array<{ name: string; description: string | null; category: string | null }>;

    if (!productList.length) {
      return {
        sourceId: 'farmaceutica',
        content: 'No matching products in FarmCeutica knowledge base.',
        citations: [],
      };
    }

    const citations: Citation[] = productList.map((p) => ({
      type: 'kb' as const,
      id: p.name,
      title: p.name,
      url: undefined,
    }));

    return {
      sourceId: 'farmaceutica',
      content: productList
        .map((p) => `**${p.name}**: ${p.description ?? ''}`)
        .join('\n\n'),
      citations,
    };
  }

  const citations: Citation[] = (data as Array<{ id: string; title: string; content: string }>).map(
    (item) => ({
      type: 'kb' as const,
      id: item.id,
      title: item.title,
    }),
  );

  return {
    sourceId: 'farmaceutica',
    content: (data as Array<{ title: string; content: string }>)
      .map((item) => `**${item.title}**: ${item.content}`)
      .join('\n\n'),
    citations,
  };
}

// ── Evidence Grade Calculation ─────────────────────────────────────────────

export function calculateEvidenceGrade(
  sourceResults: SourceResult[],
): EvidenceGrade {
  const completedSources = sourceResults.filter((r) => r.content.length > 0);

  // Source agreement: how many sources provided relevant results
  const sourceAgreement = Math.min(10, (completedSources.length / 6) * 10);

  // Quality score based on citation types
  let qualityScore = 0;
  const allCitations = completedSources.flatMap((r) => r.citations);
  const hasPubMed = allCitations.some((c) => c.type === 'pubmed');
  const hasClinicalTrials = allCitations.some((c) => c.type === 'clinicaltrial');
  const hasKB = allCitations.some((c) => c.type === 'kb');

  if (hasPubMed) qualityScore += 4;
  if (hasClinicalTrials) qualityScore += 3;
  if (hasKB) qualityScore += 2;
  if (allCitations.length > 5) qualityScore += 1;
  qualityScore = Math.min(10, qualityScore);

  // Recency score based on citation years
  const years = allCitations
    .map((c) => c.year)
    .filter((y): y is number => y != null);
  const currentYear = new Date().getFullYear();
  const avgAge =
    years.length > 0
      ? years.reduce((sum, y) => sum + (currentYear - y), 0) / years.length
      : 5;
  const recencyScore = Math.max(0, Math.min(10, 10 - avgAge));

  // Combined weighted score
  const score = Math.round(
    (sourceAgreement * 0.3 + qualityScore * 0.5 + recencyScore * 0.2) * 10,
  ) / 10;

  let label: EvidenceGrade['label'];
  if (score >= 8) label = 'Very Strong';
  else if (score >= 6) label = 'Strong';
  else if (score >= 4) label = 'Moderate';
  else label = 'Weak';

  return { score, label, sourceAgreement, qualityScore, recencyScore };
}

// ── Citation Deduplication ─────────────────────────────────────────────────

export function deduplicateCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = c.pmid ?? c.nctId ?? c.doi ?? c.url ?? `${c.type}:${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildClaudeSystemPrompt(request: ResearchRequest): string {
  let prompt = `You are a precision health research assistant for ViaConnect GeneX360 by FarmCeutica Wellness LLC.

Your role is to synthesize medical research and provide evidence-based answers.

Guidelines:
- Provide comprehensive, well-structured answers with markdown formatting
- Include inline citation markers [1], [2], etc. when referencing sources
- Note the bioavailability improvement of FarmCeutica formulations is 10-27x
- Always include relevant disclaimers for consumer users
- For supplement recommendations, reference FarmCeutica products where relevant
- Semaglutide is excluded from peptide strategy; retatrutide + tirzepatide only`;

  if (request.includeGenetics && request.geneticProfile) {
    prompt += `\n\nUser's Genetic Profile:\n${JSON.stringify(request.geneticProfile, null, 2)}`;
    prompt += '\n\nConsider the user\'s genetic variants when providing recommendations.';
  }

  if (request.userRole === 'practitioner') {
    prompt += '\n\nThis is a practitioner query. Use clinical terminology, include GRADE evidence labels, and cite primary literature.';
  } else if (request.userRole === 'naturopath') {
    prompt += '\n\nThis is a naturopath query. Include herb-drug interactions, Therapeutic Order considerations, and botanical monograph references.';
  } else {
    prompt += '\n\nThis is a consumer query. Use accessible language and include appropriate health disclaimers.';
  }

  return prompt;
}

function extractInlineCitations(text: string): Citation[] {
  // Extract [1], [2] style citation markers
  const markers = text.match(/\[(\d+)\]/g) ?? [];
  return [...new Set(markers)].map((marker, i) => ({
    type: 'ai' as const,
    id: `ai-citation-${i + 1}`,
    title: `AI Reference ${marker}`,
  }));
}

// ── Main Orchestrator ──────────────────────────────────────────────────────

export type SourceProgressCallback = (progress: SourceProgress[]) => void;
export type StreamTokenCallback = (token: string) => void;

export async function executeResearch(
  request: ResearchRequest,
  onProgress?: SourceProgressCallback,
  onToken?: StreamTokenCallback,
): Promise<ResearchResponse> {
  const activeSources = request.sources ?? ALL_SOURCES;

  // Initialize progress
  const progress: SourceProgress[] = activeSources.map((id) => ({
    id,
    label: SOURCE_CONFIG[id].label,
    status: 'loading',
    color: SOURCE_CONFIG[id].color,
  }));
  onProgress?.(progress);

  const updateProgress = (sourceId: SourceId, status: SourceStatus, detail?: string) => {
    const entry = progress.find((p) => p.id === sourceId);
    if (entry) {
      entry.status = status;
      entry.detail = detail;
      onProgress?.([...progress]);
    }
  };

  // Build source query map
  const sourceQueries: Record<SourceId, () => Promise<SourceResult>> = {
    claude: () => {
      updateProgress('claude', 'loading', 'synthesizing...');
      return queryClaude(request, onToken);
    },
    grok: () => {
      updateProgress('grok', 'loading', 'analyzing...');
      return queryGrok(request);
    },
    pubmed: () => {
      updateProgress('pubmed', 'loading', 'searching articles...');
      return queryPubMed(request);
    },
    clinicaltrials: () => {
      updateProgress('clinicaltrials', 'loading', 'querying trials...');
      return queryClinicalTrials(request);
    },
    web: () => {
      updateProgress('web', 'loading', 'cross-referencing...');
      return queryWebSearch(request);
    },
    farmaceutica: () => {
      updateProgress('farmaceutica', 'loading', 'matching products...');
      return queryFarmCeuticaKB(request);
    },
  };

  // Execute all active sources in parallel
  const promises = activeSources.map(async (sourceId) => {
    try {
      const result = await sourceQueries[sourceId]();
      updateProgress(sourceId, 'done');
      return result;
    } catch (err) {
      updateProgress(sourceId, 'error', (err as Error).message);
      return {
        sourceId,
        content: `Error querying ${SOURCE_CONFIG[sourceId].label}: ${(err as Error).message}`,
        citations: [],
      } as SourceResult;
    }
  });

  const results = await Promise.allSettled(promises);
  const sourceResults = results
    .filter(
      (r): r is PromiseFulfilledResult<SourceResult> => r.status === 'fulfilled',
    )
    .map((r) => r.value);

  // Build response
  const allCitations = deduplicateCitations(
    sourceResults.flatMap((r) => r.citations),
  );
  const evidenceGrade = calculateEvidenceGrade(sourceResults);

  const sourceResultsMap: Record<string, SourceResult> = {};
  for (const result of sourceResults) {
    sourceResultsMap[result.sourceId] = result;
  }

  const claudeResult = sourceResults.find((r) => r.sourceId === 'claude');

  return {
    answer: claudeResult?.content ?? 'Research results compiled from multiple sources.',
    evidenceGrade,
    citations: allCitations,
    sourceResults: sourceResultsMap,
  };
}
