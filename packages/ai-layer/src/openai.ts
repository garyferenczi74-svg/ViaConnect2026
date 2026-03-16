import {
  AIMessage,
  AIResponse,
  PatientContext,
  Citation,
} from './types';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  maxTokens: number;
}

export const DEFAULT_OPENAI_CONFIG: OpenAIConfig = {
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o',
  baseUrl: 'https://api.openai.com/v1',
  maxTokens: 4096,
};

/**
 * Extracts structured data from unstructured text using GPT-4o (mock implementation).
 * Useful for parsing lab reports, supplement labels, and clinical notes.
 */
export async function extractStructuredData(
  input: string,
  schema: Record<string, unknown>,
  config?: Partial<OpenAIConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_OPENAI_CONFIG, ...config };
  const schemaKeys = Object.keys(schema);

  const mockExtracted: Record<string, unknown> = {};
  for (const key of schemaKeys) {
    mockExtracted[key] = `extracted_${key}_value`;
  }

  return {
    provider: 'openai',
    content: JSON.stringify(mockExtracted, null, 2),
    confidence: 0.94,
    citations: [],
    metadata: {
      model: _mergedConfig.model,
      inputLength: input.length,
      schemaFields: schemaKeys,
      extractionType: 'structured',
    },
    latencyMs: 1230,
  };
}

/**
 * Optimizes supplement dosage based on patient genomics and body metrics (mock implementation).
 */
export async function optimizeDosage(
  supplement: string,
  patientContext: PatientContext,
  config?: Partial<OpenAIConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_OPENAI_CONFIG, ...config };

  const dosageMap: Record<string, { dosage: string; rationale: string }> = {
    'methylfolate': {
      dosage: '1000mcg daily',
      rationale: 'MTHFR C677T heterozygous status requires active folate bypass',
    },
    'vitamin-d3': {
      dosage: '5000 IU daily',
      rationale: 'VDR polymorphism reduces receptor sensitivity; higher dose compensates',
    },
    'magnesium-glycinate': {
      dosage: '400mg daily (split AM/PM)',
      rationale: 'COMT variant benefits from magnesium-dependent methylation support',
    },
  };

  const match = dosageMap[supplement.toLowerCase()] ?? {
    dosage: '500mg daily',
    rationale: `Standard dosage for ${supplement} based on general population guidelines`,
  };

  const citations: Citation[] = [
    {
      id: `cite-dosage-${supplement}`,
      source: 'pubmed',
      title: `Pharmacogenomic dosing guidelines for ${supplement}`,
      pmid: '39284710',
      year: 2025,
      journal: 'Clinical Pharmacogenomics',
    },
  ];

  return {
    provider: 'openai',
    content:
      `Optimized Dosage for ${supplement}:\n` +
      `Recommended: ${match.dosage}\n` +
      `Rationale: ${match.rationale}\n` +
      `Patient ID: ${patientContext.patientId}\n` +
      `Genomic variants considered: ${patientContext.genomicProfile?.length ?? 0}\n` +
      `Interaction check: No conflicts with current regimen.`,
    confidence: 0.89,
    citations,
    evidenceGrade: 'B',
    metadata: {
      model: _mergedConfig.model,
      supplement,
      optimizedDosage: match.dosage,
    },
    latencyMs: 1580,
  };
}

/**
 * General-purpose OpenAI query (mock implementation).
 */
export async function queryOpenAI(
  messages: AIMessage[],
  config?: Partial<OpenAIConfig>
): Promise<AIResponse> {
  const _mergedConfig = { ...DEFAULT_OPENAI_CONFIG, ...config };
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  return {
    provider: 'openai',
    content:
      `Response to query: "${lastUserMessage?.content.slice(0, 80) ?? '(no user message)'}..."\n\n` +
      'Based on current evidence, the pharmacogenomic considerations for this query suggest ' +
      'a personalized approach incorporating the patient\'s genetic variants. ' +
      'Key factors include metabolizer status, receptor polymorphisms, and enzyme activity levels.',
    confidence: 0.85,
    citations: [],
    metadata: {
      model: _mergedConfig.model,
      messageCount: messages.length,
    },
    latencyMs: 1120,
  };
}
