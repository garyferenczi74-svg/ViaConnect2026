// Prompt #101 Workstream A — Phase 2 confidence gate + third-party attribution tests.

import { describe, it, expect } from 'vitest';
import {
  classifyPhase2Observation,
  isStaleMarketplaceListing,
  isThirdPartyAuthored,
  PHASE_2_OBSERVER_CONFIDENCE_MIN,
  PHASE_2_PRACTITIONER_CONFIDENCE_MIN,
} from '@/lib/map/phase2/confidenceScoring';
import { PHASE_2_SOURCE_LIST, PHASE_2_SOURCES } from '@/lib/map/phase2/sources';
import {
  contextAttributableToPractitioner,
  deserializePostContext,
  serializePostContext,
  type PostContext,
} from '@/lib/map/phase2/contextCapture';

describe('classifyPhase2Observation', () => {
  it('returns skip when severity is null', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 99,
        practitionerConfidence: 99,
        severity: null,
      }),
    ).toBe('skip');
  });

  it('low observer confidence → investigation queue', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 80,
        practitionerConfidence: 99,
        severity: 'red',
      }),
    ).toBe('investigation_queue');
  });

  it('low practitioner confidence → investigation queue', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: 85,
        severity: 'red',
      }),
    ).toBe('investigation_queue');
  });

  it('null practitioner confidence → investigation queue', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: null,
        severity: 'orange',
      }),
    ).toBe('investigation_queue');
  });

  it('high confidence + red severity → human review required', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: 95,
        severity: 'red',
      }),
    ).toBe('human_review_required');
  });

  it('high confidence + black severity → human review required', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: 95,
        severity: 'black',
      }),
    ).toBe('human_review_required');
  });

  it('high confidence + yellow severity → auto escalate', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: 95,
        severity: 'yellow',
      }),
    ).toBe('auto_escalate');
  });

  it('high confidence + orange severity → auto escalate', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: 95,
        practitionerConfidence: 95,
        severity: 'orange',
      }),
    ).toBe('auto_escalate');
  });

  it('exactly at the 85 observer threshold passes', () => {
    expect(
      classifyPhase2Observation({
        observerConfidence: PHASE_2_OBSERVER_CONFIDENCE_MIN,
        practitionerConfidence: PHASE_2_PRACTITIONER_CONFIDENCE_MIN,
        severity: 'yellow',
      }),
    ).toBe('auto_escalate');
  });
});

describe('isThirdPartyAuthored', () => {
  it('null author is third party', () => {
    expect(isThirdPartyAuthored(null, ['verified-1'])).toBe(true);
  });
  it('non-matching author is third party', () => {
    expect(isThirdPartyAuthored('other', ['verified-1', 'verified-2'])).toBe(true);
  });
  it('matching verified author is NOT third party', () => {
    expect(isThirdPartyAuthored('verified-1', ['verified-1', 'verified-2'])).toBe(false);
  });
});

describe('isStaleMarketplaceListing', () => {
  it('fresh listing', () => {
    expect(isStaleMarketplaceListing(15)).toBe(false);
  });
  it('30 days is not stale (boundary)', () => {
    expect(isStaleMarketplaceListing(30)).toBe(false);
  });
  it('31 days is stale', () => {
    expect(isStaleMarketplaceListing(31)).toBe(true);
  });
});

describe('PHASE_2_SOURCES', () => {
  it('has all 6 sources', () => {
    expect(PHASE_2_SOURCE_LIST).toHaveLength(6);
  });
  it.each([...PHASE_2_SOURCE_LIST])('%s has a valid config', (src) => {
    const cfg = PHASE_2_SOURCES[src];
    expect(cfg.displayName.length).toBeGreaterThan(3);
    expect(cfg.defaultObserverConfidence).toBeGreaterThanOrEqual(50);
    expect(cfg.defaultObserverConfidence).toBeLessThanOrEqual(100);
  });
  it('tiktok_shop is the only flash-sale-aware source', () => {
    const flashSources = PHASE_2_SOURCE_LIST.filter(
      (s) => PHASE_2_SOURCES[s].supportsFlashSaleDetection,
    );
    expect(flashSources).toEqual(['tiktok_shop']);
  });
  it('three sources use LLM-assisted extraction', () => {
    const llm = PHASE_2_SOURCE_LIST.filter((s) => PHASE_2_SOURCES[s].llmAssistedExtraction);
    expect(llm.sort()).toEqual(['instagram_organic', 'reddit', 'telegram_discord']);
  });
});

describe('contextCapture', () => {
  const ctx: PostContext = {
    kind: 'chat_messages',
    capturedAt: '2026-05-15T12:00:00Z',
    topLevelText: 'The clinic just posted pricing',
    surrounding: [
      { authorId: 'prac-1', authorDisplayName: 'Practitioner', text: '$45 for 60 caps', timestamp: '2026-05-15T11:59:00Z' },
    ],
  };

  it('round-trips through JSON', () => {
    const serialized = serializePostContext(ctx);
    const parsed = deserializePostContext(serialized);
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe('chat_messages');
  });

  it('rejects malformed payload', () => {
    expect(deserializePostContext('{"kind":"chat_messages"}')).toBeNull();
    expect(deserializePostContext('not json')).toBeNull();
  });

  it('contextAttributableToPractitioner: true when verified author is in surrounding', () => {
    expect(contextAttributableToPractitioner(ctx, ['prac-1'])).toBe(true);
  });
  it('contextAttributableToPractitioner: false when author set empty', () => {
    expect(contextAttributableToPractitioner(ctx, ['someone-else'])).toBe(false);
  });
});
