export type HannahTier = 'fast' | 'standard' | 'ultrathink';

export interface TierConfig {
  readonly tier: HannahTier;
  readonly model: string;
  readonly thinkingEnabled: boolean;
  readonly thinkingBudget?: number;
  readonly ragPasses: number;
  readonly selfCritique: boolean;
  readonly evidenceFooter: boolean;
  readonly maxOutputTokens: number;
}

export const TIER_CONFIGS: Record<HannahTier, TierConfig> = {
  fast: {
    tier: 'fast',
    model: 'claude-haiku-4-5-20251001',
    thinkingEnabled: false,
    ragPasses: 0,
    selfCritique: false,
    evidenceFooter: false,
    maxOutputTokens: 1024,
  },
  standard: {
    tier: 'standard',
    model: 'claude-sonnet-4-6',
    thinkingEnabled: false,
    ragPasses: 1,
    selfCritique: false,
    evidenceFooter: false,
    maxOutputTokens: 2048,
  },
  ultrathink: {
    tier: 'ultrathink',
    model: process.env.HANNAH_ULTRATHINK_MODEL ?? 'claude-opus-4-6',
    thinkingEnabled: true,
    thinkingBudget: Number(process.env.HANNAH_ULTRATHINK_BUDGET_TOKENS ?? 12000),
    ragPasses: 2,
    selfCritique: true,
    evidenceFooter: true,
    maxOutputTokens: 4096,
  },
};
