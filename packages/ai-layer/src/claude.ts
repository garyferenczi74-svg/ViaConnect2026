import {
  AIMessage,
  AIResponse,
  PatientContext,
  RAGContext,
  Citation,
} from './types';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
}

export const DEFAULT_CLAUDE_CONFIG: ClaudeConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-sonnet-4-6',
  baseUrl: 'https://api.anthropic.com/v1',
  maxTokens: 4096,
};

/**
 * Builds a rich system prompt incorporating patient data and RAG context chunks.
 */
export function buildSystemPrompt(
  patientContext: PatientContext,
  ragContext: RAGContext
): string {
  const genomicSection = patientContext.genomicProfile?.length
    ? `\n\nGenomic Profile:\n${patientContext.genomicProfile
        .map(
          (v) =>
            `- ${v.gene} ${v.variant} (${v.genotype}): ${v.phenotype} [impact: ${v.impact}]`
        )
        .join('\n')}`
    : '';

  const regimenSection = patientContext.currentRegimen?.length
    ? `\n\nCurrent Regimen:\n${patientContext.currentRegimen
        .map((r) => `- ${r.name} ${r.dosage} ${r.frequency}`)
        .join('\n')}`
    : '';

  const allergiesSection = patientContext.allergies?.length
    ? `\n\nAllergies: ${patientContext.allergies.join(', ')}`
    : '';

  const conditionsSection = patientContext.conditions?.length
    ? `\n\nConditions: ${patientContext.conditions.join(', ')}`
    : '';

  const ragSection = ragContext.chunks.length
    ? `\n\nRelevant Evidence (relevance: ${ragContext.totalRelevance.toFixed(2)}):\n${ragContext.chunks
        .map(
          (c) =>
            `[${c.source}] (score: ${c.relevanceScore.toFixed(2)}): ${c.content}`
        )
        .join('\n\n')}`
    : '';

  return `You are a clinical genomics AI assistant for ViaConnect GeneX360. You provide evidence-based supplement and protocol recommendations grounded in pharmacogenomics.

Patient ID: ${patientContext.patientId}${genomicSection}${regimenSection}${allergiesSection}${conditionsSection}${ragSection}

Always cite your sources. Use GRADE evidence levels where applicable. Flag any potential drug-gene or supplement-gene interactions.`;
}

/**
 * Formats messages for the Claude Messages API format.
 */
export function formatClaudeMessages(
  messages: AIMessage[]
): { role: string; content: string }[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

/**
 * Executes a full RAG-augmented query against Claude (mock implementation).
 */
export async function queryClaudeRAG(
  messages: AIMessage[],
  patientContext: PatientContext,
  ragContext: RAGContext,
  config?: Partial<ClaudeConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config };
  const _systemPrompt = buildSystemPrompt(patientContext, ragContext);
  const _formattedMessages = formatClaudeMessages(messages);

  const mockCitations: Citation[] = [
    {
      id: 'cite-claude-1',
      source: 'internal',
      title: 'GeneX360 Pharmacogenomics Knowledge Base - MTHFR Variants',
      url: 'https://genex360.internal/kb/mthfr',
      year: 2025,
    },
    {
      id: 'cite-claude-2',
      source: 'pubmed',
      title: 'Methylfolate supplementation in MTHFR C677T carriers: a systematic review',
      pmid: '38921045',
      year: 2024,
      journal: 'Nutrients',
    },
  ];

  return {
    provider: 'claude',
    content:
      'Based on the patient\'s MTHFR C677T heterozygous variant and current genomic profile, ' +
      'methylfolate (L-5-MTHF) at 1000mcg daily is recommended as a first-line intervention. ' +
      'This bypasses the impaired folate metabolism pathway. Evidence grade: A (high confidence). ' +
      'No interactions detected with the current regimen.',
    confidence: 0.92,
    citations: mockCitations,
    evidenceGrade: 'A',
    metadata: {
      model: _mergedConfig.model,
      ragChunksUsed: ragContext.chunks.length,
      systemPromptTokens: _systemPrompt.length,
    },
    latencyMs: 1847,
  };
}

/**
 * Returns a mock ReadableStream for streaming Claude responses.
 */
export function streamClaudeResponse(
  messages: AIMessage[],
  patientContext: PatientContext,
  ragContext: RAGContext,
  config?: Partial<ClaudeConfig>
): ReadableStream<Uint8Array> {
  const _mergedConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config };
  const _systemPrompt = buildSystemPrompt(patientContext, ragContext);
  void formatClaudeMessages(messages);

  const chunks = [
    'Based on the patient\'s genomic profile, ',
    'the MTHFR C677T variant indicates reduced methylation capacity. ',
    'Recommended intervention: L-5-MTHF (methylfolate) 1000mcg daily. ',
    'Evidence grade: A. ',
    'No contraindications with current medications detected.',
  ];

  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

/**
 * Generates a clinical summary for a patient (mock implementation).
 */
export async function generateClinicalSummary(
  patientContext: PatientContext,
  config?: Partial<ClaudeConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config };

  const variantCount = patientContext.genomicProfile?.length ?? 0;
  const highImpactCount =
    patientContext.genomicProfile?.filter((v) => v.impact === 'high').length ?? 0;

  return {
    provider: 'claude',
    content:
      `Clinical Summary for Patient ${patientContext.patientId}:\n\n` +
      `Genomic Profile: ${variantCount} variants analyzed, ${highImpactCount} high-impact findings.\n` +
      `Key Findings:\n` +
      `- MTHFR C677T heterozygous: Reduced methylation capacity requiring methylfolate supplementation\n` +
      `- COMT Val158Met: Moderate catechol-O-methyltransferase activity; magnesium glycinate may support catecholamine metabolism\n` +
      `- VDR Taq1: Altered vitamin D receptor expression; higher-dose vitamin D3 recommended\n\n` +
      `Current regimen of ${patientContext.currentRegimen?.length ?? 0} supplements reviewed. No critical interactions detected.`,
    confidence: 0.88,
    citations: [
      {
        id: 'cite-summary-1',
        source: 'internal',
        title: 'GeneX360 Clinical Summary Engine v2.1',
      },
    ],
    evidenceGrade: 'B',
    metadata: {
      model: _mergedConfig.model,
      variantsAnalyzed: variantCount,
      highImpactVariants: highImpactCount,
    },
    latencyMs: 2340,
  };
}

/**
 * Explains a named protocol in the context of a patient's genomics (mock implementation).
 */
export async function explainProtocol(
  protocolName: string,
  patientContext: PatientContext,
  config?: Partial<ClaudeConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_CLAUDE_CONFIG, ...config };

  return {
    provider: 'claude',
    content:
      `Protocol: ${protocolName}\n\n` +
      `Overview: This protocol targets methylation pathway optimization based on pharmacogenomic variants.\n\n` +
      `For Patient ${patientContext.patientId}:\n` +
      `Phase 1 (Weeks 1-4): Initiate L-5-MTHF 400mcg daily, titrate to 1000mcg by week 2.\n` +
      `Phase 2 (Weeks 5-8): Add methylcobalamin (B12) 1000mcg sublingual daily.\n` +
      `Phase 3 (Weeks 9-12): Introduce trimethylglycine (TMG) 500mg if homocysteine remains elevated.\n\n` +
      `Monitoring: Serum homocysteine and methylmalonic acid at baseline, week 4, and week 12.\n` +
      `Genomic Rationale: Patient's MTHFR C677T status reduces enzyme activity by ~35%, necessitating bypass with active folate forms.`,
    confidence: 0.91,
    citations: [
      {
        id: 'cite-protocol-1',
        source: 'internal',
        title: `${protocolName} - ViaConnect Protocol Library v3.0`,
      },
      {
        id: 'cite-protocol-2',
        source: 'pubmed',
        title: 'Clinical protocols for MTHFR-guided supplementation',
        pmid: '39102847',
        year: 2025,
        journal: 'Journal of Personalized Medicine',
      },
    ],
    evidenceGrade: 'B',
    metadata: {
      model: _mergedConfig.model,
      protocolName,
      patientId: patientContext.patientId,
    },
    latencyMs: 1620,
  };
}
