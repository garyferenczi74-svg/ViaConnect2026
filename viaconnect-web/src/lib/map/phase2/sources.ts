// Prompt #101 Workstream A — per-source parser configs.

export type Phase2Source =
  | 'walmart'
  | 'tiktok_shop'
  | 'instagram_organic'
  | 'facebook_marketplace'
  | 'telegram_discord'
  | 'reddit';

export interface Phase2SourceConfig {
  source: Phase2Source;
  displayName: string;
  defaultObserverConfidence: number;
  scrapeFrequencyCron: string;
  requiresPractitionerDeclaredAccount: boolean;
  supportsFlashSaleDetection: boolean;
  contextWindowKind: 'post_comments' | 'chat_messages' | 'none';
  contextWindowSize: number;
  llmAssistedExtraction: boolean;
}

export const PHASE_2_SOURCES: Record<Phase2Source, Phase2SourceConfig> = {
  walmart: {
    source: 'walmart',
    displayName: 'Walmart Marketplace',
    defaultObserverConfidence: 90,
    scrapeFrequencyCron: '0 6,18 * * *',
    requiresPractitionerDeclaredAccount: false,
    supportsFlashSaleDetection: false,
    contextWindowKind: 'none',
    contextWindowSize: 0,
    llmAssistedExtraction: false,
  },
  tiktok_shop: {
    source: 'tiktok_shop',
    displayName: 'TikTok Shop',
    defaultObserverConfidence: 78,
    scrapeFrequencyCron: '0 6,14,22 * * *',
    requiresPractitionerDeclaredAccount: true,
    supportsFlashSaleDetection: true,
    contextWindowKind: 'post_comments',
    contextWindowSize: 10,
    llmAssistedExtraction: false,
  },
  instagram_organic: {
    source: 'instagram_organic',
    displayName: 'Instagram organic',
    defaultObserverConfidence: 70,
    scrapeFrequencyCron: '0 7,19 * * *',
    requiresPractitionerDeclaredAccount: true,
    supportsFlashSaleDetection: false,
    contextWindowKind: 'post_comments',
    contextWindowSize: 10,
    llmAssistedExtraction: true,
  },
  facebook_marketplace: {
    source: 'facebook_marketplace',
    displayName: 'Facebook Marketplace',
    defaultObserverConfidence: 65,
    scrapeFrequencyCron: '0 3 * * *',
    requiresPractitionerDeclaredAccount: true,
    supportsFlashSaleDetection: false,
    contextWindowKind: 'none',
    contextWindowSize: 0,
    llmAssistedExtraction: false,
  },
  telegram_discord: {
    source: 'telegram_discord',
    displayName: 'Telegram / Discord',
    defaultObserverConfidence: 77,
    scrapeFrequencyCron: '0 * * * *',
    requiresPractitionerDeclaredAccount: true,
    supportsFlashSaleDetection: false,
    contextWindowKind: 'chat_messages',
    contextWindowSize: 5,
    llmAssistedExtraction: true,
  },
  reddit: {
    source: 'reddit',
    displayName: 'Reddit',
    defaultObserverConfidence: 65,
    scrapeFrequencyCron: '0 2,6,10,14,18,22 * * *',
    requiresPractitionerDeclaredAccount: true,
    supportsFlashSaleDetection: false,
    contextWindowKind: 'post_comments',
    contextWindowSize: 10,
    llmAssistedExtraction: true,
  },
};

export const PHASE_2_SOURCE_LIST: readonly Phase2Source[] = Object.keys(PHASE_2_SOURCES) as readonly Phase2Source[];
