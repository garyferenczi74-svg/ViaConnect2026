/**
 * ViaConnect GeneX360 - Five-Source Consensus Engine
 *
 * Orchestrates queries across 5 AI/evidence sources, calculates weighted
 * agreement, resolves conflicts via Tier 1 rules, builds citation chains,
 * and applies safety gating before returning a final recommendation.
 */

import type {
  AIProvider,
  AIResponse,
  Citation,
  EvidenceGrade,
  PatientContext,
  RAGContext,
  GenomicVariant,
} from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsensusQuery {
  question: string;
  patientContext: PatientContext;
  ragContext?: RAGContext;
}

export interface SourceResult {
  provider: AIProvider;
  response: AIResponse;
  weight: number;
  agreesWithConsensus: boolean;
}

export interface ConsensusResult {
  recommendation: string;
  confidenceScore: number; // 0-100
  evidenceGrade: EvidenceGrade;
  agreementCount: number;
  totalSources: number;
  sourceResults: SourceResult[];
  citationChain: Citation[];
  tier1RuleRef?: string;
  safetyCleared: boolean;
  conflicts: string[];
  processingTimeMs: number;
}

export interface ConsensusConfig {
  weights: Record<AIProvider, number>;
  minAgreement: number;
  safetyGatingEnabled: boolean;
  timeoutMs: number;
}

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

export const DEFAULT_CONSENSUS_CONFIG: ConsensusConfig = {
  weights: {
    claude: 0.25,
    openai: 0.20,
    perplexity: 0.15,
    openevidence: 0.30,
    pubmed: 0.10,
  },
  minAgreement: 3,
  safetyGatingEnabled: true,
  timeoutMs: 30000,
};

// ---------------------------------------------------------------------------
// Mock Source Responses
// ---------------------------------------------------------------------------

function mockSourceResponse(
  provider: AIProvider,
  question: string,
  _patientContext: PatientContext,
): AIResponse {
  const providerData: Record<AIProvider, { content: string; grade: EvidenceGrade; citations: Citation[] }> = {
    openevidence: {
      content: `Based on clinical guidelines, the evidence supports targeted supplementation for the queried condition. ${question}`,
      grade: 'A',
      citations: [
        { id: 'oe-1', source: 'openevidence', title: 'Clinical Practice Guideline: Nutrigenomic Interventions 2025', url: 'https://openevidence.com/guidelines/nutrigenomics-2025', year: 2025 },
        { id: 'oe-2', source: 'openevidence', title: 'Evidence Summary: SNP-Directed Supplementation', url: 'https://openevidence.com/summaries/snp-supplementation', year: 2024 },
      ],
    },
    claude: {
      content: `Analysis indicates that the recommended supplementation protocol aligns with current pharmacogenomic evidence. ${question}`,
      grade: 'B',
      citations: [
        { id: 'cl-1', source: 'internal', title: 'GeneX360 Knowledge Base: Pharmacogenomic Protocols', year: 2025 },
      ],
    },
    openai: {
      content: `The recommendation is consistent with known gene-nutrient interactions and clinical data. ${question}`,
      grade: 'B',
      citations: [
        { id: 'oa-1', source: 'pubmed', title: 'Gene-Nutrient Interactions in Clinical Practice', pmid: '38291045', journal: 'Nutrients', year: 2024 },
      ],
    },
    perplexity: {
      content: `Recent research and clinical data support this supplementation approach for the genetic profile indicated. ${question}`,
      grade: 'B',
      citations: [
        { id: 'px-1', source: 'perplexity', title: 'Nutrigenomics and Personalized Supplementation: A Systematic Review', url: 'https://doi.org/10.1016/j.phrs.2024.106512', year: 2024 },
        { id: 'px-2', source: 'perplexity', title: 'MTHFR Polymorphisms and Folate Metabolism', url: 'https://doi.org/10.3390/nu16010089', year: 2024 },
      ],
    },
    pubmed: {
      content: `PubMed literature search yields multiple RCTs supporting the efficacy of the recommended protocol. ${question}`,
      grade: 'A',
      citations: [
        { id: 'pm-1', source: 'pubmed', title: 'Methylfolate Supplementation in MTHFR C677T Carriers: RCT', pmid: '37845123', journal: 'Am J Clin Nutr', year: 2024 },
        { id: 'pm-2', source: 'pubmed', title: 'Pharmacogenomics of Vitamin D Metabolism', pmid: '38012456', journal: 'J Clin Endocrinol Metab', year: 2025 },
        { id: 'pm-3', source: 'pubmed', title: 'CoQ10 Supplementation in Statin Users: Meta-Analysis', pmid: '37654321', journal: 'Cochrane Database Syst Rev', year: 2024 },
      ],
    },
  };

  const data = providerData[provider];
  return {
    provider,
    content: data.content,
    confidence: provider === 'openevidence' ? 92 : provider === 'pubmed' ? 88 : 80 + Math.floor(Math.random() * 10),
    citations: data.citations,
    evidenceGrade: data.grade,
    latencyMs: 200 + Math.floor(Math.random() * 800),
  };
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Query all 5 AI/evidence sources in parallel with the same question/context.
 */
export async function queryAllSources(
  query: ConsensusQuery,
  config?: Partial<ConsensusConfig>,
): Promise<SourceResult[]> {
  const cfg: ConsensusConfig = { ...DEFAULT_CONSENSUS_CONFIG, ...config };
  const providers: AIProvider[] = ['claude', 'openai', 'perplexity', 'openevidence', 'pubmed'];

  const results: SourceResult[] = await Promise.all(
    providers.map(async (provider) => {
      const response = mockSourceResponse(provider, query.question, query.patientContext);
      return {
        provider,
        response,
        weight: cfg.weights[provider],
        agreesWithConsensus: true, // will be updated in calculateAgreementScore
      };
    }),
  );

  return results;
}

/**
 * Calculate agreement score across source results (0-100).
 * Uses weighted voting: each source's weight counts toward agreement
 * when its recommendation direction aligns with the majority.
 */
export function calculateAgreementScore(results: SourceResult[]): number {
  if (results.length === 0) return 0;

  // In a real implementation we would do NLP similarity on content.
  // Mock: use confidence thresholds to derive agreement.
  const highConfidenceResults = results.filter((r) => r.response.confidence >= 70);
  const agreementRatio = highConfidenceResults.length / results.length;

  // Weight the ratio by source weights
  let weightedAgreement = 0;
  let totalWeight = 0;
  for (const r of results) {
    totalWeight += r.weight;
    if (r.response.confidence >= 70) {
      weightedAgreement += r.weight;
      r.agreesWithConsensus = true;
    } else {
      r.agreesWithConsensus = false;
    }
  }

  const weightedScore = totalWeight > 0 ? (weightedAgreement / totalWeight) * 100 : 0;

  // Blend raw ratio and weighted score
  return Math.round(agreementRatio * 40 + weightedScore * 0.6);
}

/**
 * Resolve conflicts among source results.
 * Tier 1 rules engine acts as tiebreaker; OpenEvidence is weighted highest
 * for clinically unresolved disagreements.
 */
export function resolveConflicts(
  results: SourceResult[],
  config: ConsensusConfig,
): { resolved: string; conflicts: string[] } {
  const conflicts: string[] = [];
  const disagreeing = results.filter((r) => !r.agreesWithConsensus);

  if (disagreeing.length === 0) {
    // All agree — use OpenEvidence as canonical response
    const oe = results.find((r) => r.provider === 'openevidence');
    return {
      resolved: oe?.response.content ?? results[0].response.content,
      conflicts: [],
    };
  }

  // Record conflicts
  for (const d of disagreeing) {
    conflicts.push(
      `${d.provider} (weight ${d.weight}) disagrees: confidence ${d.response.confidence}%`,
    );
  }

  // If majority still agrees, use Tier 1 rule reference as tiebreaker
  const agreeing = results.filter((r) => r.agreesWithConsensus);
  if (agreeing.length >= config.minAgreement) {
    const oe = agreeing.find((r) => r.provider === 'openevidence');
    return {
      resolved: oe?.response.content ?? agreeing[0].response.content,
      conflicts,
    };
  }

  // Fallback: weight-sorted, pick highest weighted agreeing source
  const sorted = [...results].sort((a, b) => b.weight - a.weight);
  return {
    resolved: sorted[0].response.content,
    conflicts,
  };
}

/**
 * Aggregate and deduplicate citations from all source results.
 */
export function buildCitationChain(results: SourceResult[]): Citation[] {
  const seen = new Set<string>();
  const chain: Citation[] = [];

  for (const r of results) {
    for (const c of r.response.citations) {
      const key = c.pmid ?? c.id;
      if (!seen.has(key)) {
        seen.add(key);
        chain.push(c);
      }
    }
  }

  return chain;
}

/**
 * Safety gating: checks for drug interactions, allergies, and contraindications.
 */
export function runSafetyGating(
  recommendation: string,
  patientContext: PatientContext,
): { passed: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const recLower = recommendation.toLowerCase();

  // Allergy checks
  if (patientContext.allergies) {
    for (const allergy of patientContext.allergies) {
      if (recLower.includes(allergy.toLowerCase())) {
        warnings.push(`ALLERGY ALERT: Recommendation contains "${allergy}" which is listed as a patient allergy.`);
      }
    }
  }

  // Medication interaction checks (common critical pairs)
  const criticalPairs: Array<{ med: string; supplement: string; reason: string }> = [
    { med: 'warfarin', supplement: 'vitamin k', reason: 'Vitamin K antagonizes warfarin anticoagulation' },
    { med: 'warfarin', supplement: 'ginkgo', reason: 'Ginkgo increases bleeding risk with warfarin' },
    { med: 'warfarin', supplement: 'turmeric', reason: 'Curcumin may potentiate warfarin effects' },
    { med: 'ssri', supplement: "st. john's wort", reason: 'Serotonin syndrome risk' },
    { med: 'sertraline', supplement: "st. john's wort", reason: 'Serotonin syndrome risk' },
    { med: 'fluoxetine', supplement: "st. john's wort", reason: 'Serotonin syndrome risk' },
    { med: 'cyclosporine', supplement: 'echinacea', reason: 'Immune stimulation opposes immunosuppression' },
    { med: 'levothyroxine', supplement: 'calcium', reason: 'Calcium impairs thyroid med absorption — separate by 4h' },
    { med: 'levothyroxine', supplement: 'iron', reason: 'Iron impairs thyroid med absorption — separate by 4h' },
  ];

  if (patientContext.medications) {
    for (const med of patientContext.medications) {
      for (const pair of criticalPairs) {
        if (
          med.toLowerCase().includes(pair.med) &&
          recLower.includes(pair.supplement)
        ) {
          warnings.push(`INTERACTION: ${med} + ${pair.supplement} — ${pair.reason}`);
        }
      }
    }
  }

  return {
    passed: warnings.length === 0,
    warnings,
  };
}

/**
 * Full consensus pipeline: query → agreement → conflicts → citations → safety.
 */
export async function runConsensus(
  query: ConsensusQuery,
  config?: Partial<ConsensusConfig>,
): Promise<ConsensusResult> {
  const startTime = Date.now();
  const cfg: ConsensusConfig = { ...DEFAULT_CONSENSUS_CONFIG, ...config };

  // 1. Query all sources
  const sourceResults = await queryAllSources(query, cfg);

  // 2. Calculate agreement
  const agreementScore = calculateAgreementScore(sourceResults);

  // 3. Resolve conflicts
  const { resolved, conflicts } = resolveConflicts(sourceResults, cfg);

  // 4. Build citation chain
  const citationChain = buildCitationChain(sourceResults);

  // 5. Safety gating
  const safety = cfg.safetyGatingEnabled
    ? runSafetyGating(resolved, query.patientContext)
    : { passed: true, warnings: [] };

  // Determine overall evidence grade (use highest-weighted source grade)
  const oeResult = sourceResults.find((r) => r.provider === 'openevidence');
  const evidenceGrade: EvidenceGrade = oeResult?.response.evidenceGrade ?? 'B';

  const agreementCount = sourceResults.filter((r) => r.agreesWithConsensus).length;

  return {
    recommendation: resolved,
    confidenceScore: agreementScore,
    evidenceGrade,
    agreementCount,
    totalSources: sourceResults.length,
    sourceResults,
    citationChain,
    tier1RuleRef: 'TIER1-CONSENSUS-001',
    safetyCleared: safety.passed,
    conflicts: [...conflicts, ...safety.warnings],
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Convenience: get consensus for a single supplement recommendation.
 */
export async function getConsensusForSupplement(
  supplementName: string,
  patientContext: PatientContext,
  config?: Partial<ConsensusConfig>,
): Promise<ConsensusResult> {
  const variants = patientContext.genomicProfile
    ?.map((v) => `${v.gene} ${v.variant} (${v.genotype})`)
    .join(', ') ?? 'no genomic data';

  const query: ConsensusQuery = {
    question: `Should the patient take ${supplementName}? Patient genetic profile: ${variants}. Current medications: ${patientContext.medications?.join(', ') ?? 'none'}.`,
    patientContext,
  };

  return runConsensus(query, config);
}
