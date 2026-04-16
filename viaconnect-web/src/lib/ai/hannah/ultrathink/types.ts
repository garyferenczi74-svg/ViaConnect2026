import type { HannahTier } from './tiers';
import type { Citation } from './evidence';

export interface UltrathinkRequest {
  userId: string;
  query: string;
  tier: HannahTier;
  modality: 'text' | 'avatar';
  phiAllowed: boolean;
  jefferyTraceId?: string;
}

export interface UltrathinkResponse {
  answer: string;
  tier: HannahTier;
  thinkingSummary?: string;
  citations: Citation[];
  confidence: number;
  critiquePassed: boolean;
  critiqueNotes: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
}
