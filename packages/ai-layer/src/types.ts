export type AIProvider = 'claude' | 'openai' | 'perplexity' | 'openevidence' | 'pubmed';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  model?: string;
}

export interface AIResponse {
  provider: AIProvider;
  content: string;
  confidence: number;
  citations: Citation[];
  evidenceGrade?: EvidenceGrade;
  metadata?: Record<string, unknown>;
  latencyMs: number;
}

export interface Citation {
  id: string;
  source: string; // 'pubmed' | 'perplexity' | 'openevidence' | 'internal'
  title: string;
  url?: string;
  pmid?: string;
  year?: number;
  journal?: string;
}

export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'I'; // GRADE system: High/Moderate/Low/Very Low/Insufficient

export interface PatientContext {
  patientId: string;
  caqData?: Record<string, unknown>;
  genomicProfile?: GenomicVariant[];
  currentRegimen?: RegimenItem[];
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
}

export interface GenomicVariant {
  gene: string;
  variant: string;
  genotype: string;
  phenotype: string;
  impact: 'high' | 'moderate' | 'low' | 'normal';
}

export interface RegimenItem {
  supplementId: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface RAGContext {
  chunks: RAGChunk[];
  totalRelevance: number;
}

export interface RAGChunk {
  id: string;
  content: string;
  source: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

export interface SupplementRecommendation {
  productId: string;
  productName: string;
  geneticRationale: string;
  dosage: string;
  frequency: string;
  confidenceScore: number; // 0-100
  evidenceGrade: EvidenceGrade;
  citationChain: Citation[];
  interactionStatus: 'safe' | 'monitor' | 'avoid';
  agreementScore: number; // how many sources agree
  tier1RuleRef?: string;
}
