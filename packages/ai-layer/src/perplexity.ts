import {
  AIResponse,
  PatientContext,
  Citation,
} from './types';

export interface PerplexityConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
}

export const DEFAULT_PERPLEXITY_CONFIG: PerplexityConfig = {
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  model: 'sonar-pro',
  baseUrl: 'https://api.perplexity.ai',
  maxTokens: 4096,
};

/**
 * Extracts inline citations from Perplexity-style response content.
 * Parses patterns like [1], [2] and maps them to structured Citation objects.
 */
export function extractCitationsFromResponse(content: string): Citation[] {
  const citationPattern = /\[(\d+)\]/g;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = citationPattern.exec(content)) !== null) {
    matches.add(match[1]);
  }

  const mockSources: Record<string, Omit<Citation, 'id'>> = {
    '1': {
      source: 'pubmed',
      title: 'Pharmacogenomics of folate metabolism: MTHFR and beyond',
      pmid: '38754210',
      year: 2024,
      journal: 'Annual Review of Pharmacology',
      url: 'https://pubmed.ncbi.nlm.nih.gov/38754210/',
    },
    '2': {
      source: 'pubmed',
      title: 'Nutrigenomics approaches to personalized supplementation',
      pmid: '39018473',
      year: 2025,
      journal: 'Frontiers in Nutrition',
      url: 'https://pubmed.ncbi.nlm.nih.gov/39018473/',
    },
    '3': {
      source: 'perplexity',
      title: 'Vitamin D receptor polymorphisms and supplementation outcomes',
      url: 'https://www.nature.com/articles/s41430-024-01392',
      year: 2024,
      journal: 'European Journal of Clinical Nutrition',
    },
    '4': {
      source: 'perplexity',
      title: 'COMT polymorphisms and magnesium requirements',
      url: 'https://www.mdpi.com/2072-6643/16/8/1234',
      year: 2025,
      journal: 'Nutrients',
    },
  };

  return Array.from(matches).map((num) => {
    const src = mockSources[num] ?? {
      source: 'perplexity' as const,
      title: `Reference ${num}`,
      url: `https://perplexity.ai/search/ref-${num}`,
    };
    return { id: `cite-pplx-${num}`, ...src };
  });
}

/**
 * Queries Perplexity Sonar for real-time evidence with inline citations (mock implementation).
 */
export async function queryPerplexity(
  query: string,
  config?: Partial<PerplexityConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_PERPLEXITY_CONFIG, ...config };

  const content =
    `Recent evidence regarding "${query}":\n\n` +
    'Studies demonstrate that pharmacogenomic-guided supplementation yields significantly better outcomes ' +
    'than standard approaches [1]. A 2025 systematic review found that MTHFR-guided folate interventions ' +
    'reduced homocysteine levels by 23% compared to folic acid alone [2]. Additionally, VDR polymorphism-based ' +
    'vitamin D dosing improved serum 25(OH)D levels more effectively than fixed-dose protocols [3]. ' +
    'Emerging data also supports COMT-guided magnesium supplementation for stress and methylation support [4].';

  const citations = extractCitationsFromResponse(content);

  return {
    provider: 'perplexity',
    content,
    confidence: 0.87,
    citations,
    evidenceGrade: 'B',
    metadata: {
      model: _mergedConfig.model,
      query,
      citationCount: citations.length,
      searchTimestamp: new Date().toISOString(),
    },
    latencyMs: 2150,
  };
}

/**
 * Synthesizes evidence for a topic in the context of a patient's genomics (mock implementation).
 */
export async function synthesizeEvidence(
  topic: string,
  patientContext: PatientContext,
  config?: Partial<PerplexityConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_PERPLEXITY_CONFIG, ...config };

  const variantNames =
    patientContext.genomicProfile?.map((v) => `${v.gene} ${v.variant}`).join(', ') ?? 'none provided';

  const content =
    `Evidence Synthesis: ${topic}\n` +
    `Patient Variants: ${variantNames}\n\n` +
    `The current body of literature (2023-2025) supports the following conclusions:\n\n` +
    '1. Genetic variants in folate metabolism genes are strongly associated with differential responses ' +
    'to methylfolate vs. folic acid supplementation [1][2].\n\n' +
    '2. Personalized dosing based on pharmacogenomic profiles achieves therapeutic targets 40% faster ' +
    'than standard dosing protocols [3].\n\n' +
    '3. Multi-gene panel approaches (including MTHFR, COMT, VDR, and CYP variants) provide more ' +
    'comprehensive guidance than single-gene testing [4].\n\n' +
    'Consensus: Strong evidence supports genotype-guided supplementation for this patient profile.';

  const citations = extractCitationsFromResponse(content);

  return {
    provider: 'perplexity',
    content,
    confidence: 0.84,
    citations,
    evidenceGrade: 'B',
    metadata: {
      model: _mergedConfig.model,
      topic,
      patientId: patientContext.patientId,
      variantsConsidered: patientContext.genomicProfile?.length ?? 0,
    },
    latencyMs: 2870,
  };
}
